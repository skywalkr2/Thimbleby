// Reading the dates and times a person types into a date or time box (design 7.12), in their locale: the order of day, month and
// year the locale writes, month names in its language, and the relative words the wording sheet gives ("today", "tomorrow").
// Every reader answers the ISO text the callers hold ("yyyy-mm-dd", "hh:mm") or null when the text is no date or time, and
// never guesses: a text that can mean two dates in the locale's own order means the one the locale's order says.
const pad = (n: number) => String(n).padStart(2, "0");

/** A date as yyyy-mm-dd, or null when the numbers are not a real day (no 30 February). */
function isoOf(year: number, month: number, day: number): string | null {
  const when = new Date(year, month - 1, day);
  if (when.getFullYear() !== year || when.getMonth() !== month - 1 || when.getDate() !== day) return null;
  return `${String(year).padStart(4, "0")}-${pad(month)}-${pad(day)}`;
}

const dateOf = (iso: string): Date => {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
};

/** The order the locale writes a date in: "mdy", "dmy" or "ymd". */
export function dateOrder(locale?: string): "mdy" | "dmy" | "ymd" {
  const parts = new Intl.DateTimeFormat(locale, { year: "numeric", month: "numeric", day: "numeric" }).formatToParts(new Date(2006, 10, 22));
  const letters = parts.flatMap((p) => (p.type === "month" ? ["m"] : p.type === "day" ? ["d"] : p.type === "year" ? ["y"] : [])).join("");
  return letters === "dmy" || letters === "ymd" ? letters : "mdy";
}

/** The first day of the week the locale uses, Monday as 0 through Sunday as 6; Monday where the browser doesn't say. */
export function localeWeekStart(locale?: string): number {
  try {
    const l = new Intl.Locale(locale ?? navigator.language) as Intl.Locale & { getWeekInfo?: () => { firstDay: number }; weekInfo?: { firstDay: number } };
    const info = l.getWeekInfo?.() ?? l.weekInfo;
    if (info) return (info.firstDay + 6) % 7;
  } catch {
    // an unknown locale: the default below
  }
  return 0;
}

export const fold = (text: string): string => text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

/** The names of the twelve months in the locale, long and short, folded for matching ("sept" and "Sep." both read). */
export function monthNames(locale?: string): { month: number; names: string[] }[] {
  const long = new Intl.DateTimeFormat(locale, { month: "long" });
  const short = new Intl.DateTimeFormat(locale, { month: "short" });
  return Array.from({ length: 12 }, (_, i) => {
    const when = new Date(2006, i, 15);
    return { month: i + 1, names: [fold(long.format(when)), fold(short.format(when)).replace(/\.$/, "")] };
  });
}

export function weekdayNames(locale?: string): { day: number; names: string[] }[] {
  const long = new Intl.DateTimeFormat(locale, { weekday: "long" });
  const short = new Intl.DateTimeFormat(locale, { weekday: "short" });
  // The first of these days is a Monday.
  return Array.from({ length: 7 }, (_, i) => {
    const when = new Date(2006, 0, 2 + i);
    return { day: i, names: [fold(long.format(when)), fold(short.format(when)).replace(/\.$/, "")] };
  });
}

/** What the sheet calls the relative days. */
export interface RelativeWords {
  today: string;
  tomorrow: string;
  yesterday: string;
}

/** A date moved by a number of days, as yyyy-mm-dd. */
export function addDay(iso: string, n: number): string {
  const d = dateOf(iso);
  const moved = new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  return `${String(moved.getFullYear()).padStart(4, "0")}-${pad(moved.getMonth() + 1)}-${pad(moved.getDate())}`;
}

/**
 * The day a typed text means, as yyyy-mm-dd, or null. `today` (yyyy-mm-dd) is what "today", a weekday and a missing year
 * are read against. Empty text is no day: the caller clears the field.
 */
