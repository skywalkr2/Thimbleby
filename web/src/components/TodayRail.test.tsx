import { day } from "../lib/dates";
import { settingsView } from "../lib/views";
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { S } from "../lib/api";
import { Refuse, fakeApi, renderApp, type Routes } from "../test-utils";
import { TodayRail } from "./TodayRail";
import { ThisWeekInspector } from "./ThisWeek";

/** Made-up addresses are built from this, so no address is written out whole. */
const WEB = "https" + "://";

// Midday on a made-up Sunday, on this computer's clock; only the date is faked so waiting still works.
const NOW = new Date(2026, 9, 11, 12, 0);
const TODAY = "2026-10-11";
const TOMORROW = "2026-10-12";
const LATER = "2026-10-14";

/** An ISO time with this computer's offset, so the clock the page shows is the clock written here. */
function at(date: string, hour: number, minute = 0): string {
  const [y, m, d] = date.split("-").map(Number);
  const offset = -new Date(y, m - 1, d, hour, minute).getTimezoneOffset();
  const sign = offset < 0 ? "-" : "+";
  const pad = (n: number) => String(Math.abs(n)).padStart(2, "0");
  return `${date}T${pad(hour)}:${pad(minute)}:00${sign}${pad(Math.trunc(Math.abs(offset) / 60))}:${pad(Math.abs(offset) % 60)}`;
}

function event(extra: Partial<S["AgendaItemView"]> & Pick<S["AgendaItemView"], "title">): S["AgendaItemView"] {
  return { snapshot: `snap-${extra.title}`, source: "cal-1", start: at(TODAY, 15), all_day: false, cancelled: false, own: false, open_items: 0, days: [TODAY], ...extra };
}

function message(extra: Partial<S["ArrivedView"]> & Pick<S["ArrivedView"], "title">): S["ArrivedView"] {
  return { snapshot: `snap-${extra.title}`, source: "mail-1", received: at(TODAY, 9, 14), ...extra };
}

const agenda: S["AgendaItemView"][] = [
  event({ title: "Quarterly planning", all_day: true, start: TODAY, days: [TODAY, TOMORROW] }),
  event({ title: "Standup", start: at(TODAY, 9), end: at(TODAY, 9, 30), where: "Room A" }),
  event({
    title: "Design review",
    start: at(TODAY, 15),
    end: at(TODAY, 16),
    link: `${WEB}meet.example.com/room/42`,
  }),
  event({ title: "Budget call", start: at(TOMORROW, 10), end: at(TOMORROW, 11), days: [TOMORROW], cancelled: true }),
  event({ title: "Workshop", start: at(LATER, 13), days: [LATER] }),
];

const inbox: S["InboxView"] = {
  items: [
    message({ title: "Proof is ready", sender: "Robin Sample", unread: true, link: `${WEB}mail.example.com/m/1` }),
    message({ title: "Invoice attached", sender: "Pat Example", unread: false, received: at("2026-10-09", 16, 40) }),
  ],
  left_out: 3,
  set_aside: 2,
};

function routes(extra: Routes = {}): Routes {
  return {
    "GET today/week": () => ({ first: "2026-10-05", last: "2026-10-09", due: [], waiting: [], meetings: [] }),
    "GET today/agenda": () => agenda,
    "GET today/agenda-span": () => ({ first: "2026-10-09", last: "2026-10-15" }),
    "GET today/arrived": () => inbox,
    "GET watch": () => [],
    "GET setup": () => ({ finished: true, steps: [], settled: 0, total: 0 }),
    ...extra,
  };
}

function open(extra: Routes = {}, onView = vi.fn(), onAddSource?: () => void, queueEmpty = false) {
  const calls = fakeApi(routes(extra));
  renderApp(<TodayRail onView={onView} onAddSource={onAddSource} queueEmpty={queueEmpty} />);
  return { calls, onView };
}

const column = (name: string) => screen.findByRole("region", { name });

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
});
afterEach(() => {
  vi.useRealTimers();
  document.documentElement.removeAttribute("data-today");
  document.documentElement.removeAttribute("data-narrow");
});

test("the rail has at most three cards: Schedule and Came in here, and no Top priorities, Your to-dos, This week or Agenda", async () => {
  open();
  const schedule = await column("Schedule");
  expect(await within(schedule).findByText("3 events today")).toBeInTheDocument();
  await within(await column("Came in")).findByText("2 messages");
  const names = screen
    .getAllByRole("region")
    .map((r) => r.parentElement?.getAttribute("data-col"))
    .filter(Boolean);
  expect(names).toEqual(["schedule", "arrived"]);
  for (const gone of ["Top priorities", "Your to-dos", "This week", "Agenda"]) {
    expect(screen.queryByRole("heading", { name: gone })).toBeNull();
  }
  // What needs the person is the queue, which has its own tests; the rail never draws it.
  expect(screen.queryByRole("heading", { name: "Needs you" })).toBeNull();
  expect(screen.queryByRole("heading", { name: "What changed" })).toBeNull();
});

