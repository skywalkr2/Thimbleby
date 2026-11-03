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
  // The entries it last read stay shown.
  expect(screen.getByRole("button", { name: /Venue walk-through/ })).toBeInTheDocument();
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
