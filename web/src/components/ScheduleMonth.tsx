// The Month view (design 7.7): six weeks of days, each listing its first entries by time and saying how many more there are;
// the day and "N more" open that day in Day view. In a narrow space a day keeps only its count and a row of dots, so nothing
// is wider than the window. Today is named in words for a screen reader, never only by color.
import { dayOfMonth, day, weekday } from "../lib/dates";
import { useWords } from "../lib/wording";
import type { DayEntries } from "./ScheduleGrid";
import { EntryButton, entryKey, type Calendars, type Entry } from "./ScheduleEntry";
import styles from "./Schedule.module.css";

/** The most dots a day shows in a narrow space. */
const DOTS = 4;

export function MonthGrid(props: {
  days: DayEntries[];
  today: string;
  /** The month being looked at (a day in it): days outside it are dimmed. */
  month: string;
  limit: number;
  calendars: Calendars;
  selected: string | null;
  onOpen: (entry: Entry, date: string | null) => void;
  onOpenDay: (date: string) => void;
}) {
  const { t, tn } = useWords();
  const inMonth = (date: string) => date.slice(0, 7) === props.month.slice(0, 7);
  return (
    <div className={styles.month} data-month="">
      <div className={styles.weekdays} aria-hidden="true">
        {props.days.slice(0, 7).map((d) => (
          <span key={d.date}>{weekday(d.date)}</span>
        ))}
      </div>
      <div className={styles.cells}>
        {props.days.map((d) => {
          const all = [...d.all_day, ...d.timed];
          const listed = all.slice(0, props.limit);
          const more = all.length - listed.length;
          const label = d.date === props.today ? t("schedule.day_today", { date: day(d.date) }) : day(d.date);
          return (
            <section key={d.date} className={styles.cell} aria-label={label} data-day={d.date} data-today={d.date === props.today ? "" : undefined} data-outside={inMonth(d.date) ? undefined : ""}>
              <button type="button" className={styles.dayButton} onClick={() => props.onOpenDay(d.date)}>
                <span className={styles.dayNumber} aria-hidden="true">
                  {dayOfMonth(d.date)}
                </span>
                {all.length > 0 && (
                  <span className={styles.count} aria-hidden="true">
                    {all.length}
                  </span>
                )}
                <span className="sr">{tn("schedule.month.day", all.length, { date: label })}</span>
              </button>
              <ul className={styles.titles}>
                {listed.map((e, i) => (
                  <li key={`${entryKey(e, d.date)}:${i}`}>
                    <EntryButton entry={e} date={d.date} calendars={props.calendars} time selected={props.selected === entryKey(e, d.date)} onOpen={props.onOpen} t={t} />
                  </li>
                ))}
                {more > 0 && (
                  <li>
                    <button type="button" className={styles.more} onClick={() => props.onOpenDay(d.date)}>
                      {tn("schedule.more", more)}
                    </button>
                  </li>
                )}
              </ul>
              {all.length > 0 && (
                <span className={styles.dots} aria-hidden="true">
                  {all.slice(0, DOTS).map((e, i) => (
                    <span key={i} className={styles.dot} data-own={e.own || e.kind === "due" ? "" : undefined} />
                  ))}
                </span>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