test("the Schedule card is today's view: the agenda's days only, and none of the week's list", async () => {
  const person = "Dev Sample";
  open({
    "GET today/week": () => ({
      first: "2026-10-05",
      last: "2026-10-16",
      due: [{ action: "ACT-5", text: "Send the estimate", due: TOMORROW, project: null, owners: [], mine: true, kind: "due" }],
      waiting: [{ person: "PER-2", person_name: person, count: 2, due: null }],
      meetings: [event({ title: "Standup", start: at(TODAY, 9), end: at(TODAY, 9, 30) }), event({ title: "Offsite", start: at(LATER, 9), days: [LATER] })],
    }),
  });
  const col = await column("Schedule");
  expect(await within(col).findByText("Standup")).toBeInTheDocument();
  expect(within(col).getByRole("heading", { name: "Today" })).toBeInTheDocument();
  // What is due, who waits and the meetings beyond the agenda's days are the week's, which the inspector shows.
  expect(within(col).queryByText("Send the estimate")).toBeNull();
  expect(within(col).queryByText(new RegExp(person))).toBeNull();
  expect(within(col).queryByText("Offsite")).toBeNull();
  expect(within(col).queryByText(/^Through /)).toBeNull();
  expect(within(col).getAllByText("Standup")).toHaveLength(1);
  expect(screen.getAllByRole("region", { name: "Schedule" })).toHaveLength(1);
});

