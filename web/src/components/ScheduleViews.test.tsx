import "@testing-library/jest-dom/vitest";
import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { S } from "../lib/api";
import { addDays, fullDay, monthDayLong, monthDayYear, monthYear } from "../lib/dates";
import { allDay, clash, entry, scheduleRoutes, TODAY, WEEK, type Content } from "../lib/schedule-fixtures";
import { fakeApi, renderApp, type Routes } from "../test-utils";
import { Schedule } from "./Schedule";

// The calendar page (design 7.7): the four views, the keys, the arrows, overlapping entries, the details beside the calendar,
// the side filter, due dates and the fall back to Day in a narrow space.

const WIDTH = Object.getOwnPropertyDescriptor(Element.prototype, "clientWidth");

/** The window as these tests draw it: whether the pane fits beside the calendar, and how much room the calendar has. */
function room(over: { beside?: boolean; width?: number } = {}) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: !!over.beside && /min-width: 1024px/.test(query),
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
  if (over.width !== undefined) Object.defineProperty(Element.prototype, "clientWidth", { configurable: true, get: () => over.width });
}

beforeEach(() => {
  window.localStorage.clear();
  room();
});
afterEach(() => {
  if (WIDTH) Object.defineProperty(Element.prototype, "clientWidth", WIDTH);
});

const requested = (calls: ReturnType<typeof fakeApi>) => calls.filter((c) => c.route.startsWith("GET schedule")).map((c) => c.route.replace("GET ", ""));
const lanes = () => Array.from(document.querySelectorAll("ul[data-day]")).map((el) => el.getAttribute("data-day"));
const cells = () => Array.from(document.querySelectorAll("section[data-day]")).map((el) => el.getAttribute("data-day"));
const radio = (name: string) => screen.getByRole("radio", { name });
const checked = () => screen.getAllByRole("radio").find((r) => r.getAttribute("aria-checked") === "true")?.textContent;

async function open(content: Content = WEEK, over: Partial<S["ScheduleView"]> = {}, extra: Routes = {}) {
  const calls = fakeApi(scheduleRoutes(content, over, extra));
  const view = renderApp(<Schedule />);
  await screen.findByRole("heading", { level: 2, name: /–|2026/ });
  await waitFor(() => expect(document.querySelector("[data-grid], [data-month]")).not.toBeNull());
  // The first page asked for is the computer's week; the server's today (the fixtures') follows. Waiting for its day
  // keeps the tests the same in any week the suite runs.
  await waitFor(() => expect(document.querySelector(`[data-day="${TODAY}"]`)).not.toBeNull());
  return { calls, view };
}

