import "@testing-library/jest-dom/vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import type { S } from "../lib/api";
import { addDays } from "../lib/dates";
import { allDay, clash, entry, scheduleRoutes, TODAY, type Content } from "../lib/schedule-fixtures";
import { fakeApi, renderApp } from "../test-utils";
import { Schedule } from "./Schedule";

// The calendar at each width (design 7.7): seven days wide, the working days below 1100px, and a list by day on a phone; the
// calendars as toggles; a clash as one card naming its meetings; an entry held in two calendars shown once.

const calendar = (id: string, label: string, shown_color: S["WatchSourceView"]["shown_color"]) =>
  ({ id, label, connector: "k", connector_label: "Calendar", enabled: true, every_minutes: 15, items: 1, last: null, read_at: null, failures: 0, problem: null, reads: ["calendar"], shown_color }) as S["WatchSourceView"];
const CALENDARS = [calendar("cal-a", "Home calendar", "blue"), calendar("cal-b", "Clinic calendar", "teal")];

const venue = entry({ title: "Venue walk-through", source: "cal-a", begins: `${TODAY}T14:30:00+00:00`, ends: `${TODAY}T15:30:00+00:00` });
const budget = entry({ title: "Budget check-in", source: "cal-b", begins: `${TODAY}T14:45:00+00:00`, ends: `${TODAY}T15:15:00+00:00` });
const pickup = entry({ title: "School pickup", source: "cal-a", begins: `${TODAY}T14:50:00+00:00`, ends: `${TODAY}T15:20:00+00:00` });
const content: Content = (date) =>
  date === TODAY
    ? {
        all_day: [allDay("Due: revised budget", date, { source: "cal-b" })],
        timed: [
          venue,
          budget,
          pickup,
          entry({ title: "Quarterly review", source: "cal-a", also_in: ["cal-b"], begins: `${date}T10:00:00+00:00`, ends: `${date}T11:00:00+00:00` }),
        ],
      }
    : {};
// The engine names the three meetings' pairs; the screen draws a clash only for pairs it names.
const CLASHES = [clash(venue, budget, { minutes: 30 }), clash(venue, pickup, { minutes: 30 }), clash(budget, pickup, { minutes: 25 })];

function window_(over: { wide?: boolean; phone?: boolean }) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: /max-width: 1099/.test(query) ? !over.wide : false,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
  document.documentElement.toggleAttribute("data-narrow", !!over.phone);
}

async function open(view: string) {
  window.localStorage.setItem("cockpit:schedule-view", view);
  fakeApi(scheduleRoutes(content, { clashes: CLASHES }, { "GET watch": () => CALENDARS }));
  renderApp(<Schedule />);
  await waitFor(() => expect(document.querySelector("[data-grid], [data-month], [data-schedule-list]")).not.toBeNull());
  await waitFor(() => expect(document.querySelector(`[data-day="${TODAY}"]`)).not.toBeNull());
}

beforeEach(() => window.localStorage.clear());
afterEach(() => {
  vi.unstubAllGlobals();
  document.documentElement.removeAttribute("data-narrow");
});

const lanes = () => Array.from(document.querySelectorAll("ul[data-day]")).map((el) => el.getAttribute("data-day"));

test("wide, the Week view has seven days; below 1100px it is the working days, and it says so", async () => {
  window_({ wide: true });
  await open("week");
  expect(lanes()).toHaveLength(7);
  expect(document.querySelector("[data-weekdays-only]")).toBeNull();
  document.body.innerHTML = "";
  window_({ wide: false });
  await open("week");
  expect(lanes()).toEqual([0, 1, 2, 3, 4].map((n) => addDays("2026-10-26", n)));
  expect(screen.getByText("Weekdays only at this width. Widen the window to see the weekend.")).toBeInTheDocument();
  // The tab still says Week: the person did not pick another view.
  expect(screen.getByRole("radio", { name: "Week" })).toHaveAttribute("aria-checked", "true");
});

