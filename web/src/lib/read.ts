// The one place text a person reads is made readable. Whatever a record, an input or the assistant wrote is shown as words:
// a date or a moment written as numbers is a day (and a time on the person's own clock), and a text that is only data (a
// list or a map the assistant wrote instead of a sentence) is never shown as it is. The wording sheet's own `{name}` values
// pass through here too (`format` in wording.ts), so a label built from a title is as plain as the title. Display only:
// the stored text is never changed, and an edit box keeps the words as they were written.
import { day, wallTime, whenText } from "./dates";

/** A date, or a date with a time of day, written as year-month-day: "2026-11-02", "2026-10-28T15:07:36Z", "2026-10-29 10:00". */
const ISO = /\b(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::\d{2}(?:\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?(?![\d-])/g;

/** Every date and moment in a text written as words: "Mon, Nov 2", "Wed, Oct 28, 8:07 AM". A time with a zone is moved to the
 * person's own clock; one without is already on it. A date that isn't a real day is left as written. */
export function plainDates(text: string): string {
  if (!/\d{4}-\d{2}-\d{2}/.test(text)) return text;
  return text.replace(ISO, (found, y: string, m: string, d: string, hh?: string, mm?: string, zone?: string) => {
    const real = new Date(Number(y), Number(m) - 1, Number(d));
    if (real.getMonth() !== Number(m) - 1 || real.getDate() !== Number(d)) return found;
    const date = `${y}-${m}-${d}`;
    if (hh === undefined) return day(date);
    if (zone) return whenText(found.replace(" ", "T")) || day(date);
    return `${day(date)}, ${wallTime(`${date}T${hh}:${mm}`)}`;
  });
}

/** Whether a text is only data: a JSON list or map (whole, or cut short), with nothing a person wrote in front of it. */
export function isData(text: string): boolean {
  const trimmed = text.trim();
  if (!/^[[{]/.test(trimmed)) return false;
  try {
    const parsed: unknown = JSON.parse(trimmed);
    return typeof parsed === "object" && parsed !== null;
  } catch {
    // A map or list cut short, or flattened by the screen's own rendering, is data as well: it opens on a quoted key.
    return /^[[{]\s*[[{]?\s*"[\w ]+"\s*:/.test(trimmed);
  }
}

/** A text for the screen: its dates as words. Text that is only data is nothing (`""`): the caller says what it would
 * have said instead. */
export function plain(text: string | null | undefined): string {
  if (!text) return "";
  return isData(text) ? "" : plainDates(text);
}
