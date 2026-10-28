// The time grid of the Day, Work week and Week views (design 7.7): an hour column, a heading for each day, an all-day strip on
// top for what has no time (all-day events, due dates, dated deliveries) and each day's timed entries placed by start and end,
// overlapping ones side by side. The hours are the configured ones, grown to hold an entry outside them. A line marks now on
// today's column. Today is named in words in its heading, never only by color.
import { gridHours, minutesOf, placeOverlaps, SHORT, type Span } from "../lib/calendar";
import { day, onTheClock, wallTime } from "../lib/dates";
import { useWords } from "../lib/wording";
import { EntryButton, entryKey, type Calendars, type Entry } from "./ScheduleEntry";
import styles from "./Schedule.module.css";

export interface DayEntries {
  date: string;
  all_day: Entry[];
  timed: Entry[];
}

/** Where a timed entry sits on its day, in minutes after midnight. One with no end is drawn short, unless it goes on past
 * midnight, when it runs to the end of the day; one that came in from the day before starts at its top. */
function spanOf(entry: Entry, date: string): Span {
  const start = entry.begins ? (minutesOf(entry.begins) ?? 0) : 0;
  const named = minutesOf(entry.ends);
  const end = named ?? (entry.begins && !continuesPast(entry, date) ? start + SHORT : 24 * 60);
  return { start, end: Math.min(24 * 60, Math.max(end, start + SHORT)) };
}

function continuesPast(entry: Entry, date: string): boolean {
  return !!entry.end && entry.end.slice(0, 10) > date;
}

export function TimeGrid(props: {
  days: DayEntries[];
  today: string;
  startsAt: string;
  endsAt: string;
  now: Date;
  calendars: Calendars;
  selected: string | null;
  onOpen: (entry: Entry, date: string | null) => void;
}) {
  const { t } = useWords();
  const placed = props.days.map((d) => placeOverlaps(d.timed.map((e) => ({ item: e, ...spanOf(e, d.date) }))));
  const { from, to } = gridHours(
    placed.flat().map((p) => ({ start: p.start, end: p.end })),
    props.startsAt,
    props.endsAt,
  );
  const hours = Array.from({ length: to - from }, (_, n) => from + n);
  const nowMinutes = onTheClock(props.now).minutes;
  const label = (date: string) => (date === props.today ? t("schedule.day_today", { date: day(date) }) : t("schedule.day_plain", { date: day(date) }));
  return (
    <div className={styles.grid} style={{ ["--cols" as string]: props.days.length, ["--rows" as string]: to - from }} data-grid="">
      <div aria-hidden="true" />
      {props.days.map((d) => (
        <h3 key={d.date} className={styles.colHead} data-today={d.date === props.today ? "" : undefined}>
          {label(d.date)}
        </h3>
      ))}
      <div className={styles.stripLabel}>{t("schedule.all_day")}</div>
      {props.days.map((d) => (
        <ul key={d.date} className={styles.strip} aria-label={`${t("schedule.all_day")}, ${label(d.date)}`} data-today={d.date === props.today ? "" : undefined}>
          {d.all_day.map((e, i) => (
            <li key={`${entryKey(e, d.date)}:${i}`}>
              <EntryButton entry={e} date={d.date} calendars={props.calendars} time={false} selected={props.selected === entryKey(e, d.date)} onOpen={props.onOpen} t={t} />
            </li>
          ))}
        </ul>
      ))}
      <div className={styles.hours} aria-hidden="true">
        {hours.map((h) => (
          <span key={h} className={styles.hour} style={{ top: `calc(${h - from} * var(--hour))` }}>
            {h === from ? "" : wallTime(`2000-01-01T${String(h).padStart(2, "0")}:00`)}
          </span>
        ))}
      </div>
      {props.days.map((d, i) => (
        <ul key={d.date} className={styles.lane} aria-label={label(d.date)} data-day={d.date} data-today={d.date === props.today ? "" : undefined}>
          {placed[i].map((p, n) => (
            <li
              key={`${entryKey(p.item, d.date)}:${n}`}
              className={styles.slot}
              style={{
                top: `calc(${(p.start - from * 60) / 60} * var(--hour))`,
                height: `calc(${(p.end - p.start) / 60} * var(--hour))`,
                left: `${(p.col / p.cols) * 100}%`,
                width: `${100 / p.cols}%`,
              }}
            >
              <EntryButton entry={p.item} date={d.date} calendars={props.calendars} time selected={props.selected === entryKey(p.item, d.date)} onOpen={props.onOpen} t={t} />
            </li>
          ))}
          {d.date === props.today && nowMinutes >= from * 60 && nowMinutes <= to * 60 && (
            <li className={styles.now} style={{ top: `calc(${(nowMinutes - from * 60) / 60} * var(--hour))` }} aria-hidden="true" data-now="" />
          )}
        </ul>
      ))}
    </div>
  );
}