test("on a phone the week is a list by day: each day a heading, a day with nothing says so, and a row opens its entry", async () => {
  const user = userEvent.setup();
  window_({ phone: true });
  await open("week");
  expect(document.querySelector("[data-grid]")).toBeNull();
  const list = await screen.findByRole("list", { name: "Entries by day" });
  expect(within(list).getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toContain("Monday, October 26 · today");
  expect(within(list).getByText("Nothing on Tuesday")).toBeInTheDocument();
  const review = within(list).getByRole("button", { name: /Quarterly review/ });
  expect(review).toHaveTextContent("In 2 calendars");
  await user.click(review);
  expect(await screen.findByText("Quarterly review", { selector: "h2, h3" })).toBeInTheDocument();
});

test("meetings that overlap are one row naming them, with how long they overlap, and one card in the grid", async () => {
  window_({ phone: true });
  await open("work_week");
  const group = await screen.findByRole("group", { name: "Clash: Venue walk-through, Budget check-in, School pickup" });
  expect(within(group).getByText("Clash · they overlap by 30 min")).toBeInTheDocument();
  expect(within(group).getAllByRole("button")).toHaveLength(3);
  document.body.innerHTML = "";
  window_({ wide: true });
  await open("day");
  const card = await screen.findByRole("group", { name: /^Clash: / });
  expect(within(card).getByText(/^3 at once · /)).toBeInTheDocument();
});

test("an entry held in two calendars is shown once, and says so in words", async () => {
  window_({ wide: true });
  await open("day");
  const blocks = screen.getAllByRole("button", { name: /Quarterly review/ });
  expect(blocks).toHaveLength(1);
  expect(blocks[0]).toHaveTextContent("In 2 calendars");
});

test("the calendars are toggles with their color: pressing one hides its entries and says Hidden in words, pressing it again shows them", async () => {
  const user = userEvent.setup();
  window_({ wide: true });
  await open("day");
  const home = within(screen.getByRole("list", { name: "Calendars" })).getByRole("button", { name: /Home calendar/ });
  expect(home).toHaveAttribute("aria-pressed", "true");
  expect(home.querySelector("[data-color]")).toHaveAttribute("data-color", "blue");
  expect(screen.getByRole("button", { name: /Venue walk-through/ })).toBeInTheDocument();
  await user.click(home);
  expect(home).toHaveAttribute("aria-pressed", "false");
  expect(within(home).getByText("Hidden")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /Venue walk-through/ })).toBeNull();
  await user.click(home);
  expect(screen.getByRole("button", { name: /Venue walk-through/ })).toBeInTheDocument();
});

test("a block says its title, then its time and its calendar on a line under it", async () => {
  window_({ wide: true });
  await open("day");
  const block = screen.getByRole("button", { name: /Quarterly review/ });
  expect(block.querySelector("[data-entry-line]")).toHaveTextContent(/^10:00 AM · In 2 calendars$/);
  expect(block).toHaveAttribute("data-color", "blue");
});

