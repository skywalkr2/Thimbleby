// The calendar page's arithmetic (design 7.7): which days each view shows, how far an arrow moves, where an entry sits on
// the time grid and how entries that overlap share a column. Plain functions of dates and numbers, so the screen only draws.
// Days are yyyy-mm-dd text on the person's own calendar; weekdays count from Monday as 0.
import { addDays } from "./dates";

export type CalendarView = "day" | "work_week" | "week" | "month" | "timeline";
export const VIEWS: readonly CalendarView[] = ["day", "work_week", "week", "month", "timeline"];

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
  // The timeline has its own answer, which says its days.
  if (view === "day" || view === "timeline") return { first: date, days: 1, shown: [date] };
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

/** An hour on the grid's edge in its short form: "10:00 AM" is "10 AM", so the label fits the gutter with room around it. */
export const hourLabel = (time: string): string => time.replace(/:00(?=\s|$)/, "");

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

/** How two entries clash, as the engine says it (the same rules as Today's clash lines): they overlap, or they are in different
 * places with too little time between them. `minutes` is how long they overlap, or how many minutes short the travel time is;
 * `travel` is the travel time asked for between two places. */
export interface ClashLink {
  kind: "overlap" | "travel";
  minutes: number;
  travel: number;
}

export interface ClashGroup<T> extends Span {
  /** The entries that clash with one another, by when they begin. */
  items: T[];
  /** The longest overlap, in minutes, of two of them; zero when they clash only for want of travel time. */
  overlap: number;
  /** For a group that clashes only for want of travel time: the minutes asked for between the places; otherwise zero. */
  travel: number;
}

/** The entries the engine says clash, each run of linked entries one group of two or more; an entry linked to none is in no group.
 * Whether two clash is `linked`'s answer, never the drawing's: an overlap on the screen is not a clash unless the engine named
 * it. The group spans from its first start to its last end. */
export function clashGroups<T>(items: readonly { item: T; start: number; end: number }[], linked: (a: T, b: T) => ClashLink | undefined): ClashGroup<T>[] {
  const sorted = [...items].sort((a, b) => a.start - b.start || b.end - a.end);
  const parent = sorted.map((_, n) => n);
  const root = (n: number): number => (parent[n] === n ? n : (parent[n] = root(parent[n])));
  const links = new Map<number, ClashLink[]>();
  for (const [n, a] of sorted.entries())
    for (const [m, b] of sorted.entries()) {
      if (m <= n) continue;
      const link = linked(a.item, b.item) ?? linked(b.item, a.item);
      if (!link) continue;
      parent[root(m)] = root(n);
      links.set(n, [...(links.get(n) ?? []), link]);
    }
  const groups = new Map<number, { members: typeof sorted; links: ClashLink[] }>();
  for (const [n, entry] of sorted.entries()) {
    const group = groups.get(root(n)) ?? { members: [], links: [] };
    group.members.push(entry);
    group.links.push(...(links.get(n) ?? []));
    groups.set(root(n), group);
  }
  return [...groups.values()]
    .filter((g) => g.members.length > 1)
    .map((g) => {
      const overlaps = g.links.filter((l) => l.kind === "overlap");
      return {
        items: g.members.map((m) => m.item),
        start: g.members[0].start,
        end: Math.max(...g.members.map((m) => m.end)),
        overlap: Math.max(0, ...overlaps.map((l) => l.minutes)),
        travel: overlaps.length ? 0 : Math.max(0, ...g.links.map((l) => l.travel)),
      };
    });
}

const ADDRESS = /([^\s@,]+)@([^\s@,]+\.[^\s@,]+)/;

/** Calendar names with the account's address shortened to the part before the "@" when every address among them is on one
 * domain, so the domain is not said again and again; names with no address, or addresses on different domains, are left as
 * they are (the address is then all that tells them apart). */
export function shortCalendarNames(names: readonly string[]): string[] {
  const domains = new Set(names.map((n) => ADDRESS.exec(n)?.[2].toLowerCase()).filter((d): d is string => !!d));
  if (domains.size !== 1) return [...names];
  return names.map((n) => n.replace(ADDRESS, "$1"));
}

/** Entries that are the same thing said more than once (the key says what "the same" is) folded into one with how many there
 * were, in the order of each one's first appearance. */
export function foldIdentical<T>(items: readonly T[], keyOf: (item: T) => string): { item: T; count: number }[] {
  const folded = new Map<string, { item: T; count: number }>();
  for (const item of items) {
    const key = keyOf(item);
    const found = folded.get(key);
    if (found) found.count += 1;
    else folded.set(key, { item, count: 1 });
  }
  return [...folded.values()];
}