describe("the views", () => {
  test("the calendar opens on the work week: a lane for each working day, today named in words, and the range as the heading", async () => {
    const { calls } = await open();
    const first = "2026-10-26";
    expect(lanes()).toEqual([0, 1, 2, 3, 4].map((n) => addDays(first, n)));
    expect(checked()).toBe("Work week");
    expect(screen.getByRole("heading", { level: 2, name: `${monthDayLong("2026-10-26")} – ${monthDayYear("2026-10-30")}` })).toBeInTheDocument();
    // Today is a word in its heading and on its lane, not only a tint.
    expect(screen.getByRole("heading", { level: 3, name: /^Today · / })).toBeInTheDocument();
    expect(screen.getByRole("list", { name: /^Today · / })).toHaveAttribute("data-today");
    expect(requested(calls)).toContain(`schedule?from=${first}&days=7`);
  });

  test("Day shows one day with its all-day strip on top and its timed entries in the lane", async () => {
    const user = userEvent.setup();
    await open();
    await user.click(radio("Day"));
    await waitFor(() => expect(lanes()).toEqual([TODAY]));
    expect(screen.getByRole("heading", { level: 2, name: fullDay(TODAY) })).toBeInTheDocument();
    const strip = screen.getByRole("list", { name: /^All day, Today/ });
    expect(within(strip).getByRole("button", { name: /Offsite/ })).toBeInTheDocument();
    expect(within(strip).getByRole("button", { name: /Due: Send the figures/ })).toBeInTheDocument();
    const lane = screen.getByRole("list", { name: /^Today · / });
    expect(within(lane).getAllByRole("button").map((b) => /Standup|Dentist|Design review/.exec(b.textContent ?? "")?.[0])).toEqual(["Standup", "Dentist", "Design review"]);
    expect(within(lane).queryByRole("button", { name: /Offsite/ })).toBeNull();
  });

  test("Week shows all seven days, from the day the week starts on", async () => {
    const user = userEvent.setup();
    await open(WEEK, { week_starts_on: 6 });
    await user.click(radio("Week"));
    await waitFor(() => expect(lanes()).toEqual([0, 1, 2, 3, 4, 5, 6].map((n) => addDays("2026-10-25", n))));
  });

  test("Month shows six weeks, lists a few entries a day and opens the day from 'more'", async () => {
    const user = userEvent.setup();
    await open();
    await user.click(radio("Month"));
    await waitFor(() => expect(cells()).toHaveLength(42));
    expect(cells()[0]).toBe("2026-09-28");
    expect(screen.getByRole("heading", { level: 2, name: monthYear(TODAY) })).toBeInTheDocument();
    const today = document.querySelector(`section[data-day="${TODAY}"]`) as HTMLElement;
    expect(today).toHaveAttribute("data-today");
    expect(within(today).getByRole("button", { name: /Offsite/ })).toBeInTheDocument();
    // Five entries, three listed (the setting), the rest counted.
    expect(within(today).getAllByRole("listitem")).toHaveLength(4);
    expect(within(today).getByRole("button", { name: "2 more" })).toBeInTheDocument();
    expect(within(today).getByRole("button", { name: /^Open .*: 5 entries$/ })).toBeInTheDocument();
    await user.click(within(today).getByRole("button", { name: "2 more" }));
    await waitFor(() => expect(lanes()).toEqual([TODAY]));
    expect(checked()).toBe("Day");
  });

  test("a day with nothing on it says so in Day view", async () => {
    const user = userEvent.setup();
    await open(() => ({}));
    await user.click(radio("Day"));
    expect(await screen.findByText("Nothing on this day.")).toBeInTheDocument();
  });

  test("the pick is remembered on this browser, and a browser that keeps nothing opens on the work week", async () => {
    const user = userEvent.setup();
    const { view } = await open();
    await user.click(radio("Month"));
    expect(window.localStorage.getItem("cockpit:schedule-view")).toBe("month");
    view.unmount();
    await open();
    expect(checked()).toBe("Month");
    window.localStorage.clear();
    const blocked = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    document.body.innerHTML = "";
    await open();
    expect(checked()).toBe("Work week");
    blocked.mockRestore();
  });
});