test("a calendar whose account needs signing in again is named in one line over the calendar, with when its entries are from and the one button", async () => {
  window_({ wide: true });
  window.localStorage.setItem("cockpit:schedule-view", "day");
  const stale = { ...calendar("cal-a", "Home calendar", "blue"), account: "robin@example.com", account_state: "expired" as const, connector: "pack/calendar", read_at: "2026-11-03T10:51:00Z", last: { outcome: "failed" as const, error_kind: "auth", started_at: "2026-11-03T11:00:00Z", new: 0, changed: 0, removed: 0 } };
  fakeApi(scheduleRoutes(content, {}, { "GET watch": () => [stale, CALENDARS[1]], "GET sign-ins": () => [{ name: "pack/account", label: "Example mail", status: "expired", ready: true, several: true, accounts: [], callback: "x", allows: [] }] }));
  renderApp(<Schedule />);
  const line = await screen.findByRole("list", { name: "Calendars that need you to sign in" });
  expect(line).toHaveTextContent(/Home calendar isn't up to date\. robin@example\.com needs you to sign in again\. Entries shown are from /);
  expect(await within(line).findByRole("button", { name: "Sign in again as robin@example.com" })).toBeInTheDocument();
  // The entries it last read stay shown, and the ones from that calendar (not the other's) are marked as not up to date.
  const venue_ = screen.getByRole("button", { name: /Venue walk-through/ });
  expect(venue_).toHaveAttribute("data-stale");
  expect(venue_).toHaveTextContent("Not up to date: its calendar needs you to sign in again.");
  expect(screen.getByRole("button", { name: /Budget check-in/ })).not.toHaveAttribute("data-stale");
});

test("on a phone the header is the title and a menu, and the moves and a short range are one row", async () => {
  const user = userEvent.setup();
  window_({ phone: true });
  await open("week");
  // The tab bar's plus hands something in, so adding to the schedule is in the menu and there is no button row for it.
  expect(screen.queryByRole("button", { name: "Add to schedule" })).toBeNull();
  const row = document.querySelector("[data-nav-row]") as HTMLElement;
  expect(within(row).getByRole("button", { name: "Today" })).toBeInTheDocument();
  expect(within(row).getByRole("heading", { level: 2 })).toHaveTextContent(/^Oct 26 – 30$/);
  await user.click(screen.getByRole("button", { name: "More actions for Schedule" }));
  await user.click(await screen.findByRole("menuitem", { name: "Add to schedule" }));
  expect(await screen.findByRole("dialog", { name: "Add a meeting" })).toBeInTheDocument();
});

test("wide, Add to schedule is the header's button and the range is written out", async () => {
  window_({ wide: true });
  await open("week");
  expect(screen.getByRole("button", { name: "Add to schedule" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "More actions for Schedule" })).toBeNull();
  expect(within(document.querySelector("[data-nav-row]") as HTMLElement).getByRole("heading", { level: 2 })).toHaveTextContent("October 26 – November 1, 2026");
});

describe("the grid opens on what matters", () => {
  test("it scrolls inside its own labelled frame to the first clash, never to empty early hours", async () => {
    window_({ wide: true });
    await open("day");
    const frame = screen.getByRole("region", { name: "Hours of the day" });
    expect(frame).toHaveAttribute("data-scroller");
    expect(frame.querySelector("[data-grid]")).not.toBeNull();
    expect(frame.querySelector("[data-clash]")).not.toBeNull();
  });

  test("the frame is placed on the clash even when the day's entries arrive after the view was picked", async () => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
      const top = this.hasAttribute("data-clash") ? 900 : 0;
      return { top, bottom: top + 40, left: 0, right: 100, width: 100, height: 40, x: 0, y: top, toJSON: () => ({}) };
    });
    window_({ wide: true });
    await open("day");
    const frame = screen.getByRole("region", { name: "Hours of the day" });
    await waitFor(() => expect(frame.scrollTop).toBeGreaterThan(0));
    vi.restoreAllMocks();
  });

  test("an hour on the edge is its short form, so it has room inside the gutter", async () => {
    window_({ wide: true });
    await open("day");
    const labels = Array.from(document.querySelectorAll("[data-hour]")).map((el) => el.textContent);
    expect(labels).toContain("10 AM");
    expect(labels.some((l) => /:00/.test(l ?? ""))).toBe(false);
  });

  test("the line that names the clashes is a button that goes to the first clash", async () => {
    window_({ wide: true });
    await open("day");
    const jump = document.querySelector<HTMLButtonElement>("[data-clash-jump]")!;
    expect(jump).not.toBeNull();
    const scroll = vi.fn();
    Element.prototype.scrollIntoView = scroll;
    await userEvent.setup().click(jump);
    expect(scroll).toHaveBeenCalled();
  });
});

describe("the month marks a day with a clash", () => {
  test("a day the engine names a clash on shows a mark with words for a screen reader", async () => {
    window_({ wide: true });
    await open("month");
    const cell = document.querySelector(`[data-day="${TODAY}"]`)!;
    expect(cell.querySelector("[data-clash-mark]")).not.toBeNull();
    expect(within(cell as HTMLElement).getByText("Clash on this day")).toBeInTheDocument();
  });
});

test("on a phone a day of the month is chosen, and its entries are listed under the month", async () => {
  const user = userEvent.setup();
  window_({ phone: true });
  await open("month");
  const cell = document.querySelector(`[data-day="${TODAY}"]`) as HTMLElement;
  await user.click(within(cell).getByRole("button", { name: /Open/ }));
  const below = document.querySelector("[data-month-day-list]") as HTMLElement;
  expect(below).not.toBeNull();
  expect(within(below).getByRole("button", { name: /Venue walk-through/ })).toBeInTheDocument();
  expect(within(below).getByRole("button", { name: "Open this day" })).toBeInTheDocument();
});

const holiday = (n: number) => allDay("Public holiday", TODAY, { snapshot: `holiday-${n}`, source: "cal-a" });

test("identical all-day entries of a day are one with a count, and a day with none has no all-day strip at all", async () => {
  const user = userEvent.setup();
  window_({ wide: true });
  window.localStorage.setItem("cockpit:schedule-view", "week");
  fakeApi(scheduleRoutes((date) => (date === TODAY ? { all_day: [holiday(1), holiday(2), holiday(3), allDay("Offsite", TODAY, { source: "cal-a" })] } : {}), {}, { "GET watch": () => CALENDARS }));
  renderApp(<Schedule />);
  const strip = await screen.findByRole("list", { name: /^All day, Today/ });
  const buttons = within(strip).getAllByRole("button");
  expect(buttons).toHaveLength(2);
  expect(within(strip).getByRole("button", { name: /Public holiday.*3 identical entries/ })).toHaveTextContent("×3");
  await user.click(buttons[0]);
  expect(await screen.findByRole("heading", { name: "Public holiday" })).toBeInTheDocument();
});

