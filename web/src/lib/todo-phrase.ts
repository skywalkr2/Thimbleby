// A date said at the end of a to-do's title ("Send the headcount by Friday", "Book the room on the 12th", "Call Sam tomorrow"):
// where the phrase starts, found by rules from the same words the date boxes know (the locale's weekday and month names and
// the sheet's relative words). This only finds the phrase; what day it means is the server's one reader of due dates, which
// the add row asks, so the two never disagree. A title with no such ending is left whole, and a phrase must leave a title behind.
import { monthNames, weekdayNames } from "./date-input";
import { useWords } from "./wording";

/** The words around a date that the sheet gives, as lists. */
export interface PhraseWords {
  today: string;
  tomorrow: string;
  /** Words that may come before the date: "by", "on", "before", "until", "due by", "due". */
  lead: string[];
  next: string;
  week: string;
  the: string;
  /** The endings of a day of the month: "st", "nd", "rd", "th". */
  ordinals: string[];
}

export interface SplitTitle {
  /** The to-do's words without the date. */
  title: string;
  /** The date as typed, with its lead word, for the server to read. */
  phrase: string;
}

const escape = (word: string) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const any = (words: string[]) => words.filter(Boolean).map(escape).sort((a, b) => b.length - a.length).join("|");

/** The date the title ends with and the title before it, or null when it ends with none or nothing would be left. */
export function splitDatePhrase(text: string, words: PhraseWords, locale?: string): SplitTitle | null {
  const typed = text.trim();
  if (!typed) return null;
  const lead = any(words.lead);
  const ordinal = `(?:${any(words.ordinals)})?`;
  const longDays = any(weekdayNames(locale).map((w) => w.names[0]));
  const shortDays = any(weekdayNames(locale).flatMap((w) => w.names.slice(1)));
  const months = any(monthNames(locale).flatMap((m) => m.names));
  const day = `\\d{1,2}${ordinal}`;
  const year = "(?:,?\\s+\\d{4})?";
  const plain = [
    any([words.today, words.tomorrow]),
    `(?:${escape(words.next)}\\s+)?(?:${longDays})`,
    `${escape(words.next)}\\s+${escape(words.week)}`,
    `(?:${escape(words.the)}\\s+)?\\d{1,2}(?:${any(words.ordinals)})`,
    `(?:${months})\\.?\\s+${day}${year}`,
    `${day}\\s+(?:${months})\\.?${year}`,
    "\\d{4}-\\d{2}-\\d{2}",
  ].join("|");
  // A short weekday name ("Wed") is also a word on its own, so it counts only after a lead word.
  const forms = [
    new RegExp(`(?:^|\\s)((?:(?:${lead})\\s+)?(?:${plain}))[\\s.!?,;]*$`, "iu"),
    new RegExp(`(?:^|\\s)((?:${lead})\\s+(?:${shortDays}))[\\s.!?,;]*$`, "iu"),
  ];
  for (const form of forms) {
    const found = form.exec(typed);
    if (!found) continue;
    const start = found.index + found[0].length - found[0].trimStart().length;
    const title = typed.slice(0, start).replace(/[\s,;:–—-]+$/u, "").trim();
    if (title) return { title, phrase: found[1].trim() };
  }
  return null;
}

/** The words around a date, from the wording sheet (and any override the workspace makes there). */
export function usePhraseWords(): PhraseWords {
  const { t } = useWords();
  const list = (key: string) => t(key).split("|").map((w) => w.trim()).filter(Boolean);
  return {
    today: t("datefield.today"),
    tomorrow: t("datefield.tomorrow"),
    lead: list("addtodo.phrase.lead"),
    next: t("addtodo.phrase.next"),
    week: t("addtodo.phrase.week"),
    the: t("addtodo.phrase.the"),
    ordinals: list("addtodo.phrase.ordinals"),
  };
}
