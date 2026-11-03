// A to-do's title as the screen shows it: a date written out in the title as year-month-day is not shown raw. When the row's
// own meta line already says the due day, the title drops the phrase; otherwise the date reads as a day ("by Mon, Nov 2").
// This is a display rule only: the stored text is never changed.
import { day } from "./dates";
import { isData, plainDates } from "./read";

const ISO = /\b\d{4}-\d{2}-\d{2}\b/;
const LEAD = /\s*\b(?:by|on|before|until)\s*$/i;
const ONLY_END = /^[\s.!?]*$/;

/** The text of a title for the screen. `due` is the due day the row's meta line already shows, when it shows one. */
export function plainTitle(text: string, due?: string | null): string {
  // A title that is only data (a list or a map written where words belong) is no title: nothing is shown in its place.
  if (isData(text)) return "";
  const found = ISO.exec(text);
  if (!found) return text;
  const iso = found[0];
  const before = text.slice(0, found.index);
  const after = text.slice(found.index + iso.length);
  if (due && due.slice(0, 10) === iso && ONLY_END.test(after)) {
    const kept = before.replace(LEAD, "").trimEnd();
    if (kept) return plainDates(`${kept}${after.trim()}`);
  }
  return `${plainDates(before)}${day(iso)}${plainDates(after)}`;
}

// How many words a title holds before it is cut (`ui.title_words`); set from the runtime configuration when the app starts.
let titleWords = 12;

export function setTitleWords(words: number | null | undefined): void {
  if (words && words > 0) titleWords = Math.floor(words);
}

/** Punctuation that was doubled where words were joined: a full stop before a comma, or two stops in a row. */
function tidy(text: string): string {
  return text
    .replace(/([.!?])\s*([,;:])/g, "$2")
    .replace(/\.{2,}(?!\.)/g, (found) => (found.length === 2 ? "." : found))
    .replace(/([,;:])\1+/g, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** A title for a row (design 7.7, "Titles are short"): a to-do's words as `plainTitle` writes them, then the first sentence
 * when it fits, else the first words cut at a word with an ellipsis, never in the middle of a word. A date the row's own meta
 * already says (`due`) is left out of the words, so a day is said once. The stored text is never changed. */
export function shortTitle(text: string, due?: string | null): string {
  let whole = tidy(plainTitle(text, due));
  const count = (s: string) => s.split(/\s+/).filter(Boolean).length;
  // A run of letters with no space in it (an address, a pasted code) counts for its length, not as one word.
  const maxChars = titleWords * 12;
  if (whole.length > maxChars && count(whole) <= titleWords) {
    return `${whole.slice(0, maxChars).replace(/\s+\S*$/, (tail) => (tail.length < 20 ? "" : tail)).replace(/[\s.,;:!?-]+$/, "")}…`;
  }
  if (count(whole) <= titleWords) return whole;
  whole = whole.length > maxChars * 3 ? whole.slice(0, maxChars * 3) : whole;
  // The first sentence, when it stands on its own within the limit.
  const first = /^.+?(?<!\b[A-Z])[.!?](?=\s+[A-Z“"'(]|$)/.exec(whole)?.[0];
  if (first && count(first) <= titleWords && count(first) >= 2) return first;
  let cut = whole.split(/\s+/).slice(0, titleWords).join(" ");
  if (cut.length > maxChars) cut = cut.slice(0, maxChars);
  return `${cut.replace(/[\s.,;:!?-]+$/, "")}…`;
}
