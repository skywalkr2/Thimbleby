import "@testing-library/jest-dom/vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { addDays, dayOfMonth, monthDayLong, monthDayYear, weekday } from "../lib/dates";
import { entry, item, lane, timelineRoutes, TODAY } from "../lib/schedule-fixtures";
import { fakeApi, renderApp } from "../test-utils";
import { Schedule } from "./Schedule";

// The Timeline view of the calendar page (design 7.7): a lane for each project, each item a button with its kind, day and state
// in its name, the details of the item the cursor is on, days off, the range, and the list by week in a window too narrow.

const WIDTH = Object.getOwnPropertyDescriptor(Element.prototype, "clientWidth");

/** The room the calendar has; none given leaves the width unknown, which counts as enough. */
function room(width?: number) {
  vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener: () => undefined, removeEventListener: () => undefined }));
  if (width !== undefined) Object.defineProperty(Element.prototype, "clientWidth", { configurable: true, get: () => width });
}

beforeEach(() => {
  window.localStorage.clear();
  window.localStorage.setItem("cockpit:schedule-view", "timeline");
  room();
});
afterEach(() => {
  if (WIDTH) Object.defineProperty(Element.prototype, "clientWidth", WIDTH);
});

const todo = (title: string, start = TODAY, over = {}) => item({ title, kind: "todo", ...over }, start);
const LANES = [
  lane("PRJ-1", "Harbor", [
    todo("Send the quote", addDays(TODAY, 2), { owners: [{ person: "P-1", name: "Quinn Sample" }] }),
    todo("Pay the deposit", addDays(TODAY, -3), { state: "overdue" }),
    item({ title: "Share the draft", kind: "promise" }, addDays(TODAY, 4)),
    item({ title: "Launch day", kind: "target", id: "PRJ-1" }, addDays(TODAY, 20)),
    item({ title: "Licence renews", kind: "fact", detail: "renewal" }, addDays(TODAY, 9)),
    item({ title: "Site visit", kind: "entry", id: "EVT-9", end: addDays(TODAY, 2), entry: entry({ title: "Site visit", own: true, kind: "own", snapshot: "EVT-9", source: "" }) }, addDays(TODAY, 1)),
    item({ title: "Standup", kind: "entry", id: "EVT-1", entry: entry({ title: "Standup", snapshot: "snap-1", entry: "EVT-1" }) }, TODAY),
  ]),
  lane("PRJ-2", "Harbor shop", [todo("Order paper", addDays(TODAY, 5))], { depth: 1, parent: "PRJ-1" }),
];

async function open(lanes = LANES, over = {}, extra = {}) {
  const calls = fakeApi(timelineRoutes(lanes, over, extra));
  const view = renderApp(<Schedule />);
  await waitFor(() => expect(document.querySelector("[data-timeline]")).not.toBeNull());
  return { calls, view };
}
const names = () => screen.getAllByRole("button").map((b) => b.getAttribute("aria-label") ?? "");

