// Dates and ages in the reader's locale. Wording around them comes from the sheet.
//
// A moment (an instant: when something ran, was received, was sent) is written on the person's own clock, the time zone
// they set, whatever the computer showing it is set to (`setClockZone`). A calendar day and a time of day the server wrote
// on that clock (`wallTime`) are written as they are, since they are already the person's.
const pad = (n: number) => String(n).padStart(2, "0");
let clockZone: string | undefined;

/** The time zone moments are written in: the person's own (an IANA name). Nothing, or a name the browser doesn't know,
 * leaves them on the computer's clock. */
export function setClockZone(zone: string | null | undefined): void {
  try {
    if (zone) new Intl.DateTimeFormat(undefined, { timeZone: zone });
    clockZone = zone || undefined;
  } catch {
    clockZone = undefined;
  }
}

/** A formatter for moments, on the person's clock. */
const onClock = (options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(undefined, { ...options, timeZone: clockZone });

const dayFormat = new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric" });
/** Whether a moment is at or past the given hour of the person's day, on the person's clock. */
export function isAfternoon(when: Date, fromHour: number): boolean {
  return onTheClock(when).minutes >= fromHour * 60;
}

/** A time of day written from numbers (a wall time), with no zone to move it by. */
const timeFormat = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });

export function day(iso: string | null | undefined): string {
  if (!iso) return "";
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return dayFormat.format(new Date(y, m - 1, d));
}

const monthDayFormat = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });

/** The day of a date, or of a time as the server wrote it on the person's own clock, as a month and a day: "Oct 14". */
export function monthDay(iso: string | null | undefined): string {
  if (!iso) return "";
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return monthDayFormat.format(new Date(y, m - 1, d));
}

const longDayFormat = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" });

/** A date in full words, "Tuesday, October 13", for a heading. */
export function longDay(when: Date): string {
  return longDayFormat.format(when);
}

/** A moment as its day and time on the person's clock: "Wed, Oct 28, 7:37 AM". */
export function dayAndTime(iso: string): string {
  const when = new Date(iso);
  return `${onClock({ weekday: "short", month: "short", day: "numeric" }).format(when)}, ${time(when)}`;
}

/** A moment's time of day on the person's clock: "7:37 AM". */
export function time(when: Date): string {
  return onClock({ hour: "numeric", minute: "2-digit" }).format(when);
}

