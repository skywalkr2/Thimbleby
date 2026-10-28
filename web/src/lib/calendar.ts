// The calendar page's arithmetic (design 7.7): which days each view shows, how far an arrow moves, where an entry sits on
// the time grid and how entries that overlap share a column. Plain functions of dates and numbers, so the screen only draws.
// Days are yyyy-mm-dd text on the person's own calendar; weekdays count from Monday as 0.
import { addDays } from "./dates";

export type CalendarView = "day" | "work_week" | "week" | "month";
export const VIEWS: readonly CalendarView[] = ["day", "work_week", "week", "month"];

const KEY = "cockpit:schedule-view";
/** What a person who has never chosen sees: the working days of the week, as a desktop calendar starts. */
export const DEFAULT_VIEW: CalendarView = "work_week";
const isView = (v: unknown): v is CalendarView => typeof v === "string" && (VIEWS as readonly string[]).includes(v);

/** The view remembered on this browser; the default when none is kept or storage can't be read. */
export function storedView(): CalendarView {
  try {
    const saved = window.localStorage.getItem(KEY);
    if (isView(saved)) return saved;
  } catch {
    // Storage can be blocked.
  }
  return DEFAULT_VIEW;
}

/** Remembers the view on this browser; when storage is blocked the pick lasts until the page is closed. */
export function rememberView(view: CalendarView): void {
  try {
    window.localStorage.setItem(KEY, view);
  } catch {
    // Storage can be blocked.
  }
}

const parts = (iso: string): [number, number, number] => {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return [y, m, d];
};

/** The weekday of a day, Monday as 0 through Sunday as 6. */
export function weekdayIndex(iso: string): number {
  const [y, m, d] = parts(iso);
  return (new Date(y, m - 1, d).getDay() + 6) % 7;
}

/** The first day of the week a day is in, for a week that starts on `startsOn` (Monday as 0). */
export function startOfWeek(iso: string, startsOn: number): string {
  return addDays(iso, -((weekdayIndex(iso) - startsOn + 7) % 7));
}

/** The first day of the month a day is in. */
export function startOfMonth(iso: string): string {
  const [y, m] = parts(iso);
  return `${y}-${String(m).padStart(2, "0")}-01`;
}

/** The day `n` months from a day, the same day of the month or the month's last day when it has no such day. */
export function addMonths(iso: string, n: number): string {
  const [y, m, d] = parts(iso);
  const target = new Date(y, m - 1 + n, 1);
  const last = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  return `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, "0")}-${String(Math.min(d, last)).padStart(2, "0")}`;
}

export interface Range {
  /** The first day to ask the server for, and how many days from it. */
  first: string;
  days: number;
  /** The days the view draws, in order: the week's working days for a work week, six weeks for a month. */
  shown: string[];
}

/** The days a view shows around the day the person is looking at. */
export function rangeOf(view: CalendarView, date: string, startsOn: number, workDays: readonly number[]): Range {
  if (view === "day") return { first: date, days: 1, shown: [date] };
  if (view === "month") {
    const first = startOfWeek(startOfMonth(date), startsOn);
    return { first, days: 42, shown: Array.from({ length: 42 }, (_, n) => addDays(first, n)) };
  }
  const first = startOfWeek(date, startsOn);
  const week = Array.from({ length: 7 }, (_, n) => addDays(first, n));
  return { first, days: 7, shown: view === "week" ? week : week.filter((d) => workDays.includes(weekdayIndex(d))) };
}

/** Where an arrow press `n` steps (negative: back) takes the day being looked at: a day, a week or a month, by the view. */
export function moveBy(view: CalendarView, date: string, n: number): string {
  return view === "day" ? addDays(date, n) : view === "month" ? addMonths(date, n) : addDays(date, 7 * n);
}

/** The minutes after midnight of a time written on the person's own clock ("...T09:30:00..."), or null when it has none. */
export function minutesOf(iso: string | null | undefined): number | null {
  const found = iso ? /T(\d{2}):(\d{2})/.exec(iso) : null;
  return found ? Number(found[1]) * 60 + Number(found[2]) : null;
}

/** The hour in a setting written as a time of day ("07:00"): rounded down for a start and up for an end. */
export function hourOf(setting: string, up = false): number {
  const [h, m] = setting.split(":").map(Number);
  return Math.min(24, Math.max(0, (h || 0) + (up && (m || 0) > 0 ? 1 : 0)));
}

/** How long, in minutes, an entry with no end is drawn: enough to read and press. */
export const SHORT = 30;

export interface Span {
  start: number;
  end: number;
}

/** The first and last hour the time grid shows: the configured hours, grown to hold any entry outside them. */
export function gridHours(spans: readonly Span[], startsAt: string, endsAt: string): { from: number; to: number } {
  let from = hourOf(startsAt);
  let to = Math.max(from + 1, hourOf(endsAt, true));
  for (const s of spans) {
    from = Math.min(from, Math.floor(s.start / 60));
    to = Math.max(to, Math.ceil(s.end / 60));
  }
  return { from: Math.max(0, from), to: Math.min(24, to) };
}

export interface Placed<T> extends Span {
  item: T;
  /** Which of `cols` side-by-side columns it takes. */
  col: number;
  cols: number;
}

/** Entries that overlap in time share the width of their day side by side. A run of entries that touch one another through
 * overlaps is one cluster; each entry takes the first column free of what it overlaps, and a cluster's columns are as many as
 * its widest overlap needs. */
export function placeOverlaps<T>(items: readonly { item: T; start: number; end: number }[]): Placed<T>[] {
  const sorted = [...items].sort((a, b) => a.start - b.start || b.end - a.end);
  const placed: Placed<T>[] = [];
  let cluster: Placed<T>[] = [];
  let reach = -1;
  const close = () => {
    const cols = Math.max(1, ...cluster.map((p) => p.col + 1));
    for (const p of cluster) p.cols = cols;
    cluster = [];
  };
  for (const entry of sorted) {
    if (cluster.length && entry.start >= reach) close();
    const taken = new Set(cluster.filter((p) => p.end > entry.start).map((p) => p.col));
    let col = 0;
    while (taken.has(col)) col++;
    const one: Placed<T> = { ...entry, col, cols: 1 };
    cluster.push(one);
    placed.push(one);
    reach = Math.max(reach, entry.end);
  }
  close();
  return placed;
}