describe("the Timeline", () => {
  test("a lane for each project, indented under its parent, each item a button named by its kind, day and state", async () => {
    const { calls } = await open();
    expect(screen.getByRole("radio", { name: "Timeline" })).toHaveAttribute("aria-checked", "true");
    expect(calls.some((c) => c.route === "GET schedule/timeline")).toBe(true);
    expect(screen.getByRole("heading", { name: "Harbor" })).toBeInTheDocument();
    const shop = screen.getByRole("heading", { name: "Harbor shop" });
    expect(shop).toHaveStyle({ paddingLeft: "calc(var(--space-2) + 1 * var(--space-3))" });
    const harbor = screen.getByRole("list", { name: "Items on the Harbor lane" });
    const kinds = within(harbor).getAllByRole("button").map((b) => b.getAttribute("data-kind"));
    expect(kinds.sort()).toEqual(["entry", "entry", "fact", "promise", "target", "todo", "todo"]);
    const send = within(harbor).getByRole("button", { name: /^To-do: Send the quote\. .*\. Open\.$/ });
    expect(send.querySelector("[data-shape='square']")).not.toBeNull();
    expect(within(harbor).getByRole("button", { name: /^Calendar entry: Standup\./ }).querySelector("[data-shape='circle']")).not.toBeNull();
    expect(within(harbor).getByRole("button", { name: /^Target day: Launch day\./ }).querySelector("[data-shape='diamond']")).not.toBeNull();
    expect(within(harbor).getByRole("button", { name: /^Renewal: Licence renews\./ }).querySelector("[data-shape='diamond']")).not.toBeNull();
    // An overdue to-do says so in its name and carries the warning icon, not only a color.
    const late = within(harbor).getByRole("button", { name: /^To-do: Pay the deposit\. .*\. Overdue\.$/ });
    expect(late.querySelector("[data-state='overdue'] svg")).not.toBeNull();
    // A thing over several days is a bar.
    expect(within(harbor).getByRole("button", { name: /^Calendar entry: Site visit\. .* to .*/ })).toHaveAttribute("data-bar");
    expect(screen.getByRole("list", { name: "Key" })).toBeInTheDocument();
  });

  test("two items on one day take two rows and none overlaps", async () => {
    await open([lane("PRJ-1", "Harbor", [todo("First thing"), todo("Second thing"), todo("Other day", addDays(TODAY, 30))])]);
    const top = (title: string) => Number.parseInt(screen.getByRole("button", { name: new RegExp(`^To-do: ${title}\\.`) }).closest("li")!.style.top, 10);
    expect(top("First thing")).not.toBe(top("Second thing"));
    expect(top("Other day")).toBe(top("First thing"));
  });

  test("two weeks label every day, with today named in words as well as outlined", async () => {
    window.localStorage.setItem("cockpit:schedule-timeline-range", "two_weeks");
    const { calls } = await open();
    expect(calls.some((c) => c.route === "GET schedule/timeline?range=two_weeks")).toBe(true);
    for (let n = 0; n < 14; n++) {
      const d = addDays(TODAY, n);
      expect(screen.getByText(`${weekday(d)} ${dayOfMonth(d)}`)).toBeInTheDocument();
    }
    expect(screen.getByText(`${weekday(TODAY)} ${dayOfMonth(TODAY)}`)).toHaveAttribute("data-today");
    expect(screen.getByText("Today", { selector: "span" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: `${monthDayLong(TODAY)} – ${monthDayYear(addDays(TODAY, 13))}` })).toBeInTheDocument();
  });

  test("longer ranges label the weeks, and the range pick is remembered and asked for", async () => {
    const user = userEvent.setup();
    const { calls } = await open();
    expect(screen.queryByText(`${weekday(TODAY)} ${dayOfMonth(TODAY)}`)).toBeNull();
    await user.click(screen.getByRole("radio", { name: "A quarter" }));
    await waitFor(() => expect(calls.some((c) => c.route === "GET schedule/timeline?range=quarter")).toBe(true));
    expect(window.localStorage.getItem("cockpit:schedule-timeline-range")).toBe("quarter");
    await user.click(screen.getByRole("button", { name: "Later" }));
    await waitFor(() => expect(calls.some((c) => c.route === `GET schedule/timeline?from=${addDays(TODAY, 91)}&range=quarter`)).toBe(true));
    await user.click(screen.getByRole("button", { name: "Today" }));
    await waitFor(() => expect(calls.filter((c) => c.route === "GET schedule/timeline?range=quarter").length).toBeGreaterThan(1));
  });

  test("focus on an item shows its details under the lanes, and Enter on a calendar entry opens its details", async () => {
    const user = userEvent.setup();
    await open();
    expect(screen.getByText(/Move over an item, or tab to it/)).toBeInTheDocument();
    const send = screen.getByRole("button", { name: /^To-do: Send the quote\./ });
    send.focus();
    const details = await screen.findByLabelText("Send the quote", { selector: "section" });
    expect(within(details).getByText("Quinn Sample")).toBeInTheDocument();
    expect(within(details).getByText("Harbor")).toBeInTheDocument();
    expect(within(details).getByText("Open")).toBeInTheDocument();
    send.blur();
    await waitFor(() => expect(screen.getByText(/Move over an item, or tab to it/)).toBeInTheDocument());
    const standup = screen.getByRole("button", { name: /^Calendar entry: Standup\./ });
    standup.focus();
    await user.keyboard("{Enter}");
    expect(await screen.findByRole("link", { name: "Open" })).toBeInTheDocument();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("link", { name: "Open" })).toBeNull());
  });

  test("Enter on a to-do goes to its page", async () => {
    const user = userEvent.setup();
    await open();
    screen.getByRole("button", { name: /^To-do: Send the quote\./ }).focus();
    await user.keyboard("{Enter}");
    expect(window.location.hash).toBe("#records/action/ACT-Send%20the%20quote");
  });

  test("days off are hatched on every lane, and a lane's own days off are named in the details of an item that falls on one", async () => {
    const day = addDays(TODAY, 2);
    await open(
      [lane("PRJ-1", "Harbor", [todo("Send the quote", day)], { days_off: [{ day, kind: "team", reason: "closed for the move" }] })],
      { off_days: [{ day: addDays(TODAY, 5), kind: "weekend", reason: "" }, { day: addDays(TODAY, 6), kind: "holiday", reason: "Thanksgiving" }] },
    );
    expect(document.querySelectorAll("[data-off='weekend']")).toHaveLength(1);
    expect(document.querySelectorAll("[data-off='holiday']")).toHaveLength(1);
    expect(document.querySelectorAll("[data-off='team']")).toHaveLength(1);
    expect(screen.getByText(/Days off on this lane: .*closed for the move/)).toBeInTheDocument();
    screen.getByRole("button", { name: /^To-do: Send the quote\./ }).focus();
    expect(await screen.findByText(/closed for the move/, { selector: "dd" })).toBeInTheDocument();
  });

  test("with several sides the lanes are grouped under a heading for each side", async () => {
    await open([lane("PRJ-1", "Harbor", [todo("A")], { side: "SIDE-1" }), lane("PRJ-9", "Home", [todo("B")], { side: "SIDE-2" })], {}, {
      "GET setup/business": () => ({ business: true, name: "The shop", personal: "SIDE-2", sides: [{ project: "SIDE-1", name: "The shop", kind: "business" }], chosen: "work" }),
    });
    expect(await screen.findByRole("heading", { level: 3, name: "The shop" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 4, name: "Harbor" })).toBeInTheDocument();
  });

  test("nothing in the range says so, and the to-dos with no date are listed under the timeline", async () => {
    await open([], {}, {
      "GET open-items": () => ({
        actions: [{ id: "A-1", version: 1, text: "Tidy the style sheet", state: "open", owners: [], due: null, project: "PRJ-1", project_name: "Harbor", needs_date: true, views: [] }],
        questions: [],
        stale_days: 21,
      }),
    });
    expect(screen.getByText("Nothing with a date in these weeks.")).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: /Needs a date/ })).toBeInTheDocument();
    expect(screen.getByText(/not on the timeline/)).toBeInTheDocument();
  });

  test("in a window too narrow for the weeks the same items are a list by week and nothing needs sideways room", async () => {
    room(300);
    await open();
    expect(document.querySelector("[data-week-list]")).not.toBeNull();
    expect(document.querySelector("[data-mode='list']")).not.toBeNull();
    expect(screen.queryByRole("group", { name: "Lanes by project" })).toBeNull();
    const week = screen.getByRole("region", { name: `Week of ${monthDayLong(TODAY)}` });
    const rows = within(week).getAllByRole("button");
    expect(rows.length).toBeGreaterThan(3);
    const row = within(week).getByRole("button", { name: /Send the quote/ });
    expect(row).toHaveTextContent("Harbor");
    expect(row.querySelector("[data-shape='square']")).not.toBeNull();
    // Each week that has something has its own heading, and a week with nothing has none.
    expect(screen.getAllByRole("heading", { level: 3, name: /^Week of / }).length).toBeGreaterThan(1);
    expect(names().length).toBeGreaterThan(0);
  });

  test("the 5 key picks the Timeline", async () => {
    window.localStorage.clear();
    fakeApi({ ...timelineRoutes(LANES), "GET schedule": () => ({ today: TODAY, first: TODAY, days: [], on_its_way: [], work_days: [0, 1, 2, 3, 4], week_starts_on: 0, grid_starts: "07:00", grid_ends: "19:00", month_entries: 3 }) });
    renderApp(<Schedule />);
    await screen.findByRole("radio", { name: "Work week" });
    fireEvent.keyDown(document.body, { key: "5" });
    await screen.findByRole("group", { name: "Lanes by project" });
  });
});