/** The numbers of a moment on the person's clock. */
function clockParts(when: Date): { year: number; month: number; day: number; hour: number; minute: number } {
  const parts = Object.fromEntries(
    onClock({ year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", hourCycle: "h23" })
      .formatToParts(when)
      .map((p) => [p.type, Number(p.value)]),
  );
  return { year: parts.year, month: parts.month, day: parts.day, hour: parts.hour % 24, minute: parts.minute };
}

/** The pieces of a moment on the person's clock: its date as yyyy-mm-dd and the minutes since midnight. */
export function onTheClock(when: Date): { date: string; minutes: number } {
  const c = clockParts(when);
  return { date: `${String(c.year).padStart(4, "0")}-${pad(c.month)}-${pad(c.day)}`, minutes: c.hour * 60 + c.minute };
}

/** A moment as the text a `datetime-local` box takes, on the person's clock. */
export function inputOn(when: Date): string {
  const c = onTheClock(when);
  return `${c.date}T${pad(Math.floor(c.minutes / 60))}:${pad(c.minutes % 60)}`;
}

/** The moment a `datetime-local` box's text is on the person's clock (the other way from `inputOn`), or none when it isn't one. */
export function momentOf(local: string): Date | null {
  const found = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(local);
  if (!found) return null;
  const [y, m, d, h, mi] = found.slice(1).map(Number);
  const wanted = Date.UTC(y, m - 1, d, h, mi);
  let guess = wanted;
  // Two passes settle it, even across a change of clocks: move by how far the clock shown is from the one wanted.
  for (let pass = 0; pass < 2; pass += 1) {
    const c = clockParts(new Date(guess));
    guess += wanted - Date.UTC(c.year, c.month - 1, c.day, c.hour, c.minute);
  }
  return new Date(guess);
}

/** The date of a moment on the person's clock, as yyyy-mm-dd: what "today" is for them. */
export function todayOn(when: Date): string {
  return onTheClock(when).date;
}

/** A time the server wrote as an ISO string, day and time in the reader's locale; empty if it can't be read. */
export function whenText(iso: string | null | undefined): string {
  if (!iso) return "";
  const parsed = new Date(iso.replace(" ", "T"));
  return Number.isNaN(parsed.getTime()) ? "" : dayAndTime(parsed.toISOString());
}

const weekdayFormat = new Intl.DateTimeFormat(undefined, { weekday: "short" });

/** The date on this computer's clock, as yyyy-mm-dd. */
export function localDate(when: Date): string {
  return `${when.getFullYear()}-${pad(when.getMonth() + 1)}-${pad(when.getDate())}`;
}

/** The coming Monday after a date, as yyyy-mm-dd: on a Monday it is the Monday a week on, never the day itself. */
export function nextMonday(from: Date): string {
  const ahead = (8 - from.getDay()) % 7 || 7;
  return localDate(new Date(from.getFullYear(), from.getMonth(), from.getDate() + ahead));
}

/** How a past day is said in "ready since Tue": the weekday for the last six days, else the month and day ("Oct 6"); empty
 * for today or a day not yet come, since a batch ready today is not a stale one. */
export function sinceDay(iso: string | null | undefined, today: Date): string {
  if (!iso) return "";
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  const then = new Date(y, m - 1, d);
  const ago = Math.round((new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime() - then.getTime()) / 86_400_000);
  if (ago <= 0) return "";
  return ago < 7 ? weekdayFormat.format(then) : monthDay(iso);
}

/** The date n days after a yyyy-mm-dd date, as yyyy-mm-dd. */
export function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return localDate(new Date(y, m - 1, d + n));
}

/** The time of day exactly as the server wrote it (the person's own clock), in the reader's time format. */
export function wallTime(iso: string): string {
  const found = /T(\d{2}):(\d{2})/.exec(iso);
  return found ? timeFormat.format(new Date(2000, 0, 1, Number(found[1]), Number(found[2]))) : "";
}

/** A time as the server wrote it, on the person's own clock: the time alone today, otherwise the day and the time. */
export function wallWhen(iso: string): string {
  const clock = wallTime(iso);
  return iso.slice(0, 10) === localDate(new Date()) ? clock : `${day(iso)}, ${clock}`;
}

/** The weekday of a yyyy-mm-dd date, short, in the reader's language. */
export function weekday(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return weekdayFormat.format(new Date(y, m - 1, d));
}

const fullDayFormat = new Intl.DateTimeFormat(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" });
const monthDayLongFormat = new Intl.DateTimeFormat(undefined, { month: "long", day: "numeric" });
const monthDayYearFormat = new Intl.DateTimeFormat(undefined, { month: "long", day: "numeric", year: "numeric" });
const monthYearFormat = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" });

const dateOf = (iso: string): Date => {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
};

/** A day in full, "Tuesday, October 27, 2026", for the heading of a one-day view. */
export function fullDay(iso: string): string {
  return fullDayFormat.format(dateOf(iso));
}

/** A day as its month and day in full, "October 27", for the start of a range. */
export function monthDayLong(iso: string): string {
  return monthDayLongFormat.format(dateOf(iso));
}

/** A day as its month, day and year in full, "November 1, 2026", for the end of a range. */
export function monthDayYear(iso: string): string {
  return monthDayYearFormat.format(dateOf(iso));
}

/** The month of a day with its year, "October 2026", for the heading of a month. */
export function monthYear(iso: string): string {
  return monthYearFormat.format(dateOf(iso));
}

/** The day of the month, as a number, for a cell of a month. */
export function dayOfMonth(iso: string): number {
  return dateOf(iso).getDate();
}
