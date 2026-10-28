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