test("the agenda card leads to the full schedule, a real link that works in a new tab", async () => {
  open();
  const col = await column("Schedule");
  const link = await within(col).findByRole("link", { name: "Open the schedule" });
  expect(link).toHaveAttribute("href", expect.stringMatching(/#schedule$/));
});

test("the agenda groups by day, all-day first, with times, places, called-off labels and link domains", async () => {
  open();
  const col = await column("Schedule");
  const days = await within(col).findAllByRole("heading", { level: 3 });
  expect(days.map((h) => h.textContent)).toEqual(["Today", "Tomorrow", expect.stringMatching(/14/)]);
  const today = within(within(col).getByRole("list", { name: "Today" })).getAllByRole("listitem");
  // All-day first, then by time, with the "now" line between what has ended and what is to come.
  expect(today[0]).toHaveTextContent("All day");
  expect(today[0]).toHaveTextContent("Quarterly planning");
  expect(today[1]).toHaveTextContent("Standup");
  expect(today[1]).toHaveTextContent("Room A");
  expect(today[2]).toHaveTextContent(/^Now · /);
  expect(today[3]).toHaveTextContent("Design review");
  const link = within(today[3]).getByRole("link", { name: "Design review" });
  expect(link).toHaveAttribute("target", "_blank");
  expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
  expect(today[3]).toHaveTextContent("(meet.example.com)");
  const tomorrow = within(within(col).getByRole("list", { name: "Tomorrow" })).getAllByRole("listitem");
  // The all-day event runs on into tomorrow.
  expect(tomorrow[0]).toHaveTextContent("All day");
  expect(tomorrow[1]).toHaveTextContent("Called off");
  expect(tomorrow[1]).toHaveTextContent("Budget call");
});

test("the app's own entries follow the calendar events on each day they cover, marked in words, all-day ones with no time", async () => {
  const own = (extra: Partial<S["AgendaItemView"]>) =>
    event({ title: "Delivery window", snapshot: "EVT-1", source: "", own: true, all_day: true, start: TODAY, end: TOMORROW, days: [TODAY, TOMORROW], ...extra });
  open({
    "GET today/agenda": () => [
      event({ title: "Standup", start: at(TODAY, 9), end: at(TODAY, 9, 30) }),
      event({ title: "Planning", all_day: true, start: TODAY, days: [TODAY] }),
      own({}),
    ],
  });
  const col = await column("Schedule");
  const today = within(await within(col).findByRole("list", { name: "Today" })).getAllByRole("listitem");
  const rowOf = (text: string) => today.findIndex((row) => row.textContent?.includes(text));
  expect(rowOf("Planning")).toBeLessThan(rowOf("Standup"));
  expect(rowOf("Standup")).toBeLessThan(rowOf("Delivery window"));
  expect(today[rowOf("Delivery window")]).toHaveTextContent("All day");
  expect(today.filter((row) => row.textContent?.includes("From your notes"))).toHaveLength(1);
  expect(today[rowOf("Delivery window")]).toHaveTextContent("From your notes");
  const tomorrow = within(within(col).getByRole("list", { name: "Tomorrow" })).getAllByRole("listitem");
  expect(tomorrow[0]).toHaveTextContent("Delivery window");
  expect(tomorrow[0]).toHaveTextContent("From your notes");
});

test("a meeting of a series says how many open items wait for it, linking to the series' page; with none it says nothing", async () => {
  const own = (extra: Partial<S["AgendaItemView"]>) =>
    event({ title: "Print sync", snapshot: "EVT-1", source: "", own: true, all_day: true, start: TODAY, days: [TODAY], series: "SER-1", ...extra });
  open({ "GET today/agenda": () => [own({ open_items: 3 }), own({ title: "Quiet sync", snapshot: "EVT-2", open_items: 0 }), event({ title: "Standup", start: at(TODAY, 9) })] });
  const col = await column("Schedule");
  const rows = within(await within(col).findByRole("list", { name: "Today" })).getAllByRole("listitem");
  const sync = rows.find((row) => row.textContent?.includes("Print sync"))!;
  expect(sync).toHaveTextContent("Print sync · 3 open");
  expect(within(sync).getByRole("link", { name: "3 open" }).getAttribute("href")).toMatch(/#records\/series\/SER-1$/);
  const quiet = rows.find((row) => row.textContent?.includes("Quiet sync"))!;
  expect(quiet).not.toHaveTextContent(/open/);
  expect(quiet).not.toHaveTextContent("0");
});

test("a plain entry that reads as a task is offered as a to-do in its menu, one click, with Undo; others have no menu", async () => {
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  const { calls } = open(
    {
      "GET today/agenda": () => [event({ title: "Pay the deposit", entry: "EVT-9", todo_offer: "Pay the deposit" }), event({ title: "Standup", entry: "EVT-8", start: at(TODAY, 9) })],
      "POST events/EVT-9/todo": () => ({ action: "ACT-9", changeset: "CS-9" }),
      "POST changesets/CS-9/undo": () => ({ restored: [0] }),
    },
  );
  const col = await column("Schedule");
  const rows = within(await within(col).findByRole("list", { name: "Today" })).getAllByRole("listitem");
  const pay = rows.find((row) => row.textContent?.includes("Pay the deposit"))!;
  const standup = rows.find((row) => row.textContent?.includes("Standup"))!;
  expect(within(standup).queryByRole("button", { name: /More actions/ })).toBeNull();
  await user.click(within(pay).getByRole("button", { name: "More actions for Pay the deposit" }));
  await user.click(await screen.findByRole("menuitem", { name: "Add as a to-do" }));
  expect(await screen.findByText("Added a to-do: Pay the deposit")).toBeInTheDocument();
  expect(calls.some((c) => c.route === "POST events/EVT-9/todo")).toBe(true);
  await user.click(screen.getByRole("button", { name: "Undo" }));
  await waitFor(() => expect(calls.some((c) => c.route.startsWith("POST changesets/CS-9/undo"))).toBe(true));
});

test("a date of an event read from a calendar links to its entry's page, where the people asked are listed", async () => {
  open({
    "GET today/agenda": () => [
      event({ title: "Harbor stand-up", start: at(TODAY, 9), entry: "EVT-7", series: "SER-2", open_items: 2 }),
      event({ title: "Standup", start: at(TODAY, 10) }),
    ],
  });
  const col = await column("Schedule");
  const rows = within(await within(col).findByRole("list", { name: "Today" })).getAllByRole("listitem");
  const linked = rows.find((row) => row.textContent?.includes("Harbor stand-up"))!;
  expect(within(linked).getByRole("link", { name: "Harbor stand-up" }).getAttribute("href")).toMatch(/#records\/event\/EVT-7$/);
  expect(within(linked).getByRole("link", { name: "2 open" }).getAttribute("href")).toMatch(/#records\/series\/SER-2$/);
  const plain = rows.find((row) => row.textContent?.includes("Standup") && !row.textContent?.includes("Harbor"))!;
  expect(within(plain).queryByRole("link")).toBeNull();
});

test("the now line goes at the end of today's list when everything has ended, and is absent with no timed events", async () => {
  open({ "GET today/agenda": () => [event({ title: "Early", start: at(TODAY, 8), end: at(TODAY, 9) })] });
  const col = await column("Schedule");
  const rows = within(await within(col).findByRole("list", { name: "Today" })).getAllByRole("listitem");
  expect(rows[0]).toHaveTextContent("Early");
  expect(rows[1]).toHaveTextContent(/^Now · /);
});

test("came in: unread shows a New label, today's mail its time and older mail its weekday, and nothing about what was handled", async () => {
  open();
  const col = await column("Came in");
  const rows = await within(col).findAllByRole("listitem");
  expect(rows[0]).toHaveTextContent("New");
  expect(rows[0]).toHaveTextContent("Proof is ready");
  expect(rows[0]).toHaveTextContent("Robin Sample");
  expect(rows[0]).toHaveTextContent("(mail.example.com)");
  expect(within(rows[0]).getByRole("link", { name: "Proof is ready" })).toHaveAttribute("target", "_blank");
  expect(rows[0].querySelector("time")!.textContent).toMatch(/9:14|09:14/);
  expect(rows[1]).not.toHaveTextContent("New");
  expect(rows[1].querySelector("time")!.textContent).toBe("Fri");
  // Today lists what the person does: what was set aside or closed is counted on What changed, never here.
  expect(inbox.set_aside).toBeGreaterThan(0);
  expect(inbox.left_out).toBeGreaterThan(0);
  expect(within(col).queryByRole("button", { name: /set aside|closed by your rules/ })).toBeNull();
  expect(within(col).queryByText(/set aside|closed by your rules/)).toBeNull();
});

test("with a second source the rows say which one they came from", async () => {
  open({
    "GET watch": () => [
      { id: "cal-1", label: "Work calendar" },
      { id: "cal-2", label: "Home calendar" },
    ],
    "GET today/agenda": () => [
      event({ title: "Standup", source: "cal-1" }),
      event({ title: "Piano", source: "cal-2", start: at(TODAY, 17) }),
    ],
  });
  const col = await column("Schedule");
  expect(await within(col).findByText("Home calendar")).toBeInTheDocument();
  expect(within(col).getByText("Work calendar")).toBeInTheDocument();
});

test("with nothing connected and setup finished, Schedule and Came in each offer to connect, and open Connections", async () => {
  const user = userEvent.setup({ advanceTimers: () => {} });
  const { onView } = open({
    "GET today/agenda": () => [],
    "GET today/arrived": () => ({ items: [], left_out: 0 }),
  });
  expect(await screen.findByText(/^Nothing on your calendar from .+ to .+\.$/)).toBeInTheDocument();
  expect(await screen.findByText("No mail has come in lately.")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Connect a calendar" }));
  expect(onView).toHaveBeenLastCalledWith(settingsView("connections"));
  await user.click(screen.getByRole("button", { name: "Connect a mailbox" }));
  expect(onView).toHaveBeenCalledTimes(2);
  expect(onView).toHaveBeenLastCalledWith(settingsView("connections"));
});

test("while setup is open the cards leave the connect lines out, and an empty rail with an empty queue says so once", async () => {
  open(
    { "GET today/agenda": () => [], "GET today/arrived": () => ({ items: [], left_out: 0 }), "GET setup": () => ({ finished: false, steps: [], settled: 0, total: 3 }) },
    vi.fn(),
    vi.fn(),
    true,
  );
  expect(await screen.findByText("Nothing else needs you today")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Connect a mailbox" })).toBeNull();
  expect(screen.queryByRole("region", { name: "Came in" })).toBeNull();
  // The Schedule card is always drawn: it says nothing is on today, and with no calendar connected it links to Connections
  // (the setup line offers the add form while setup is open).
  const schedule = await column("Schedule");
  expect(within(schedule).getByText(/^Nothing on your calendar/)).toBeInTheDocument();
  expect(within(schedule).getByRole("link", { name: "Connect a calendar" }).getAttribute("href")).toMatch(/#settings\/connections$/);
  expect(within(schedule).getByRole("link", { name: "Open the schedule" })).toBeInTheDocument();
});

test("the connect lines come back once setup is finished", async () => {
  open({ "GET today/agenda": () => [], "GET today/arrived": () => ({ items: [], left_out: 0 }) });
  expect(await screen.findByRole("button", { name: "Connect a calendar" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Connect a mailbox" })).toBeInTheDocument();
});

test("the empty line is said only when the queue is empty too", async () => {
  // A calendar source is on and nothing is in it: only Schedule is drawn, and the line waits for the queue to be empty as well.
  const { calls } = open({ "GET today/agenda": () => [], "GET today/arrived": () => ({ items: [], left_out: 0 }), "GET watch": () => [watched("a", { reads: ["calendar"] })] }, vi.fn(), vi.fn(), false);
  const rail = await screen.findByRole("group", { name: "Briefing, schedule and mail" });
  // Every card has answered once the rail has drawn nothing but Schedule and the queue is the only thing that could have been empty.
  await waitFor(() => expect(calls.some((c) => c.route === "GET watch")).toBe(true));
  expect(within(rail).getAllByRole("region")).toHaveLength(1);
  expect(screen.queryByText("Nothing else needs you today")).toBeNull();
});

function watched(id: string, extra: Partial<S["WatchSourceView"]> = {}): S["WatchSourceView"] {
  return {
    id,
    label: `Source ${id}`,
    connector: "kind-a",
    connector_label: "A kind",
    enabled: true,
    every_minutes: 15,
    items: 0,
    last: { outcome: "ok", started_at: at(TODAY, 11, 30), new: 0, changed: 0, removed: 0 },
    read_at: at(TODAY, 11, 30),
    failures: 0,
    problem: null,
    ...extra,
  };
}

const EMPTY: Routes = {
  "GET today/agenda": () => [],
  "GET today/arrived": () => ({ items: [], left_out: 0 }),
};

test("with no source set up, the empty cards offer Connect, which opens Connections on the add form", async () => {
  const user = userEvent.setup({ advanceTimers: () => {} });
  const onAddSource = vi.fn();
  const { onView } = open(EMPTY, vi.fn(), onAddSource);
  await user.click(await screen.findByRole("button", { name: "Connect a calendar" }));
  expect(onAddSource).toHaveBeenCalledTimes(1);
  await user.click(screen.getByRole("button", { name: "Connect a mailbox" }));
  expect(onAddSource).toHaveBeenCalledTimes(2);
  expect(onView).not.toHaveBeenCalled();
});

test("when every source is off, the cards still offer Connect", async () => {
  open({ ...EMPTY, "GET watch": () => [watched("a", { enabled: false }), watched("b", { enabled: false })] });
  expect(await screen.findByRole("button", { name: "Connect a calendar" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Connect a mailbox" })).toBeInTheDocument();
  expect(screen.queryByText(/^Checked /)).toBeNull();
});

test("with calendar sources reading and nothing in them, only Schedule is drawn, and nothing says checked or offers to connect", async () => {
  open(
    {
      ...EMPTY,
      "GET watch": () => [
        watched("a", { reads: ["calendar"], last: { outcome: "ok", started_at: at(TODAY, 8, 5), new: 0, changed: 0, removed: 0 }, read_at: at(TODAY, 8, 5) }),
        watched("c", { reads: ["calendar"], last: null, read_at: null }),
      ],
    },
    vi.fn(),
    undefined,
    true,
  );
  expect(await screen.findByText("Nothing else needs you today")).toBeInTheDocument();
  const regions = within(screen.getByRole("group", { name: "Briefing, schedule and mail" })).getAllByRole("region");
  expect(regions).toHaveLength(1);
  expect(within(regions[0]).getByText("Nothing on your calendar today.")).toBeInTheDocument();
  expect(screen.queryByText(/^Checked /)).toBeNull();
  expect(screen.queryByText("Not checked yet")).toBeNull();
  expect(screen.queryByRole("link", { name: "Connect a calendar" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Connect a calendar" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Connect a mailbox" })).toBeNull();
});

test("cards that have rows show no connect button or checked line", async () => {
  open({ "GET watch": () => [] });
  await within(await column("Schedule")).findByText("Standup");
  expect(screen.queryByRole("button", { name: "Connect a calendar" })).toBeNull();
  expect(screen.queryByText(/^Checked /)).toBeNull();
});

test("a column that can't load says so and offers Try again without hiding the others", async () => {
  open({ "GET today/agenda": () => {
    throw new Error("down");
  } });
  expect(await screen.findByText("Your calendar couldn't be loaded.")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  expect(await screen.findByText("Proof is ready")).toBeInTheDocument();
});

function checked(over: Partial<S["InboxCheckView"]> = {}): S["InboxCheckView"] {
  return { ...inbox, new_items: 0, sources_read: 1, sources_failed: 0, sources_busy: 0, problems: [], ...over };
}

test("Check now reads the sources, shows the new list at once and says what arrived", async () => {
  const user = userEvent.setup({ advanceTimers: () => {} });
  const fresh = message({ title: "Fresh note", sender: "Jo Sample", unread: true });
  let current = inbox;
  const calls = fakeApi(
    routes({
      "GET watch": () => [watched("a")],
      "GET today/arrived": () => current,
      "POST today/arrived/check": () => {
        current = { ...inbox, items: [fresh, ...inbox.items] };
        return checked({ items: current.items, new_items: 1 });
      },
    }),
  );
  renderApp(<TodayRail onView={vi.fn()} />);
  const col = await column("Came in");
  expect(within(col).queryByText("Fresh note")).toBeNull();
  await user.click(await within(col).findByRole("button", { name: "Check now" }));
  expect(await within(col).findByText("Fresh note")).toBeInTheDocument();
  expect(calls.some((c) => c.route === "POST today/arrived/check")).toBe(true);
  expect(await screen.findByText("1 new item")).toBeInTheDocument();
  expect(within(col).getByRole("button", { name: "Check now" })).toBeEnabled();
});

test("Check now counts everything the sources handed in, even when none of it lists in Came in", async () => {
  const user = userEvent.setup({ advanceTimers: () => {} });
  open({
    "GET watch": () => [watched("a")],
    "POST today/arrived/check": () => checked({ items: inbox.items, new_items: 2 }),
  });
  await user.click(await within(await column("Came in")).findByRole("button", { name: "Check now" }));
  expect(await screen.findByText("2 new items")).toBeInTheDocument();
  expect(screen.queryByText("Nothing new")).toBeNull();
});

test("Check now is disabled and says it is working while it reads, and can be used again after", async () => {
  open({ "GET watch": () => [watched("a")], "POST today/arrived/check": () => checked() });
  const col = await column("Came in");
  const button = await within(col).findByRole("button", { name: "Check now" });
  fireEvent.click(button);
  const working = within(col).getByRole("button", { name: "Checking…" });
  expect(working).toBeDisabled();
  expect(working).toHaveAttribute("aria-busy", "true");
  expect(await screen.findByText("Nothing new")).toBeInTheDocument();
  await waitFor(() => expect(within(col).getByRole("button", { name: "Check now" })).toBeEnabled());
});

test("Check now says when a source couldn't be read or was already being read", async () => {
  const user = userEvent.setup({ advanceTimers: () => {} });
  open({
    "GET watch": () => [watched("a"), watched("b")],
    "POST today/arrived/check": () => checked({ sources_failed: 1, sources_busy: 1 }),
  });
  await user.click(await within(await column("Came in")).findByRole("button", { name: "Check now" }));
  expect(
    await screen.findByText("Nothing new. Couldn't read 1 connection. See Connections. Already reading 1 connection."),
  ).toBeInTheDocument();
});

test("Check now is offered only while a source is on", async () => {
  open({ "GET watch": () => [watched("a", { enabled: false })] });
  await within(await column("Came in")).findByText("2 messages");
  expect(screen.queryByRole("button", { name: "Check now" })).toBeNull();
});

// ---- Change this, and what was learned -------------------------------------------------------------------------------

test("an entry in the app's own calendar has Change this; an event read from a calendar does not", async () => {
  const user = userEvent.setup({ advanceTimers: () => {} });
  const { calls } = open({
    "GET today/agenda": () => [
      event({ title: "Standup", start: at(TODAY, 9), end: at(TODAY, 9, 30) }),
      event({ title: "Delivery window", snapshot: "EVT-1", source: "", own: true, all_day: true, start: TODAY, days: [TODAY] }),
    ],
    "POST items/event/EVT-1/change": () => ({ ok: "EVT-1", request: null, signal: "SIG-2" }),
  });
  const col = await column("Schedule");
  await within(col).findByText("Delivery window");
  expect(within(col).queryByRole("button", { name: "More actions for Standup" })).toBeNull();
  await user.click(within(col).getByRole("button", { name: "More actions for Delivery window" }));
  await user.click(screen.getByRole("menuitem", { name: "Change this" }));
  await user.type(await screen.findByRole("textbox", { name: "Your note" }), "It is a day later");
  await user.click(screen.getByRole("button", { name: "Ask for the change" }));
  await waitFor(() => expect(calls.find((c) => c.route === "POST items/event/EVT-1/change")?.body).toEqual({ note: "It is a day later" }));
});

const unread = (id: string, reads: S["WatchSourceView"]["reads"], outcome: "failed" | "offline", over: Partial<S["WatchSourceView"]> = {}) =>
  watched(id, {
    reads,
    last: { outcome, started_at: at(TODAY, 11, 45), new: 0, changed: 0, removed: 0 },
    read_at: null,
    failures: 1,
    ...over,
  });

test("an empty calendar card says the calendar couldn't be read, with why and what to do, never that it is empty or checked", async () => {
  open({
    ...EMPTY,
    "GET watch": () => [
      unread("cal", ["calendar"], "failed", {
        label: "Work calendar",
        problem: "Work calendar can't be read: the service refused the sign-in. Sign in to it again, then it is read on its next turn.",
      }),
      watched("mail", { reads: ["mail"] }),
    ],
  });
  const col = await column("Schedule");
  expect(await within(col).findByText("Your calendar couldn't be read, so this list may be missing events.")).toBeInTheDocument();
  expect(within(col).getByRole("alert")).toHaveTextContent("the service refused the sign-in. Sign in to it again");
  expect(within(col).queryByText(/^Nothing on your calendar from .+ to .+\.$/)).toBeNull();
  expect(within(col).queryByText(/^Checked /)).toBeNull();
  // The mail source reads fine and nothing came in, so Came in is drawn for Check now, not as a problem.
  const mail = await column("Came in");
  expect(within(mail).getByText("No mail has come in lately.")).toBeInTheDocument();
  expect(within(mail).queryByRole("alert")).toBeNull();
});

test("an empty mail card says the mailbox wasn't read when there was no network, and the calendar card is unaffected", async () => {
  open({
    ...EMPTY,
    "GET watch": () => [unread("mail", ["mail"], "offline", { label: "Work mail" }), watched("cal", { reads: ["calendar"] })],
  });
  const col = await column("Came in");
  expect(await within(col).findByText("Your mail couldn't be read, so this list may be missing messages.")).toBeInTheDocument();
  expect(within(col).getByRole("alert")).toHaveTextContent("Work mail couldn't be checked without an internet connection. It will retry automatically.");
  expect(within(col).queryByText("No mail has come in lately.")).toBeNull();
  // The calendar card has no unread source of its own and nothing in it, so it says nothing is on today.
  expect(within(await column("Schedule")).getByText("Nothing on your calendar today.")).toBeInTheDocument();
});

test("a source that is off is not reported, so a calendar with nothing in it says nothing is on today", async () => {
  open({ ...EMPTY, "GET watch": () => [unread("cal", ["calendar"], "failed", { enabled: false }), watched("b", { reads: ["calendar"] })] }, vi.fn(), vi.fn(), true);
  expect(await screen.findByText("Nothing else needs you today")).toBeInTheDocument();
  const schedule = await column("Schedule");
  expect(within(schedule).getByText("Nothing on your calendar today.")).toBeInTheDocument();
  expect(within(schedule).queryByRole("alert")).toBeNull();
});

test("Check now says which source couldn't be read and why, in place of only a count", async () => {
  const user = userEvent.setup({ advanceTimers: () => {} });
  open({
    "GET watch": () => [watched("a"), watched("b")],
    "POST today/arrived/check": () =>
      checked({ sources_failed: 1, problems: ["Source b can't be read: the service refused the sign-in. Sign in to it again, then it is read on its next turn."] }),
  });
  await user.click(await within(await column("Came in")).findByRole("button", { name: "Check now" }));
  expect(
    await screen.findByText("Nothing new. Source b can't be read: the service refused the sign-in. Sign in to it again, then it is read on its next turn."),
  ).toBeInTheDocument();
});

test("the week's due items alone put nothing in the Schedule card, and no count of zero is shown", async () => {
  open({
    "GET watch": () => [watched("a", { reads: ["calendar"] })],
    "GET today/agenda": () => [],
    "GET today/week": () => ({
      first: "2026-10-05",
      last: "2026-10-16",
      due: [{ action: "ACT-5", text: "Send the estimate", due: TOMORROW, project: null, owners: [], mine: true, kind: "due" }],
      waiting: [],
      meetings: [],
    }),
  });
  await screen.findByRole("group", { name: "Briefing, schedule and mail" });
  expect(await within(await column("Schedule")).findByText("Nothing on your calendar today.")).toBeInTheDocument();
  expect(document.body).not.toHaveTextContent(/\b0 (events|things|messages)/);
  expect(screen.queryByText("Send the estimate")).toBeNull();
});

// A meeting added from the agenda's drawer (design 7.7): what, the day and the time, opened by "Add to schedule".

const meetingRoutes = (answer: S["MeetingAdded"] = { entry: "EVT-9", changeset: "CS-9", merged: false }): Routes => ({
  "POST calendar/meetings": () => answer,
  "POST changesets/CS-9/undo": () => ({ restored: [0], skipped: [] }),
});

/** Opens the drawer from the agenda's button and returns the drawer. */
const addLine = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(await within(await column("Schedule")).findByRole("button", { name: "Add to schedule" }));
  return screen.findByRole("dialog", { name: "Add a meeting" });
};

test("the agenda has no form of its own: one button opens the drawer, with the cursor in its first field", async () => {
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  open(meetingRoutes());
  const panel = await column("Schedule");
  expect(within(panel).queryByRole("textbox", { name: "What" })).toBeNull();
  const drawer = await addLine(user);
  await waitFor(() => expect(within(drawer).getByRole("textbox", { name: "What" })).toHaveFocus());
  expect(within(drawer).getByLabelText("Day")).toHaveValue(TODAY);
  expect(within(drawer).getByRole("button", { name: "Add" })).toBeDisabled();
});

test("a meeting is added from the drawer: what, the day (today until chosen) and the time, with Undo, and the drawer closes", async () => {
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  const { calls } = open(meetingRoutes());
  const drawer = await addLine(user);
  await user.type(within(drawer).getByRole("textbox", { name: "What" }), "Print sync");
  fireEvent.change(within(drawer).getByLabelText("Day"), { target: { value: "2026-10-16" } });
  fireEvent.change(within(drawer).getByLabelText("Time (optional)"), { target: { value: "15:00" } });
  await user.click(within(drawer).getByRole("button", { name: "Add" }));
  await waitFor(() => expect(calls.find((c) => c.route === "POST calendar/meetings")?.body).toEqual({ what: "Print sync", day: "2026-10-16", time: "15:00" }));
  expect(await screen.findByText("Print sync added to your calendar.")).toBeInTheDocument();
  await waitFor(() => expect(screen.queryByRole("dialog", { name: "Add a meeting" })).toBeNull());
  await user.click(screen.getByRole("button", { name: "Undo" }));
  await waitFor(() => expect(calls.some((c) => c.route === "POST changesets/CS-9/undo")).toBe(true));
});

test("a meeting with no time is sent without one, and Enter in the drawer adds it", async () => {
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  const { calls } = open(meetingRoutes());
  const drawer = await addLine(user);
  await user.type(within(drawer).getByRole("textbox", { name: "What" }), "Offsite{Enter}");
  await waitFor(() => expect(calls.find((c) => c.route === "POST calendar/meetings")?.body).toEqual({ what: "Offsite", day: TODAY, time: null }));
});

test("a meeting that is already there is merged into it and said so, with nothing to undo", async () => {
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  open(meetingRoutes({ entry: null, changeset: null, merged: true, merged_with: "Print sync", where: "calendar" }));
  const drawer = await addLine(user);
  await user.type(within(drawer).getByRole("textbox", { name: "What" }), "print sync{Enter}");
  expect(await screen.findByText("Print sync is already on your calendar, so it was not added again.")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Undo" })).toBeNull();
});

test("a refusal is told in the server's words and the drawer stays open with what was typed", async () => {
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  open({ "POST calendar/meetings": () => new Refuse(409, "The day isn't one I can read; choose it from the calendar.") });
  const drawer = await addLine(user);
  await user.type(within(drawer).getByRole("textbox", { name: "What" }), "Print sync{Enter}");
  expect(await screen.findByText(/The day isn't one I can read/)).toBeInTheDocument();
  expect(within(drawer).getByRole("textbox", { name: "What" })).toHaveValue("Print sync");
});

test("on the phone a panel folded to one line says its source couldn't be read, never that it is empty", async () => {
  document.documentElement.setAttribute("data-narrow", "");
  open({
    ...EMPTY,
    "GET watch": () => [
      unread("cal", ["calendar"], "failed", { label: "Work calendar", problem: "Work calendar can't be read: the service refused the sign-in." }),
      unread("mail", ["mail"], "offline", { label: "Work mail" }),
    ],
  });
  expect(await screen.findByRole("button", { name: "Schedule · couldn't be read" })).toBeInTheDocument();
  expect(await screen.findByRole("button", { name: "Came in · couldn't be read" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Schedule · nothing today" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Came in · nothing" })).toBeNull();
});

// ---- Check now when a source is on and nothing came in; the count of what was handled -------------------------------------

const NOTHING_CAME = { "GET today/arrived": () => ({ items: [], left_out: 0 }), "GET today/agenda": () => [] };

test("with a mailbox connected and nothing come in, Came in is drawn with a quiet Check now text button, and Check now works", async () => {
  const user = userEvent.setup({ advanceTimers: () => {} });
  const calls = fakeApi(
    routes({
      ...NOTHING_CAME,
      "GET watch": () => [watched("a", { reads: ["mail"] })],
      "POST today/arrived/check": () => ({ items: [], left_out: 0, set_aside: 0, new_items: 0, sources_read: 1, sources_failed: 0, sources_busy: 0, problems: [] }),
    }),
  );
  renderApp(<TodayRail onView={vi.fn()} />);
  const col = await column("Came in");
  expect(within(col).getByText("No mail has come in lately.")).toBeInTheDocument();
  const check = within(col).getByRole("button", { name: "Check now" });
  // A quiet text button: not the filled or tonal kind.
  expect(check.className).toMatch(/\bquiet\b/);
  expect(check.className).not.toMatch(/primary/);
  await user.click(check);
  await waitFor(() => expect(calls.some((c) => c.route === "POST today/arrived/check")).toBe(true));
  expect(await screen.findByText("Nothing new")).toBeInTheDocument();
});

test("Check now keeps its usual look when mail came in, and is not drawn when no source is connected", async () => {
  open({ "GET watch": () => [watched("a")] });
  const col = await column("Came in");
  expect((await within(col).findByRole("button", { name: "Check now" })).className).not.toMatch(/\bquiet\b/);
  cleanup();
  open({ ...NOTHING_CAME, "GET watch": () => [] });
  expect(await screen.findByRole("button", { name: "Connect a mailbox" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Check now" })).toBeNull();
});

test("one quiet line counts what was handled for the person today and opens Handled for you; with none it is left out", async () => {
  open({ "GET handled/counts": () => ({ set_aside: 9, read: 3, today: 12 }) });
  const col = await column("Came in");
  const link = await within(col).findByRole("link", { name: "12 handled for you today" });
  expect(link.getAttribute("href")).toMatch(/#work\/handled$/);
  cleanup();
  open({ "GET handled/counts": () => ({ set_aside: 9, read: 3, today: 0 }) });
  await within(await column("Came in")).findByText("2 messages");
  expect(screen.queryByRole("link", { name: /handled for you/ })).toBeNull();
});

test("handled mail alone is enough to draw Came in, since the count is there to read", async () => {
  open({ ...NOTHING_CAME, "GET watch": () => [], "GET handled/counts": () => ({ set_aside: 4, read: 0, today: 4 }) }, vi.fn(), undefined, true);
  expect(await screen.findByRole("link", { name: "4 handled for you today" })).toBeInTheDocument();
  expect(screen.queryByText("Nothing else needs you today")).toBeNull();
});

test("the week's list writes a date in a to-do's words as elsewhere, and drops the phrase the row's own day already says", async () => {
  fakeApi({
    "GET today/week": () => ({
      first: "2026-10-05",
      last: "2026-10-16",
      due: [
        { action: "ACT-5", text: `Send the venue list by ${TOMORROW}.`, due: TOMORROW, project: null, owners: [], mine: true, kind: "due" },
        { action: "ACT-6", text: `Plan the move, done on ${LATER}`, due: TOMORROW, project: null, owners: [], mine: true, kind: "due" },
      ],
      waiting: [],
      meetings: [],
    }),
  });
  const { container } = renderApp(<ThisWeekInspector />);
  expect(await screen.findByText("Send the venue list.")).toBeInTheDocument();
  expect(screen.getByText(`Plan the move, done on ${day(LATER)}`)).toBeInTheDocument();
  expect(container.textContent).not.toMatch(/2026-10-1[24]/);
});
