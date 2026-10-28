import "@testing-library/jest-dom/vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import type { S } from "../lib/api";
import { actFixture } from "../lib/acts-fixtures";
import { fakeApi, Refuse, renderApp, type Routes } from "../test-utils";
import { isoInput } from "./EventActs";
import { FollowUps } from "./FollowUps";
import { NewEvent } from "./NewEvent";
import { RecordPage } from "./RecordPage";

// Creating, moving and cancelling events on a connected calendar (design 6.12, S1b-2): a new event is put on a calendar account
// that can add events, and an event of the person's own can be moved or cancelled. Each drafts an act that opens in Waiting to go
// out, shown as exactly what will be written, and waits for the person's yes there.

afterEach(() => vi.unstubAllGlobals());

const ENTRY = "EVT-1";
const START = "2026-11-02T09:00:00+00:00";
const END = "2026-11-02T10:00:00+00:00";

const entryOptions = (over: Partial<S["ActOptionsView"]> = {}): S["ActOptionsView"] => ({
  record: ENTRY,
  kind: "event",
  account: "demo-service:pat@example.com",
  account_label: "Demo service (pat@example.com)",
  acting: true,
  can_act: true,
  channel_label: "Demo calendar",
  actions: [],
  answers: [],
  propose_refusal: null,
  folder_source: null,
  folders_listed: false,
  event_actions: ["move", "cancel"],
  ...over,
});

function openEntry(extra: Routes = {}) {
  const calls = fakeApi({
    [`GET record?kind=event&id=${ENTRY}`]: () => ({ kind: "event", id: ENTRY, version: 1, fields: { id: ENTRY, title: "Planning session", start: START, end: END }, long_text: [] }),
    "GET kinds/event": () => ({ kind: "event", fields: [{ name: "title", description: "", type: "text", required: true, editable: false }] }),
    "GET people": () => [],
    "GET projects": () => [],
    ...extra,
  });
  renderApp(<RecordPage kind="event" id={ENTRY} onBack={() => {}} />);
  return calls;
}

const posts = (calls: ReturnType<typeof fakeApi>) => calls.filter((c) => c.route === "POST acts");
const drafted = (over: Partial<S["ActView"]> = {}) => actFixture({ id: "XACT-7", kind: "calendar", parts: {}, recipients: [], ...over });
const eventMenu = async (user: ReturnType<typeof userEvent.setup>) => user.click(await screen.findByRole("button", { name: /More actions for Change this event/ }));