test("a week with no all-day entries draws no all-day row", async () => {
  window_({ wide: true });
  window.localStorage.setItem("cockpit:schedule-view", "week");
  fakeApi(scheduleRoutes(() => ({ timed: [] }), {}, { "GET watch": () => CALENDARS }));
  renderApp(<Schedule />);
  await waitFor(() => expect(document.querySelector("[data-grid]")).not.toBeNull());
  expect(screen.queryByText("All day")).toBeNull();
  expect(document.querySelector("ul[aria-label^='All day']")).toBeNull();
});

test("the Day column says which day it is without repeating the date the heading already gives", async () => {
  window_({ wide: true });
  await open("day");
  expect(screen.getByRole("heading", { level: 3, name: "Today" })).toBeInTheDocument();
});

test("the controls above the grid are two rows with the calendars among them, and the header is there while the days load", async () => {
  window_({ wide: true });
  window.localStorage.setItem("cockpit:schedule-view", "week");
  fakeApi(scheduleRoutes(content, { clashes: CLASHES }, { "GET watch": () => CALENDARS, "GET schedule": () => new Promise(() => undefined) }));
  renderApp(<Schedule />);
  // Before any day has arrived the page already has its title's buttons and its two rows.
  expect(await screen.findByRole("button", { name: "Add to schedule" })).toBeInTheDocument();
  expect(document.querySelectorAll("[data-bar-row]")).toHaveLength(2);
  await waitFor(() => expect(document.querySelector("[data-schedule-legend]")).not.toBeNull());
  const rows = Array.from(document.querySelectorAll("[data-bar-row]"));
  expect(rows[1].contains(document.querySelector("[data-schedule-legend]"))).toBe(true);
});

test("the week says its so-what in one line: the clashes and how many meetings there are", async () => {
  window_({ wide: true });
  await open("week");
  const sub = document.querySelector("[data-clash-jump]")?.parentElement;
  expect(sub).toHaveTextContent("1 clash, on Monday · 4 meetings");
});

test("Show all hours draws the whole day, and Show fewer hours goes back", async () => {
  const user = userEvent.setup();
  window_({ wide: true });
  await open("day");
  const hours = () => document.querySelectorAll("[data-hour]").length;
  const some = hours();
  expect(some).toBeLessThan(24);
  await user.click(screen.getByRole("button", { name: "Show all hours" }));
  expect(hours()).toBe(24);
  await user.click(screen.getByRole("button", { name: "Show fewer hours" }));
  expect(hours()).toBe(some);
});

test("a month says its so-what too, and a day's dots are inside the day's one button", async () => {
  window_({ wide: true });
  await open("month");
  expect(document.querySelector("[data-clash-jump]")?.parentElement).toHaveTextContent("1 clash, on Monday · 4 meetings");
  const cell = document.querySelector(`section[data-day="${TODAY}"]`)!;
  const button = within(cell as HTMLElement).getAllByRole("button")[0];
  expect(button.querySelector("[class*='dots']")).not.toBeNull();
});

test("the calendars are one line that scrolls, and an edge fades where more is out of sight", async () => {
  const scroll = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "scrollWidth");
  const client = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "clientWidth");
  Object.defineProperty(HTMLElement.prototype, "scrollWidth", { configurable: true, get: () => 800 });
  Object.defineProperty(HTMLElement.prototype, "clientWidth", { configurable: true, get: () => 300 });
  try {
    window_({ wide: true });
    await open("week");
    const row = await waitFor(() => {
      const found = document.querySelector<HTMLElement>("[data-schedule-legend] ul");
      expect(found).toHaveAttribute("data-fade", "end");
      return found!;
    });
    row.scrollLeft = 200;
    row.dispatchEvent(new Event("scroll"));
    await waitFor(() => expect(row).toHaveAttribute("data-fade", "both"));
  } finally {
    if (scroll) Object.defineProperty(HTMLElement.prototype, "scrollWidth", scroll);
    else delete (HTMLElement.prototype as unknown as Record<string, unknown>).scrollWidth;
    if (client) Object.defineProperty(HTMLElement.prototype, "clientWidth", client);
    else delete (HTMLElement.prototype as unknown as Record<string, unknown>).clientWidth;
  }
});
