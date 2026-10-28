// One entry of the calendar page (design 7.7): the button that opens its details beside the calendar, and the words that
// say what it is, when it is and where it comes from. The calendar an entry comes from is always a word (in the button's
// name for a screen reader), with the calendar's color as a small mark beside it when one is set, so nothing is told apart by
// color alone; the app's own entries have a dashed edge as well as their words.
import type { S } from "../lib/api";
import { day, wallTime } from "../lib/dates";
import { deliveryStatusWord } from "../lib/deliveries";
import { eventPageView, recordView, viewHref } from "../lib/views";
import type { useWords } from "../lib/wording";
import { Pill } from "../ui/Pill";
import styles from "./Schedule.module.css";

export type Entry = S["ScheduleEntryView"];
export type T = ReturnType<typeof useWords>["t"];

/** What the screen knows about the calendars: each one's name and color mark, by the id of its source. */
export interface Calendars {
  name: (id: string) => string | undefined;
  color: (id: string) => string | undefined;
}

/** Which entry, on which day (an entry that goes on over several days is one on each). */
export function entryKey(entry: Entry, date: string | null): string {
  return [entry.kind, entry.snapshot, date ?? "", entry.begins ?? ""].join("|");
}

/** The page of an entry in the app: a to-do's, the app's own entry's, the entry kept for a connected event, or, for an event
 * the app keeps no entry for, a read-only page of what its calendar says. */
export function entryHref(entry: Entry): string {
  if (entry.kind === "due" && entry.action) return viewHref(recordView("action", entry.action));
  if (entry.own) return viewHref(recordView("event", entry.snapshot));
  if (entry.entry) return viewHref(recordView("event", entry.entry));
  return viewHref(eventPageView(entry.snapshot, entry.start));
}

/** What the entry is called on the screen: a due date says so. */
export function entryTitle(entry: Entry, t: T): string {
  return entry.kind === "due" ? t("schedule.due_title", { title: entry.title }) : entry.title;
}

/** Where the entry comes from, in words. */
export function fromWords(entry: Entry, calendars: Calendars, t: T): string {
  if (entry.kind === "due") return t("schedule.from_due");
  if (entry.own) return t("today.agenda.own");
  const name = calendars.name(entry.source);
  return name ? t("schedule.from_source", { source: name }) : t("schedule.from_source_unknown");
}

/** When the entry is on its day, short: its start, "Until" its end for one that began earlier, or nothing for an all-day entry. */
export function shortWhen(entry: Entry, t: T): string {
  if (entry.slot === "all_day") return "";
  if (entry.begins) return wallTime(entry.begins);
  return entry.ends ? t("today.agenda.until", { time: wallTime(entry.ends) }) : "";
}

/** When the entry is on a day, in full words, for its details. */
export function fullWhen(entry: Entry, date: string | null, t: T): string {
  if (!date) return t("schedule.pane.not_dated");
  if (entry.slot === "all_day") return t("schedule.event.all_day", { date: day(date) });
  if (entry.begins && entry.ends) return t("schedule.event.range_same_day", { date: day(date), start: wallTime(entry.begins), end: wallTime(entry.ends) });
  if (entry.begins) return t("schedule.event.day_and_time", { date: day(date), time: wallTime(entry.begins) });
  return entry.ends ? t("schedule.event.day_and_time", { date: day(date), time: t("today.agenda.until", { time: wallTime(entry.ends) }) }) : t("schedule.event.all_day", { date: day(date) });
}

/** The entry as a button. `time` puts its start before its title (a list of titles), left off where the grid's position says it. */
export function EntryButton(props: {
  entry: Entry;
  date: string | null;
  calendars: Calendars;
  time: boolean;
  selected: boolean;
  onOpen: (entry: Entry, date: string | null) => void;
  t: T;
}) {
  const { entry, t } = props;
  const status = deliveryStatusWord(entry, t);
  const when = props.time ? shortWhen(entry, t) : "";
  const color = !entry.own && entry.kind !== "due" ? props.calendars.color(entry.source) : undefined;
  return (
    <button
      type="button"
      className={[styles.chip, entry.own || entry.kind === "due" ? styles.own : "", props.selected ? styles.selected : ""].filter(Boolean).join(" ")}
      data-entry-key={entryKey(entry, props.date)}
      data-kind={entry.kind}
      data-source={entry.own ? "own" : entry.source}
      data-selected={props.selected ? "" : undefined}
      onClick={() => props.onOpen(entry, props.date)}
    >
      {color && <span className={styles.mark} data-color={color} aria-hidden="true" />}
      {when && <span className={styles.when}>{when}</span>}
      <span className={entry.cancelled ? `${styles.name} ${styles.struck}` : styles.name}>{entryTitle(entry, t)}</span>
      {entry.cancelled && <Pill tone="warn">{t("today.agenda.called_off")}</Pill>}
      {status && <Pill tone={entry.delivery?.status === "arrived" ? "ok" : "neutral"}>{status}</Pill>}
      <span className="sr">, {fromWords(entry, props.calendars, t)}</span>
    </button>
  );
}
