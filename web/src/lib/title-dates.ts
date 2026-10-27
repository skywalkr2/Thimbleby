// A to-do's title as the screen shows it: a date written out in the title as year-month-day is not shown raw. When the row's
// own meta line already says the due day, the title drops the phrase; otherwise the date reads as a day ("by Mon, Nov 2").
// This is a display rule only: the stored text is never changed.
import { day } from "./dates";

const ISO = /\b\d{4}-\d{2}-\d{2}\b/;
const LEAD = /\s*\b(?:by|on|before|until)\s*$/i;
const ONLY_END = /^[\s.!?]*$/;

/** The text of a title for the screen. `due` is the due day the row's meta line already shows, when it shows one. */
export function plainTitle(text: string, due?: string | null): string {
  const found = ISO.exec(text);
  if (!found) return text;
  const iso = found[0];
  const before = text.slice(0, found.index);
  const after = text.slice(found.index + iso.length);
  if (due && due.slice(0, 10) === iso && ONLY_END.test(after)) {
    const kept = before.replace(LEAD, "").trimEnd();
    if (kept) return `${kept}${after.trim()}`;
  }
  return `${before}${day(iso)}${after}`;
}