describe("an event of the person's own", () => {
  const routes = (extra: Routes = {}): Routes => ({ [`GET acts/options?record=${ENTRY}`]: () => entryOptions(), ...extra });

  test("has Move to another time and Cancel this event in its menu", async () => {
    const user = userEvent.setup();
    openEntry(routes());
    await eventMenu(user);
    expect((await screen.findAllByRole("menuitem")).map((x) => x.textContent)).toEqual(["Move to another time…", "Cancel this event"]);
  });

  test("offers nothing when the account can't, the event isn't the person's own or acting is off", async () => {
    openEntry({ [`GET acts/options?record=${ENTRY}`]: () => entryOptions({ event_actions: [] }) });
    await screen.findByRole("heading", { level: 1, name: "Planning session" });
    await waitFor(() => expect(screen.queryByRole("button", { name: /More actions for Change this event/ })).toBeNull());
  });

  test("Cancel this event drafts the cancel at once and opens it in Waiting to go out, with nothing sent", async () => {
    const user = userEvent.setup();
    const calls = openEntry(routes({ "POST acts": () => drafted({ action: "cancel", about: [{ id: ENTRY, kind: "event", title: "Planning session", when: START, end: END }] }) }));
    await eventMenu(user);
    await user.click(await screen.findByRole("menuitem", { name: "Cancel this event" }));
    await waitFor(() => expect(posts(calls)).toHaveLength(1));
    expect(posts(calls)[0].body).toEqual({ kind: "calendar", action: "cancel", about: [ENTRY] });
    await waitFor(() => expect(window.location.hash).toBe("#work/followups"));
    expect(calls.some((c) => c.route.endsWith("/send") || c.route.endsWith("/approve"))).toBe(false);
  });

  test("Move to another time starts from the event's own time, with the cursor in the start, and drafts the new one", async () => {
    const user = userEvent.setup();
    const calls = openEntry(routes({ "POST acts": () => drafted({ action: "move", start: "2026-11-03T14:00:00.000Z", end: "2026-11-03T15:00:00.000Z" }) }));
    await eventMenu(user);
    await user.click(await screen.findByRole("menuitem", { name: "Move to another time…" }));
    const start = await screen.findByLabelText("Starts");
    const end = screen.getByLabelText("Ends");
    expect(start).toHaveFocus();
    expect(isoInput((start as HTMLInputElement).value)).toBe(new Date(START).toISOString());
    expect(isoInput((end as HTMLInputElement).value)).toBe(new Date(END).toISOString());
    await user.clear(start);
    await user.type(start, "2026-11-03T14:00");
    await user.clear(end);
    await user.type(end, "2026-11-03T15:00");
    await user.click(screen.getByRole("button", { name: "Draft the move" }));
    await waitFor(() => expect(posts(calls)).toHaveLength(1));
    expect(posts(calls)[0].body).toEqual({
      kind: "calendar",
      action: "move",
      about: [ENTRY],
      start: new Date("2026-11-03T14:00").toISOString(),
      end: new Date("2026-11-03T15:00").toISOString(),
    });
  });

  test("an end before the start is said so and nothing is drafted", async () => {
    const user = userEvent.setup();
    const calls = openEntry(routes());
    await eventMenu(user);
    await user.click(await screen.findByRole("menuitem", { name: "Move to another time…" }));
    const end = await screen.findByLabelText("Ends");
    await user.clear(end);
    await user.type(end, "2026-11-01T08:00");
    await user.click(screen.getByRole("button", { name: "Draft the move" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Type a start and an end that comes after it.");
    expect(posts(calls)).toHaveLength(0);
  });
});

describe("a new event", () => {
  const accounts = (...labels: string[]) => ({
    accounts: labels.map((label, i) => ({ id: `demo-service:user${i}@example.com`, label, acting: true, sign_in: "demo-service", can_act: true })),
  });

  test("is offered only when a connected calendar can add events", async () => {
    fakeApi({ "GET acts/calendar-options": () => accounts() });
    renderApp(<NewEvent today="2026-11-02" />);
    await waitFor(() => expect(screen.queryByRole("button", { name: "Put on a calendar…" })).toBeNull());
  });

  test("with one calendar account it is chosen already, and the draft carries the event's exact fields", async () => {
    const user = userEvent.setup();
    const calls = fakeApi({
      "GET acts/calendar-options": () => accounts("Demo service (user0@example.com)"),
      "POST acts": () => drafted({ action: "create", title: "Review the proofs", calendar: "own" }),
    });
    renderApp(<NewEvent today="2026-11-02" />);
    await user.click(await screen.findByRole("button", { name: "Put on a calendar…" }));
    const what = await screen.findByLabelText("What");
    expect(what).toHaveFocus();
    expect(screen.getByLabelText("Calendar")).toHaveValue("demo-service:user0@example.com");
    expect(screen.getByText(/Nothing is added to the calendar until you say yes/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Draft the event" })).toBeDisabled();
    await user.type(what, "Review the proofs");
    await user.clear(screen.getByLabelText("Starts"));
    await user.type(screen.getByLabelText("Starts"), "14:00");
    await user.clear(screen.getByLabelText("Ends"));
    await user.type(screen.getByLabelText("Ends"), "15:30");
    await user.type(screen.getByLabelText("Alarm, minutes before (optional)"), "10");
    await user.click(screen.getByRole("button", { name: "Draft the event" }));
    await waitFor(() => expect(posts(calls)).toHaveLength(1));
    expect(posts(calls)[0].body).toEqual({
      kind: "calendar",
      action: "create",
      account: "demo-service:user0@example.com",
      title: "Review the proofs",
      start: new Date("2026-11-02T14:00").toISOString(),
      end: new Date("2026-11-02T15:30").toISOString(),
      alarm_minutes: 10,
    });
    await waitFor(() => expect(window.location.hash).toBe("#work/followups"));
  });

  test("with several accounts the person chooses one, and none is picked for them", async () => {
    const user = userEvent.setup();
    const calls = fakeApi({
      "GET acts/calendar-options": () => accounts("Home (a@example.com)", "Work (b@example.com)"),
      "POST acts": () => drafted({ action: "create" }),
    });
    renderApp(<NewEvent today="2026-11-02" />);
    await user.click(await screen.findByRole("button", { name: "Put on a calendar…" }));
    const choice = await screen.findByLabelText("Calendar");
    expect(choice).toHaveValue("");
    expect(within(choice).getAllByRole("option").map((o) => o.textContent)).toEqual(["Choose a calendar", "Home (a@example.com)", "Work (b@example.com)"]);
    await user.type(screen.getByLabelText("What"), "Dentist");
    expect(screen.getByRole("button", { name: "Draft the event" })).toBeDisabled();
    await user.selectOptions(choice, "Work (b@example.com)");
    await user.click(screen.getByRole("button", { name: "Draft the event" }));
    await waitFor(() => expect(posts(calls)).toHaveLength(1));
    expect((posts(calls)[0].body as { account: string }).account).toBe("demo-service:user1@example.com");
  });

  test("an end that isn't after the start is said so and nothing is drafted; a refusal leaves what was typed", async () => {
    const user = userEvent.setup();
    const calls = fakeApi({ "GET acts/calendar-options": () => accounts("Demo (a@example.com)"), "POST acts": () => new Refuse(409, "the channel can't create here") });
    renderApp(<NewEvent today="2026-11-02" />);
    await user.click(await screen.findByRole("button", { name: "Put on a calendar…" }));
    await user.type(await screen.findByLabelText("What"), "Dentist");
    await user.clear(screen.getByLabelText("Ends"));
    await user.type(screen.getByLabelText("Ends"), "08:00");
    await user.click(screen.getByRole("button", { name: "Draft the event" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Type an end that comes after the start.");
    expect(posts(calls)).toHaveLength(0);
    await user.clear(screen.getByLabelText("Ends"));
    await user.type(screen.getByLabelText("Ends"), "11:00");
    await user.click(screen.getByRole("button", { name: "Draft the event" }));
    await waitFor(() => expect(posts(calls)).toHaveLength(1));
    expect(await screen.findByText(/the channel can't create here/)).toBeInTheDocument();
    expect(screen.getByLabelText("What")).toHaveValue("Dentist");
  });
});

describe("in Waiting to go out", () => {
  const show = (act: S["ActView"]) => {
    window.matchMedia = (() => ({ matches: true, addEventListener: () => undefined, removeEventListener: () => undefined })) as unknown as typeof window.matchMedia;
    fakeApi({ "GET acts": () => ({ acts: [act] }), "GET followups": () => [] });
    renderApp(<FollowUps />);
  };
  const event = { id: ENTRY, kind: "event" as const, title: "Planning session", sender: null, when: START, end: END };

  test("a new event shows its title, time, alarm and the calendar it goes on, and waits for the yes", async () => {
    show(drafted({ action: "create", title: "Review the proofs", start: START, end: END, alarm_minutes: 15, calendar: "own", account: "demo-service:pat@example.com", account_label: "Demo service (pat@example.com)" }));
    const pane = await screen.findByRole("complementary");
    expect(within(pane).getByText("Title: Review the proofs")).toBeInTheDocument();
    expect(within(pane).getByText("When: Mon, Nov 2, 9:00 AM to Mon, Nov 2, 10:00 AM")).toBeInTheDocument();
    expect(within(pane).getByText("Alarm: 15 minutes before")).toBeInTheDocument();
    expect(within(pane).getByText("Calendar: your own calendar on Demo service (pat@example.com)")).toBeInTheDocument();
    expect(within(pane).getByRole("button", { name: "Approve and send" })).toBeInTheDocument();
  });

  test("a move says which event and the new time, and a cancel says it calls the event off", async () => {
    show(drafted({ action: "move", start: "2026-11-03T14:00:00+00:00", end: "2026-11-03T15:00:00+00:00", about: [event] }));
    const pane = await screen.findByRole("complementary", { name: "Move Planning session" });
    expect(within(pane).getByText("New time: Tue, Nov 3, 2:00 PM to Tue, Nov 3, 3:00 PM")).toBeInTheDocument();
    expect(within(pane).getAllByText(/Planning session/).length).toBeGreaterThan(0);
  });

  test("a cancel says it calls the event off", async () => {
    show(drafted({ action: "cancel", about: [event] }));
    const pane = await screen.findByRole("complementary", { name: "Cancel Planning session" });
    expect(within(pane).getByText("This calls the event off on the calendar.")).toBeInTheDocument();
    expect(within(pane).getByRole("button", { name: "Approve and send" })).toBeInTheDocument();
  });
});
