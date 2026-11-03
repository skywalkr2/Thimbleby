// The week as a list by day (design 7.7), for a phone: a heading for each day, then its entries in order, each a row with the
// calendar's mark, its title and, under it, when it is, where and which calendar it is in ("In 2 calendars" for one held in
// several). Meetings that overlap are one row naming them, with how long they overlap. A day with nothing says so. Every row
// opens the entry's details, as a block of the grid does.
import { clashGroups, minutesOf, SHORT } from "../lib/calendar";
import { dayLong, wallTime, weekdayLong } from "../lib/dates";
import { useWords } from "../lib/wording";
import { GroupLabel } from "../ui/GroupLabel";
import { Icon } from "../ui/Icon";
import { MarkDot, type CalendarColor } from "../ui/MarkDot";
import { calendarWords, entryKey, entryTitle, type Calendars, type Entry } from "./ScheduleEntry";
import { isMeeting, type DayEntries } from "./ScheduleGrid";
import styles from "./Schedule.module.css";

type T = ReturnType<typeof useWords>["t"];

/** When an entry is, for its row: "All day", its start to its end, or its start. */
function rangeWords(entry: Entry, t: T): string {
  if (entry.slot === "all_day") return t("schedule.all_day");
  if (entry.begins && entry.ends) return t("schedule.list.range", { start: wallTime(entry.begins), end: wallTime(entry.ends) });
  if (entry.begins) return wallTime(entry.begins);
  return entry.ends ? t("today.agenda.until", { time: wallTime(entry.ends) }) : "";
}

type Row = { type: "entry"; entry: Entry; at: number } | { type: "clash"; entries: Entry[]; overlap: number; at: number };

export function ScheduleList(props: {
  days: DayEntries[];
  today: string;
  calendars: Calendars;
  selected: string | null;
  onOpen: (entry: Entry, date: string | null) => void;
}) {
  const { t } = useWords();
  const colorOf = (entry: Entry): CalendarColor | null => (entry.own || entry.kind === "due" ? null : ((props.calendars.color(entry.source) as CalendarColor | undefined) ?? null));
  const open = (entry: Entry, date: string) => (
    <button
      type="button"
      className={styles.listButton}
      data-entry-key={entryKey(entry, date)}
      data-kind={entry.kind}
      data-selected={props.selected === entryKey(entry, date) ? "" : undefined}
      onClick={() => props.onOpen(entry, date)}
    >
      <span className={styles.listLead} aria-hidden="true">
        <MarkDot kind="calendar" color={colorOf(entry)} />
      </span>
      <span className={styles.listMain}>
        <span className={entry.cancelled ? `${styles.listTitle} ${styles.struck}` : styles.listTitle}>{entryTitle(entry, t)}</span>
        <span className={styles.listMeta}>{[rangeWords(entry, t), entry.where ?? "", calendarWords(entry, props.calendars, t)].filter(Boolean).join(" · ")}</span>
      </span>
    </button>
  );
  return (
    <div className={styles.list} data-schedule-list="" role="list" aria-label={t("schedule.list.label")}>
      {props.days.map((d) => {
        const spans = d.timed.map((e) => {
          const start = minutesOf(e.begins) ?? 0;
          return { item: e, start, end: Math.max(minutesOf(e.ends) ?? start + SHORT, start + 1) };
        });
        const clashes = clashGroups(spans.filter((s) => isMeeting(s.item)));
        const clashing = new Set(clashes.flatMap((c) => c.items));
        const rows: Row[] = [
          ...d.all_day.map((entry): Row => ({ type: "entry", entry, at: -1 })),
          ...spans.filter((s) => !clashing.has(s.item)).map((s): Row => ({ type: "entry", entry: s.item, at: s.start })),
          ...clashes.map((c): Row => ({ type: "clash", entries: c.items, overlap: c.overlap, at: c.start })),
        ].sort((a, b) => a.at - b.at);
        const heading = t(d.date === props.today ? "schedule.list.day_today" : "schedule.list.day", { date: dayLong(d.date) });
        return (
          <section key={d.date} className={styles.listDay} aria-label={heading} role="listitem" data-day={d.date} data-today={d.date === props.today ? "" : undefined}>
            <GroupLabel>{heading}</GroupLabel>
            {rows.length === 0 ? (
              <p className={styles.listNone}>{t("schedule.list.nothing", { day: weekdayLong(d.date) })}</p>
            ) : (
              <ul className={styles.listRows}>
                {rows.map((row, n) =>
                  row.type === "entry" ? (
                    <li key={`${entryKey(row.entry, d.date)}:${n}`} className={styles.listRow}>
                      {open(row.entry, d.date)}
                    </li>
                  ) : (
                    <li key={`clash:${row.at}:${n}`} className={`${styles.listRow} ${styles.listClash}`} data-clash="" role="group" aria-label={t("schedule.clash.label", { names: row.entries.map((e) => e.title).join(", ") })}>
                      <p className={styles.listClashHead}>
                        <Icon name="alert" size={16} />
                        <span>{row.overlap > 0 ? t("schedule.clash.overlap", { n: row.overlap }) : t("schedule.clash.head")}</span>
                      </p>
                      <ul className={styles.listRows}>
                        {row.entries.map((entry, k) => (
                          <li key={`${entryKey(entry, d.date)}:${k}`}>{open(entry, d.date)}</li>
                        ))}
                      </ul>
                    </li>
                  ),
                )}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
