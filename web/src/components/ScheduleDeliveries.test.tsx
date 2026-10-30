import "@testing-library/jest-dom/vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { S } from "../lib/api";
import { fullDay, monthDay } from "../lib/dates";
import { fakeApi, renderApp, type Routes } from "../test-utils";
import { Schedule } from "./Schedule";
import { TodayRail } from "./TodayRail";

// Midday on a made-up Sunday, on this computer's clock; only the date is faked so waiting still works.
const NOW = new Date(2026, 9, 11, 12, 0);
const TODAY = "2026-10-11";
const FIRST = "2026-10-12";
const LAST = "2026-10-14";
const TRACKING = "TRK000123456";
const CARRIER = "Example Freight";

type Delivery = NonNullable<S["AgendaItemView"]["delivery"]>;

/** An own entry for a parcel: all-day, on each day of its window, with the parcel's details. */
function parcel(title: string, delivery: Partial<Delivery>, over: Partial<S["AgendaItemView"]> = {}): S["AgendaItemView"] {
  return {
    snapshot: `EVT-${title}`,
    source: "",
    title,
    start: FIRST,
    end: LAST,
    all_day: true,
    cancelled: false,
    own: true,
    open_items: 0,
    days: [FIRST, "2026-10-13", LAST],
    delivery: { order: "ORD-4471-20", tracking: TRACKING, carrier: CARRIER, status: "on_its_way", dated: true, ...delivery },
    ...over,
  };
}

/** A delivery with no date yet: on no day. */
const undated = (title: string) => parcel(title, { dated: false, tracking: null, carrier: null }, { start: TODAY, end: null, days: [] });

function open(agenda: S["AgendaItemView"][], extra: Routes = {}) {
  fakeApi({
    "GET today/week": () => ({ first: "2026-10-05", last: "2026-10-09", due: [], waiting: [], meetings: [] }),
    "GET today/agenda": () => agenda,
    "GET today/agenda-span": () => ({ first: "2026-10-09", last: "2026-10-15" }),
    "GET today/arrived": () => ({ items: [], left_out: 0, set_aside: 0 }),
    "GET watch": () => [],
    "GET setup": () => ({ finished: true, steps: [], settled: 0, total: 0 }),
    ...extra,
  });
  renderApp(<TodayRail onView={vi.fn()} queueEmpty={false} />);
  return screen.findByRole("region", { name: "Schedule" });
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
});
afterEach(() => vi.useRealTimers());

test("a dated delivery for tomorrow is summarized in the Tomorrow footer, not listed as a future row", async () => {
  const col = await open([parcel("Parcel from the corner shop", {})]);
  expect(await within(col).findByText("Tomorrow: 1 entry")).toBeInTheDocument();
  expect(within(col).queryByText("Parcel from the corner shop")).toBeNull();
});

test("a delivery with no date yet is listed under On its way at the card's end, not on a day", async () => {
  const col = await open([parcel("Parcel from the corner shop", {}), undated("Order shipped")]);
  await within(col).findByText("Order shipped");
  const heads = within(col).getAllByRole("heading", { level: 3 });
  expect(heads.at(-1)).toHaveTextContent("On its way");
  const waiting = within(within(col).getByRole("list", { name: "On its way" })).getAllByRole("listitem");
  expect(waiting).toHaveLength(1);
  expect(waiting[0]).toHaveTextContent("Order shipped");
  expect(waiting[0]).toHaveTextContent("No date yet");
  // No day's list holds it.
  for (const list of within(col).getAllByRole("list").filter((l) => l.getAttribute("aria-labelledby") !== "agenda-on-its-way")) {
    expect(within(list).queryByText("Order shipped")).toBeNull();
  }
});

test("a card with only an undated delivery is still drawn, under On its way", async () => {
  const col = await open([undated("Order shipped")]);
  expect(await within(col).findByRole("heading", { level: 3, name: "On its way" })).toBeInTheDocument();
  expect(within(col).queryByText(/Nothing on your calendar/)).toBeNull();
  expect(within(col).queryByText(/event.? today/)).toBeNull();
});

test("a delivery that has arrived says Arrived in words, and one out for delivery says so", async () => {
  const col = await open([
    parcel("Parcel one", { status: "arrived" }, { start: TODAY, end: null, days: [TODAY] }),
    parcel("Parcel two", { status: "out_for_delivery" }, { start: TODAY, end: null, days: [TODAY] }),
  ]);
  const row = (title: string) => within(col).getByText(title).closest("li") as HTMLElement;
  await within(col).findByText("Parcel one");
  expect(row("Parcel one")).toHaveTextContent("Arrived");
  expect(row("Parcel two")).toHaveTextContent("Out for delivery");
  expect(row("Parcel two")).not.toHaveTextContent("Arrived");
});

test("the schedule screen shows a delivery's range, carrier, tracking number and Arrived in words", async () => {
  window.localStorage.setItem("cockpit:schedule-view", "day");
  vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener: () => undefined, removeEventListener: () => undefined }));
  const entry = (date: string): S["ScheduleEntryView"] => ({
    ...parcel("Parcel from the corner shop", { status: "arrived" }),
    slot: "all_day",
    days: [date],
    kind: "delivery",
  });
  fakeApi({
    "GET schedule": (_body, query) => ({
      today: FIRST,
      first: query?.get("from") ?? FIRST,
      days: [{ date: query?.get("from") ?? FIRST, all_day: [entry(query?.get("from") ?? FIRST)], timed: [] }],
      on_its_way: [],
      work_days: [0, 1, 2, 3, 4],
      week_starts_on: 0,
      grid_starts: "07:00",
      grid_ends: "19:00",
      month_entries: 3,
    }),
    "GET watch": () => [],
  });
  renderApp(<Schedule />);
  await screen.findByRole("heading", { level: 2, name: fullDay(FIRST) });
  const chip = await screen.findByRole("button", { name: /Parcel from the corner shop/ });
  expect(chip).toHaveTextContent("Arrived");
  await userEvent.click(chip);
  const pane = await screen.findByRole("dialog");
  expect(pane).toHaveTextContent(`${monthDay(FIRST)} – ${monthDay(LAST)}`);
  expect(pane).toHaveTextContent(CARRIER);
  expect(pane).toHaveTextContent(`Tracking ${TRACKING}`);
  expect(pane).toHaveTextContent("Arrived");
});
