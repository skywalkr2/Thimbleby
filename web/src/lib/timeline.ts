// The Timeline's arithmetic (design 7.7, "Timeline"): the ranges, which one a person last chose, where each item sits on its
// lane in pixels, and how items that would touch take separate rows. Plain functions of days and numbers, so the screen only
// draws. Days are yyyy-mm-dd text on the person's own calendar.
import { addDays } from "./dates";

export type TimelineRange = "two_weeks" | "ten_weeks" | "quarter";
export const RANGES: readonly TimelineRange[] = ["two_weeks", "ten_weeks", "quarter"];
/** How many days each range is: a whole number of weeks (a quarter is thirteen). */
export const RANGE_DAYS: Record<TimelineRange, number> = { two_weeks: 14, ten_weeks: 70, quarter: 91 };

const KEY = "cockpit:schedule-timeline-range";
const isRange = (v: unknown): v is TimelineRange => typeof v === "string" && (RANGES as readonly string[]).includes(v);

/** The range remembered on this browser, or null when none was ever chosen (the workspace's setting then decides). */
export function storedRange(): TimelineRange | null {
  try {
    const saved = window.localStorage.getItem(KEY);
    if (isRange(saved)) return saved;
  } catch {
    // Storage can be blocked.
  }
  return null;
}

/** Remembers the range on this browser; when storage is blocked the pick lasts until the page is closed. */
export function rememberRange(range: TimelineRange): void {
  try {
    window.localStorage.setItem(KEY, range);
  } catch {
    // Storage can be blocked.
  }
}

/** The width, in pixels, of the column that names each lane. */
export const LABEL_W = 176;
/** The size of a button on a lane: the least a finger or a pointer can be asked to hit (WCAG 2.2, 2.5.8). */
export const TOUCH = 24;
/** The least room, in pixels, one day may have on a lane. With less, the timeline is a list by week instead: nothing scrolls
 * sideways. Items closer than a button are put on rows of their own, so a day this narrow still has room for them. */
export const PITCH_MIN = 10;

/** Whole days from one day to a later one (negative when it is earlier). */
export function daysBetween(from: string, to: string): number {
  const at = (iso: string) => {
    const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((at(to) - at(from)) / 86_400_000);
}

/** Whether a timeline of `days` days fits a frame `width` pixels wide with room for the lanes' names; a width not yet known
 * counts as enough. */
export function fitsTimeline(width: number | null, days: number): boolean {
  return width === null || width - LABEL_W >= days * PITCH_MIN;
}

export interface Placed<T> {
  item: T;
  /** Pixels from the left of the lane's track and from the top of its first row. */
  x: number;
  w: number;
  row: number;
}

/** Puts the items of one lane on rows. A thing on one day is a button centred on its day; one over several days is a bar from
 * its first day's start to its last day's end. An item takes the first row where nothing is within its reach, so nothing
 * overlaps and a lane grows by rows only as busy as it is. */
export function packLane<T extends { start: string; end: string }>(items: readonly T[], first: string, days: number, pitch: number): { placed: Placed<T>[]; rows: number } {
  const total = days * pitch;
  const wanted = items.map((item) => {
    const from = Math.min(days - 1, Math.max(0, daysBetween(first, item.start)));
    const to = Math.min(days - 1, Math.max(from, daysBetween(first, item.end)));
    const span = (to - from + 1) * pitch;
    const w = Math.min(total, Math.max(TOUCH, span));
    const x = Math.min(total - w, Math.max(0, span >= TOUCH ? from * pitch : from * pitch + pitch / 2 - TOUCH / 2));
    return { item, x, w };
  });
  wanted.sort((a, b) => a.x - b.x || b.w - a.w);
  const ends: number[] = [];
  const placed = wanted.map((p) => {
    let row = ends.findIndex((end) => end <= p.x);
    if (row < 0) row = ends.length;
    ends[row] = p.x + p.w;
    return { ...p, row };
  });
  return { placed, rows: Math.max(1, ends.length) };
}

export interface Run {
  /** The first and last day of a run of days off of one kind, and the words that say why. */
  from: string;
  to: string;
  kind: string;
  reason: string;
}

/** Days off as runs: consecutive days of one kind with the same reason are one stretch. */
export function runsOf(days: readonly { day: string; kind: string; reason: string }[]): Run[] {
  const sorted = [...days].sort((a, b) => a.kind.localeCompare(b.kind) || a.day.localeCompare(b.day));
  const runs: Run[] = [];
  for (const d of sorted) {
    const last = runs[runs.length - 1];
    if (last && last.kind === d.kind && last.reason === d.reason && addDays(last.to, 1) === d.day) last.to = d.day;
    else runs.push({ from: d.day, to: d.day, kind: d.kind, reason: d.reason });
  }
  return runs;
}

/** The week each day belongs to, as the first day of the weeks the range is cut into, `first` and every seventh day after. */
export function weekStarts(first: string, days: number): string[] {
  return Array.from({ length: Math.ceil(days / 7) }, (_, n) => addDays(first, n * 7));
}
