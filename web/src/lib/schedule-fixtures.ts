// Made-up schedule answers for the calendar page's tests: a week of entries on days the tests name, answered for whatever days a
// request asks for. Only dates and titles written here; no real calendar, person or address.
import type { S } from "./api";
import { addDays } from "./dates";
import type { Routes } from "../test-utils";

/** A Monday. */
export const TODAY = "2026-10-26";

type Entry = S["ScheduleEntryView"];
type Page = S["ScheduleView"];

export function entry(over: Partial<Entry> & Pick<Entry, "title">, date = TODAY): Entry {
  return {
    snapshot: `snap-${over.title}`,
    source: "cal-work",
    start: `${date}T10:00:00+00:00`,
    all_day: false,
    cancelled: false,
    own: false,
    open_items: 0,
    days: [date],
    slot: "timed",
    begins: `${date}T10:00:00+00:00`,
    kind: "event",
    side: null,
    ...over,
  };
}

/** An entry with no time of day. */
export const allDay = (title: string, date = TODAY, over: Partial<Entry> = {}): Entry => entry({ title, slot: "all_day", all_day: true, begins: undefined, start: date, ...over }, date);

/** The due date of a to-do. */
export const due = (title: string, date = TODAY, action = `ACT-${title}`): Entry => allDay(title, date, { kind: "due", action, snapshot: action, source: "" });

/** Where each day's entries come from: a function of the date. */
export type Content = (date: string) => { all_day?: Entry[]; timed?: Entry[] };

export const WEEK: Content = (date) =>
  date === TODAY
    ? {
        all_day: [allDay("Offsite"), due("Send the figures")],
        timed: [
          entry({ title: "Standup", begins: `${date}T09:00:00+00:00`, ends: `${date}T09:30:00+00:00`, where: "Room A", entry: "EVT-1" }),
          entry({ title: "Dentist", own: true, kind: "own", snapshot: "EVT-7", source: "", begins: `${date}T12:00:00+00:00` }),
          entry({ title: "Design review", start: `${date}T15:00:00+00:00`, begins: `${date}T15:00:00+00:00`, source: "cal-home" }),
        ],
      }
    : {};

/** A clash the engine names between two timed entries of one day (an overlap of 15 minutes unless `over` says otherwise). */
export const clash = (first: Entry, second: Entry, over: Partial<S["ScheduleClashView"]> = {}): S["ScheduleClashView"] => ({
  day: (second.begins ?? second.start).slice(0, 10),
  first: { snapshot: first.snapshot, start: first.start },
  second: { snapshot: second.snapshot, start: second.start },
  kind: "overlap",
  minutes: 15,
  travel_minutes: 30,
  ...over,
});

export function page(first: string, days: number, content: Content = WEEK, over: Partial<Page> = {}): Page {
  return {
    today: TODAY,
    first,
    days: Array.from({ length: days }, (_, n) => {
      const date = addDays(first, n);
      const found = content(date);
      return { date, all_day: found.all_day ?? [], timed: found.timed ?? [] };
    }),
    on_its_way: [],
    clashes: [],
    work_days: [0, 1, 2, 3, 4],
    week_starts_on: 0,
    grid_starts: "07:00",
    grid_ends: "19:00",
    month_entries: 3,
    ...over,
  };
}

/** Routes that answer a request for any days. */
export function scheduleRoutes(content: Content = WEEK, over: Partial<Page> = {}, extra: Routes = {}): Routes {
  return {
    "GET schedule": (_body, query) => page(query?.get("from") ?? TODAY, Number(query?.get("days") ?? 1), content, over),
    "GET watch": () => [
      { id: "cal-work", label: "Work calendar" },
      { id: "cal-home", label: "Home calendar" },
    ],
    ...extra,
  };
}

type TimelineData = S["TimelineView"];
type Lane = S["TimelineLaneView"];
type Item = S["TimelineItemView"];

/** A thing on a timeline lane, on one day unless it says otherwise. */
export function item(over: Partial<Item> & Pick<Item, "title">, start = TODAY): Item {
  return { kind: "todo", id: `ACT-${over.title}`, start, end: start, state: "open", owners: [], ...over };
}

/** A project's lane with what is on it. */
export function lane(project: string | null, name: string, items: Item[], over: Partial<Lane> = {}): Lane {
  return { project, name, side: null, in_project: project !== null, views: [], depth: 0, days_off: [], items, ...over };
}

/** The timeline answer, ten weeks from the Monday of the fixtures' week unless the range says otherwise. */
export function timelinePage(lanes: Lane[], over: Partial<TimelineData> = {}): TimelineData {
  const range = over.range ?? "ten_weeks";
  const days = { two_weeks: 14, ten_weeks: 70, quarter: 91 }[range];
  return {
    today: TODAY,
    first: TODAY,
    last: addDays(TODAY, days - 1),
    range,
    days,
    lanes,
    off_days: [],
    work_days: [0, 1, 2, 3, 4],
    week_starts_on: 0,
    default_range: "ten_weeks",
    ...over,
  };
}

/** Routes that answer the timeline: the range asked for, from the day asked for. */
export function timelineRoutes(lanes: Lane[], over: Partial<TimelineData> = {}, extra: Routes = {}): Routes {
  return {
    "GET schedule/timeline": (_body, query) => {
      const range = (query?.get("range") as TimelineData["range"] | null) ?? over.range ?? "ten_weeks";
      const first = query?.get("from") ?? TODAY;
      const days = { two_weeks: 14, ten_weeks: 70, quarter: 91 }[range];
      return timelinePage(lanes, { ...over, range, first, last: addDays(first, days - 1) });
    },
    "GET watch": () => [{ id: "cal-work", label: "Work calendar" }],
    ...extra,
  };
}