describe("the keys and the arrows", () => {
  test("1 to 5 pick Day, Work week, Week, Month and the Timeline, but never while the cursor is in a field", async () => {
    fakeApi(scheduleRoutes());
    renderApp(
      <>
        <input aria-label="Typing here" />
        <Schedule />
      </>,
    );
    await screen.findByRole("heading", { level: 3, name: /^Today · / });
    fireEvent.keyDown(document.body, { key: "1" });
    await waitFor(() => expect(checked()).toBe("Day"));
    fireEvent.keyDown(document.body, { key: "3" });
    await waitFor(() => expect(checked()).toBe("Week"));
    fireEvent.keyDown(document.body, { key: "4" });
    await waitFor(() => expect(checked()).toBe("Month"));
    fireEvent.keyDown(document.body, { key: "2" });
    await waitFor(() => expect(checked()).toBe("Work week"));
    fireEvent.keyDown(screen.getByLabelText("Typing here"), { key: "1" });
    fireEvent.keyDown(document.body, { key: "1", ctrlKey: true });
    expect(checked()).toBe("Work week");
  });

  test("the view keys work with the cursor on the page's heading outside the calendar, where it lands when the screen opens", async () => {
    fakeApi(scheduleRoutes());
    renderApp(
      <>
        <h1 tabIndex={-1}>Page heading</h1>
        <Schedule />
      </>,
    );
    await screen.findByRole("heading", { level: 3, name: /^Today · / });
    const top = screen.getByRole("heading", { name: "Page heading" });
    top.focus();
    fireEvent.keyDown(top, { key: "4" });
    await waitFor(() => expect(checked()).toBe("Month"));
  });

  test("the arrows and the Today button move a day, a week or a month, by the view", async () => {
    const user = userEvent.setup();
    const { calls } = await open();
    await user.click(radio("Day"));
    await user.click(screen.getByRole("button", { name: "Next day" }));
    await waitFor(() => expect(requested(calls)).toContain(`schedule?from=${addDays(TODAY, 1)}&days=1`));
    expect(await screen.findByRole("heading", { level: 2, name: fullDay(addDays(TODAY, 1)) })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Today" }));
    expect(await screen.findByRole("heading", { level: 2, name: fullDay(TODAY) })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Previous day" }));
    await screen.findByRole("heading", { level: 2, name: fullDay(addDays(TODAY, -1)) });

    await user.click(radio("Work week"));
    await user.click(screen.getByRole("button", { name: "Next week" }));
    await waitFor(() => expect(requested(calls)).toContain("schedule?from=2026-10-19&days=7"));
    await user.click(screen.getByRole("button", { name: "Today" }));
    await user.click(screen.getByRole("button", { name: "Next week" }));
    await waitFor(() => expect(requested(calls)).toContain("schedule?from=2026-11-02&days=7"));

    await user.click(radio("Month"));
    await user.click(screen.getByRole("button", { name: "Today" }));
    await user.click(screen.getByRole("button", { name: "Next month" }));
    expect(await screen.findByRole("heading", { level: 2, name: monthYear("2026-11-26") })).toBeInTheDocument();
    await waitFor(() => expect(requested(calls)).toContain("schedule?from=2026-10-26&days=42"));
    await user.click(screen.getByRole("button", { name: "Previous month" }));
    expect(await screen.findByRole("heading", { level: 2, name: monthYear(TODAY) })).toBeInTheDocument();
  });

  test("the left and right keys move by the view's unit, Shift moves a week in Day, and a field keeps its own arrows", async () => {
    const user = userEvent.setup();
    const { calls } = await open();
    fireEvent.keyDown(document.body, { key: "ArrowRight" });
    await waitFor(() => expect(requested(calls)).toContain("schedule?from=2026-11-02&days=7"));
    await user.click(radio("Day"));
    await user.click(screen.getByRole("button", { name: "Today" }));
    fireEvent.keyDown(document.body, { key: "ArrowLeft", shiftKey: true });
    await waitFor(() => expect(requested(calls)).toContain(`schedule?from=${addDays(TODAY, -7)}&days=1`));
    const before = requested(calls).length;
    fireEvent.keyDown(document.body, { key: "ArrowRight", ctrlKey: true });
    expect(requested(calls)).toHaveLength(before);
  });
});

describe("the grid", () => {
  test("meetings the engine pairs are one clash card naming them, and one alone takes the whole lane", async () => {
    const user = userEvent.setup();
    const planning = (date: string) => entry({ title: "Planning", begins: `${date}T09:15:00+00:00`, ends: `${date}T10:00:00+00:00` });
    const standup = (WEEK(TODAY).timed ?? [])[0];
    await open((date) => (date === TODAY ? { timed: [planning(date), ...(WEEK(date).timed ?? [])] } : {}), { clashes: [clash(standup, planning(TODAY))] });
    await user.click(radio("Day"));
    const card = await screen.findByRole("group", { name: "Clash: Standup, Planning" });
    // The word and an icon say it, and both meetings are in it, each one a button that opens it.
    expect(within(card).getByText("Clash")).toBeInTheDocument();
    expect(within(card).getByRole("button", { name: /Standup/ })).toBeInTheDocument();
    expect(within(card).getByRole("button", { name: /Planning/ })).toBeInTheDocument();
    const clashStyle = (card.closest("li") as HTMLElement).style;
    const dentist = ((await screen.findByRole("button", { name: /Dentist/ })).closest("li") as HTMLElement).style;
    // The card spans from the first start (09:00, the grid starting at 07:00) to the last end (10:00).
    expect([clashStyle.left, clashStyle.width]).toEqual(["0px", "100%"]);
    expect(clashStyle.top).toBe("calc(2 * var(--hour))");
    expect(clashStyle.height).toBe("calc(1 * var(--hour))");
    expect([dentist.left, dentist.width]).toEqual(["0%", "100%"]);
  });

  test("only the pairs the engine lists are drawn as a clash: an overlap it does not list (marked fine, not attended) is two ordinary entries", async () => {
    const user = userEvent.setup();
    const at = (title: string, from: string, to: string, date = TODAY) => entry({ title, begins: `${date}T${from}:00+00:00`, ends: `${date}T${to}:00+00:00`, start: `${date}T${from}:00+00:00` });
    const [one, two, three, four, five, six] = [at("Kickoff", "08:00", "09:00"), at("Intro", "08:30", "09:30"), at("Lunch", "12:00", "13:00"), at("Errand", "12:30", "13:30"), at("Site visit", "15:00", "16:00"), at("Supplier call", "16:10", "17:00")];
    await open((date) => (date === TODAY ? { timed: [one, two, three, four, five, six] } : {}), { clashes: [clash(one, two), clash(five, six, { kind: "travel", minutes: 20, travel_minutes: 30 })] });
    await user.click(radio("Day"));
    // Kickoff and Intro are listed: one card. Lunch and Errand overlap but are not: two entries side by side, in no card.
    expect(await screen.findByRole("group", { name: "Clash: Kickoff, Intro" })).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: /Lunch|Errand/ })).toBeNull();
    for (const title of ["Lunch", "Errand"]) expect((await screen.findByRole("button", { name: new RegExp(title) })).closest("[data-clash]")).toBeNull();
    // Two entries with no overlap that the engine lists for travel are a card that says it is about travel and the minutes asked for.
    const travel = await screen.findByRole("group", { name: "Clash: Site visit, Supplier call" });
    expect(within(travel).getByText("Clash · travel: you need 30 min to get from one place to the other")).toBeInTheDocument();
    expect(document.querySelectorAll("[data-clash]")).toHaveLength(2);
  });

  test("entries that are not meetings and overlap sit side by side", async () => {
    const user = userEvent.setup();
    await open((date) =>
      date === TODAY
        ? { timed: [entry({ title: "Parcel one", kind: "delivery", begins: `${date}T09:00:00+00:00`, ends: `${date}T10:00:00+00:00` }), entry({ title: "Parcel two", kind: "delivery", begins: `${date}T09:15:00+00:00`, ends: `${date}T10:00:00+00:00` })] }
        : {},
    );
    await user.click(radio("Day"));
    const slot = async (title: string) => ((await screen.findByRole("button", { name: new RegExp(title) })).closest("li") as HTMLElement).style;
    const [one, two] = [await slot("Parcel one"), await slot("Parcel two")];
    expect([one.left, one.width, two.left, two.width]).toEqual(["0%", "50%", "50%", "50%"]);
    expect(one.top).toBe("calc(2 * var(--hour))");
    expect(document.querySelector("[data-clash]")).toBeNull();
  });

  test("the grid shows the configured hours and grows to hold an entry outside them", async () => {
    const user = userEvent.setup();
    await open();
    await user.click(radio("Day"));
    await waitFor(() => expect(document.querySelector("[data-grid]")?.getAttribute("style")).toContain("--rows: 12"));
    document.body.innerHTML = "";
    await open((date) => (date === TODAY ? { timed: [entry({ title: "Early flight", begins: `${date}T05:30:00+00:00`, ends: `${date}T06:30:00+00:00` })] } : {}));
    await waitFor(() => expect(document.querySelector("[data-grid]")?.getAttribute("style")).toContain("--rows: 14"));
    expect(screen.getByRole("button", { name: /Early flight/ })).toBeInTheDocument();
  });

  test("a line marks now on today's column only", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 26, 10, 15));
    try {
      await open();
      const now = document.querySelectorAll("[data-now]");
      expect(now).toHaveLength(1);
      expect(now[0].closest("ul")).toHaveAttribute("data-today");
      // 10:15 is 3 hours and a quarter after the grid's first hour.
      expect((now[0] as HTMLElement).style.top).toBe("calc(3.25 * var(--hour))");
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("an entry's details", () => {
  test("beside the calendar on a wide window: what it is, when, where, its calendar and its page, and Escape returns the cursor", async () => {
    room({ beside: true });
    const user = userEvent.setup();
    await open();
    const button = screen.getByRole("button", { name: /Standup/ });
    expect(button).toHaveAccessibleName(/Work calendar/);
    await user.click(button);
    const pane = await screen.findByRole("complementary", { name: "Standup" });
    expect(within(pane).getByText("Room A")).toBeInTheDocument();
    expect(within(pane).getByText("Work calendar")).toBeInTheDocument();
    expect(pane).toHaveTextContent(/9:00.*9:30/);
    expect(within(pane).getByRole("link", { name: "Open" })).toHaveAttribute("href", expect.stringMatching(/#records\/event\/EVT-1$/));
    expect(button).toHaveAttribute("data-selected");
    fireEvent.keyDown(button, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("complementary", { name: "Standup" })).toBeNull());
    await waitFor(() => expect(screen.getByRole("button", { name: /Standup/ })).toHaveFocus());
  });

  test("on a narrow window the details take the screen, the cursor is on their heading and Back returns it to the entry", async () => {
    const user = userEvent.setup();
    await open();
    await user.click(screen.getByRole("button", { name: /Dentist/ }));
    const dialog = await screen.findByRole("dialog");
    const heading = within(dialog).getByRole("heading", { name: "Dentist" });
    await waitFor(() => expect(heading).toHaveFocus());
    expect(within(dialog).getByText("The app's own calendar")).toBeInTheDocument();
    expect(within(dialog).getByRole("link", { name: "Open" })).toHaveAttribute("href", expect.stringMatching(/#records\/event\/EVT-7$/));
    await user.click(within(dialog).getByRole("button", { name: "Back to the calendar" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(screen.getByRole("button", { name: /Dentist/ })).toHaveFocus());
  });

  test("an event the app keeps no entry for opens a read-only page, and its calendar's address stays beside it with the real domain", async () => {
    room({ beside: true });
    const user = userEvent.setup();
    const address = `${"https"}://meet.example.com/room/42`;
    await open((date) => (date === TODAY ? { timed: [entry({ title: "Design review", source: "cal-home", link: address })] } : {}));
    await user.click(screen.getByRole("button", { name: /Design review/ }));
    const pane = await screen.findByRole("complementary", { name: "Design review" });
    expect(within(pane).getByText("Home calendar")).toBeInTheDocument();
    expect(within(pane).getByRole("link", { name: "Open" })).toHaveAttribute("href", expect.stringMatching(/#records\/calendar-event\/snap-Design%20review%40/));
    expect(within(pane).getByRole("link", { name: "Open in your calendar" })).toHaveAttribute("href", address);
    expect(pane).toHaveTextContent("meet.example.com");
  });

  test("the person's own entry is cancelled from its details at once, with Undo; an event with no entry of the app's says to change it in its calendar app", async () => {
    room({ beside: true });
    const user = userEvent.setup();
    const address = `${"https"}://meet.example.com/room/42`;
    const own = entry({ title: "Dentist", snapshot: "EVT-7", own: true, source: "" });
    const { calls } = await open(
      (date) => (date === TODAY ? { timed: [own, entry({ title: "Design review", source: "cal-home", link: address })] } : {}),
      {},
      {
        "GET acts/options?record=EVT-7": () => ({ record: "EVT-7", kind: "event", acting: false, can_act: false, folders_listed: false, event_own: true, event_actions: [] }),
        "GET record?kind=event&id=EVT-7": () => ({ kind: "event", id: "EVT-7", version: 4, fields: { id: "EVT-7", title: "Dentist", start: own.start }, long_text: [] }),
        "POST events/EVT-7/cancel": () => ({ changeset: "CS-3", refused: null }),
        "POST changesets/CS-3/undo": () => ({ restored: [0], skipped: [] }),
      },
    );
    await user.click(screen.getByRole("button", { name: /Dentist/ }));
    const pane = await screen.findByRole("complementary", { name: "Dentist" });
    await user.click(await within(pane).findByRole("button", { name: /More actions for Dentist/ }));
    await user.click(await screen.findByRole("menuitem", { name: "Cancel this event" }));
    await waitFor(() => expect(calls.filter((c) => c.route === "POST events/EVT-7/cancel")).toHaveLength(1));
    expect(calls.find((c) => c.route === "POST events/EVT-7/cancel")?.body).toEqual({ read_version: 4 });
    await user.click(await screen.findByRole("button", { name: "Undo" }));
    await waitFor(() => expect(calls.some((c) => c.route === "POST changesets/CS-3/undo")).toBe(true));

    await user.click(screen.getByRole("button", { name: /Design review/ }));
    const other = await screen.findByRole("complementary", { name: "Design review" });
    expect(within(other).getByText("Change it in your calendar app.")).toBeInTheDocument();
    expect(within(other).getByRole("link", { name: "Open in your calendar" })).toHaveAttribute("href", address);
  });

  test("a due date links to its to-do", async () => {
    room({ beside: true });
    const user = userEvent.setup();
    await open();
    await user.click(screen.getByRole("button", { name: /Due: Send the figures/ }));
    const pane = await screen.findByRole("complementary", { name: "Due: Send the figures" });
    expect(within(pane).getByRole("link", { name: "Open the to-do" })).toHaveAttribute("href", expect.stringMatching(/#records\/action\/ACT-Send%20the%20figures$/));
    expect(within(pane).getByText("A to-do you own")).toBeInTheDocument();
  });

  test("a delivery's pane gives its range, carrier, tracking number and status in words, and one with no date yet is listed under On its way", async () => {
    room({ beside: true });
    const user = userEvent.setup();
    const parcel = (title: string, over: Partial<S["ScheduleEntryView"]>): S["ScheduleEntryView"] =>
      allDay(title, TODAY, {
        own: true,
        kind: "delivery",
        source: "",
        snapshot: `EVT-${title}`,
        end: addDays(TODAY, 2),
        delivery: { order: "ORD-1", tracking: "TRK000123", carrier: "Example Freight", status: "out_for_delivery", dated: true },
        ...over,
      });
    const waiting = parcel("Order shipped", { start: TODAY, end: null, days: [], delivery: { order: "ORD-2", tracking: null, carrier: null, status: "on_its_way", dated: false } });
    await open((date) => (date === TODAY ? { all_day: [parcel("Parcel from the corner shop", {})] } : {}), { on_its_way: [waiting] });
    await user.click(screen.getByRole("button", { name: /Parcel from the corner shop/ }));
    const pane = await screen.findByRole("complementary", { name: "Parcel from the corner shop" });
    expect(pane).toHaveTextContent("Out for delivery");
    expect(pane).toHaveTextContent("Carried by Example Freight");
    expect(pane).toHaveTextContent("Tracking TRK000123");
    expect(pane).toHaveTextContent("Order ORD-1");
    const section = screen.getByRole("region", { name: "On its way" });
    await user.click(within(section).getByRole("button", { name: /Order shipped/ }));
    const second = await screen.findByRole("complementary", { name: "Order shipped" });
    expect(second).toHaveTextContent("No date yet");
  });

  test("a cancelled entry keeps its struck title and its pill", async () => {
    const user = userEvent.setup();
    await open((date) => (date === TODAY ? { timed: [entry({ title: "Called off talk", cancelled: true })] } : {}));
    await user.click(radio("Day"));
    const button = await screen.findByRole("button", { name: /Called off talk/ });
    expect(within(button).getByText("Called off")).toBeInTheDocument();
    expect(within(button).getByText("Called off talk").className).toMatch(/struck/);
  });

  test("every entry says which calendar it is on in words, and a calendar's color is a mark beside it that is hidden from a screen reader", async () => {
    await open(WEEK, {}, { "GET watch": () => [{ id: "cal-work", label: "Work calendar", color: "teal" }, { id: "cal-home", label: "Home calendar" }] });
    expect(screen.getByRole("button", { name: /Standup/ })).toHaveAccessibleName(/From Work calendar/);
    expect(screen.getByRole("button", { name: /Design review/ })).toHaveAccessibleName(/From Home calendar/);
    expect(screen.getByRole("button", { name: /Dentist/ })).toHaveAccessibleName(/Added by you/);
    // The block carries its calendar's color on its edge and in its fill (the color is named on the block itself); the words say which calendar.
    expect(screen.getByRole("button", { name: /Standup/ })).toHaveAttribute("data-color", "teal");
    expect(screen.getByRole("button", { name: /Standup/ })).toHaveTextContent(/Work calendar/);
    expect(screen.getByRole("button", { name: /Design review/ })).not.toHaveAttribute("data-color");
    expect(screen.getByRole("button", { name: /Dentist/ })).not.toHaveAttribute("data-color");
  });
});

describe("the side filter", () => {
  const FIRST: S["SideView"] = { project: "PRJ-first", kind: "business", name: "Orchard Press", removable: false, filed: 0 };
  const SECOND: S["SideView"] = { project: "PRJ-second", kind: "job", name: "Lantern Works", removable: false, filed: 0 };
  const sides: Routes = { "GET setup/business": () => ({ business: true, name: FIRST.name, personal: "PRJ-personal", sides: [FIRST, SECOND], chosen: "work" }) };
  const onSides: Content = (date) =>
    date === TODAY
      ? {
          timed: [
            entry({ title: "On the first side", side: FIRST.project }),
            entry({ title: "On the second side", side: SECOND.project }),
            entry({ title: "On neither side", side: null }),
          ],
        }
      : {};

  test("a side narrows the entries, and an entry on no side shows under every choice", async () => {
    const user = userEvent.setup();
    await open(onSides, {}, sides);
    await user.click(radio("Day"));
    const group = await screen.findByRole("radiogroup", { name: "Show" });
    expect(screen.getByRole("button", { name: /On the first side/ })).toBeInTheDocument();
    await user.click(within(group).getByRole("radio", { name: FIRST.name }));
    await waitFor(() => expect(screen.queryByRole("button", { name: /On the second side/ })).toBeNull());
    expect(screen.getByRole("button", { name: /On the first side/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /On neither side/ })).toBeInTheDocument();
    await user.click(within(group).getByRole("radio", { name: SECOND.name }));
    await waitFor(() => expect(screen.queryByRole("button", { name: /On the first side/ })).toBeNull());
    expect(screen.getByRole("button", { name: /On the second side/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /On neither side/ })).toBeInTheDocument();
    await user.click(within(group).getByRole("radio", { name: "All" }));
    expect(await screen.findByRole("button", { name: /On the first side/ })).toBeInTheDocument();
  });

  test("the details name the entry's side", async () => {
    room({ beside: true });
    const user = userEvent.setup();
    await open(onSides, {}, sides);
    await user.click(await screen.findByRole("button", { name: /On the second side/ }));
    const pane = await screen.findByRole("complementary", { name: "On the second side" });
    expect(within(pane).getByText(SECOND.name)).toBeInTheDocument();
  });

  test("with no side set up the filter isn't offered", async () => {
    await open(onSides);
    expect(screen.queryByRole("radiogroup", { name: "Show" })).toBeNull();
  });
});

describe("a narrow space", () => {
  test("Week and Work week fall back to Day below the room their columns need, and Month stays", async () => {
    room({ width: 400 });
    const user = userEvent.setup();
    await open();
    expect(lanes()).toEqual([TODAY]);
    expect(checked()).toBe("Day");
    expect(screen.queryByRole("radio", { name: "Week" })).toBeNull();
    expect(screen.queryByRole("radio", { name: "Work week" })).toBeNull();
    // The keys for views that don't fit do nothing; Month works.
    fireEvent.keyDown(document.body, { key: "3" });
    expect(lanes()).toEqual([TODAY]);
    await user.click(radio("Month"));
    await waitFor(() => expect(cells()).toHaveLength(42));
  });

  test("with room for five columns but not seven, Work week is offered and Week is not", async () => {
    room({ width: 600 });
    await open();
    expect(lanes()).toHaveLength(5);
    expect(screen.getByRole("radio", { name: "Work week" })).toBeInTheDocument();
    expect(screen.queryByRole("radio", { name: "Week" })).toBeNull();
  });

  test("with room for seven columns every view is offered", async () => {
    room({ width: 900 });
    await open();
    expect(screen.getAllByRole("radio").map((r) => r.textContent)).toEqual(["Day", "Work week", "Week", "Month", "Timeline"]);
  });
});

test("a schedule that can't be loaded says so and tries again", async () => {
  const user = userEvent.setup();
  const routes = scheduleRoutes();
  delete routes["GET schedule"];
  fakeApi(routes);
  renderApp(<Schedule />);
  expect(await screen.findByText("Your schedule couldn't be loaded.")).toBeInTheDocument();
  fakeApi(scheduleRoutes());
  await act(async () => {
    await user.click(screen.getByRole("button", { name: "Try again" }));
  });
  await screen.findByRole("heading", { level: 3, name: /^Today · / });
});

describe("an empty calendar and the details pane", () => {
  test("a week or month with nothing on it says so and points to Add to schedule", async () => {
    const user = userEvent.setup();
    await open(() => ({}));
    expect(screen.getByText(/Nothing on the calendar in these days/)).toBeInTheDocument();
    await user.click(radio("Month"));
    expect(await screen.findByText(/Use Add to schedule above/)).toBeInTheDocument();
    await user.click(radio("Day"));
    expect(await screen.findByText("Nothing on this day.")).toBeInTheDocument();
    expect(screen.queryByText(/Nothing on the calendar in these days/)).toBeNull();
  });

  test("the details cover the edge of the calendar instead of squeezing the week when it would be left too narrow", async () => {
    const user = userEvent.setup();
    const split = (width: number) => {
      vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockImplementation(function (this: HTMLElement) {
        return this.hasAttribute("data-split") ? width : 0;
      });
      vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockImplementation(function (this: HTMLElement) {
        return this.hasAttribute("data-detail-pane") ? 420 : 0;
      });
    };
    vi.stubGlobal("matchMedia", (query: string) => ({ matches: /min-width:\s*1024px/.test(query), addEventListener: () => undefined, removeEventListener: () => undefined }));
    split(900);
    await open();
    await user.click(screen.getByRole("button", { name: /Standup/ }));
    await screen.findByRole("complementary", { name: "Standup" });
    expect(document.querySelector("[data-split]")).toHaveAttribute("data-pane", "overlay");
    vi.restoreAllMocks();
  });
});