export function parseDay(text: string, options: { today: string; locale?: string; words?: RelativeWords }): string | null {
  const raw = text.trim();
  if (!raw) return null;
  const folded = fold(raw);
  const { today, locale, words } = options;
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(raw);
  if (iso) return isoOf(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  if (words) {
    if (folded === fold(words.today)) return today;
    if (folded === fold(words.tomorrow)) return addDay(today, 1);
    if (folded === fold(words.yesterday)) return addDay(today, -1);
  }
  const todayDate = dateOf(today);
  const names = weekdayNames(locale);
  const bare = folded.replace(/[.,]/g, "");
  const weekday = names.find((w) => w.names.includes(bare));
  if (weekday) {
    // The coming one: a weekday is never today itself.
    const current = (todayDate.getDay() + 6) % 7;
    const ahead = (weekday.day - current + 7) % 7 || 7;
    return addDay(today, ahead);
  }
  // Words and numbers, in the order typed: a weekday name is dropped ("Wed, Oct 28"), a month name is a month.
  const tokens = folded.replace(/(\d)(st|nd|rd|th)\b/g, "$1").split(/[\s,./-]+/).filter(Boolean);
  const months = monthNames(locale);
  let month: number | null = null;
  const numbers: string[] = [];
  for (const token of tokens) {
    if (/^\d+$/.test(token)) numbers.push(token);
    else if (names.some((w) => w.names.includes(token.replace(/\.$/, "")))) continue;
    else {
      const found = months.find((m) => m.names.some((n) => n === token.replace(/\.$/, "") || (token.length >= 3 && n.startsWith(token.replace(/\.$/, "")))));
      if (!found || month !== null) return null;
      month = found.month;
    }
  }
  const thisYear = todayDate.getFullYear();
  const yearOf = (digits: string): number | null => (digits.length === 4 ? Number(digits) : digits.length === 2 ? 2000 + Number(digits) : null);
  if (month !== null) {
    // "Oct 28", "28 Oct", "Oct 28 2026", "28 Oct 2026", "2026 Oct 28".
    if (numbers.length === 1) {
      const n = numbers[0];
      return n.length === 4 ? null : isoOf(thisYear, month, Number(n));
    }
    if (numbers.length === 2) {
      const [a, b] = numbers;
      if (a.length === 4) return isoOf(Number(a), month, Number(b));
      const year = yearOf(b);
      return year === null ? null : isoOf(year, month, Number(a));
    }
    return null;
  }
  if (numbers.length < 2 || numbers.length > 3 || tokens.length !== numbers.length) return null;
  const order = dateOrder(locale);
  if (numbers[0].length === 4) {
    // The year first, whatever the locale (yyyy/mm/dd).
    return numbers.length === 3 ? isoOf(Number(numbers[0]), Number(numbers[1]), Number(numbers[2])) : null;
  }
  const first = Number(numbers[0]);
  const second = Number(numbers[1]);
  const year = numbers.length === 3 ? yearOf(numbers[2]) : thisYear;
  if (year === null) return null;
  // The locale's own order first; the other one only when the locale's makes no day (a month of 28).
  const monthFirst = order !== "dmy";
  const tried = monthFirst ? isoOf(year, first, second) : isoOf(year, second, first);
  if (tried) return tried;
  return monthFirst ? isoOf(year, second, first) : isoOf(year, first, second);
}

/**
 * The time of day a typed text means, as HH:MM on the 24-hour clock, or null: "9", "9:30", "930", "0930", "9.30", "9pm",
 * "9:30 pm", "9:30 PM", "21:30". With no am or pm the text is on the 24-hour clock.
 */
export function parseTime(text: string): string | null {
  const raw = text.trim().toLowerCase().replace(/\./g, ":").replace(/\s+/g, " ");
  const found = /^(\d{1,2})(?::?(\d{2}))?\s?(a|p|am|pm|a:m|p:m)?:?$/.exec(raw.replace(/:$/, ""));
  if (!found) return null;
  let hour = Number(found[1]);
  const minute = found[2] ? Number(found[2]) : 0;
  const mark = found[3]?.[0];
  if (minute > 59) return null;
  if (mark) {
    if (hour < 1 || hour > 12) return null;
    hour = (hour % 12) + (mark === "p" ? 12 : 0);
  } else if (hour > 23) return null;
  return `${pad(hour)}:${pad(minute)}`;
}

/** The times of a day from a first to a last at a step in minutes, as HH:MM. */
export function timesOfDay(stepMinutes: number, from = 0, to = 24 * 60 - 1): string[] {
  const step = Math.max(1, Math.round(stepMinutes));
  const out: string[] = [];
  for (let m = from; m <= to; m += step) out.push(`${pad(Math.floor(m / 60))}:${pad(m % 60)}`);
  return out;
}
