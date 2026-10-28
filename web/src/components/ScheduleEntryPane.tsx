// An entry's details beside the calendar (design 7.7): what it is, when, where, which calendar it is on (or that it is the
// app's own), which side it is on, a delivery's tracking, carrier, status and range, and "Open" to its page. Read only: a
// change is made on the entry's own page. Every word of a connected calendar's is untrusted text and shown as text.
import { day } from "../lib/dates";
import { deliveryLines, deliveryRange } from "../lib/deliveries";
import { useWords } from "../lib/wording";
import { Button } from "../ui/Button";
import { Pill } from "../ui/Pill";
import { SafeLink } from "./SafeText";
import { entryHref, fullWhen, type Calendars, type Entry } from "./ScheduleEntry";
import styles from "./Schedule.module.css";

export function EntryDetails(props: { entry: Entry; date: string | null; calendars: Calendars; sideName: string | null; onBack?: () => void }) {
  const { t } = useWords();
  const { entry } = props;
  const calendar =
    entry.kind === "due" ? t("schedule.pane.calendar_due") : entry.own ? t("schedule.pane.calendar_own") : (props.calendars.name(entry.source) ?? t("schedule.event.calendar_unknown"));
  const color = !entry.own && entry.kind !== "due" ? props.calendars.color(entry.source) : undefined;
  const range = deliveryRange(entry, t);
  const delivery = deliveryLines(entry.delivery, t);
  const rows: [string, React.ReactNode][] = [
    [t("schedule.pane.when"), fullWhen(entry, props.date, t)],
    ...(entry.where ? [[t("schedule.event.where"), entry.where] as [string, React.ReactNode]] : []),
    [
      t("schedule.event.calendar"),
      <>
        {color && <span className={styles.mark} data-color={color} aria-hidden="true" />}
        {calendar}
      </>,
    ],
    ...(props.sideName ? [[t("schedule.pane.side"), props.sideName] as [string, React.ReactNode]] : []),
    ...(entry.kind === "due" && props.date ? [[t("schedule.pane.due"), day(props.date)] as [string, React.ReactNode]] : []),
    ...(entry.delivery ? [[t("schedule.pane.delivery"), [range, ...delivery].filter(Boolean).join(" · ")] as [string, React.ReactNode]] : []),
  ];
  return (
    <div className={styles.pane}>
      {props.onBack && (
        <Button variant="secondary" onClick={props.onBack}>
          {t("schedule.pane.back")}
        </Button>
      )}
      {entry.cancelled && (
        <p>
          <Pill tone="warn">{t("today.agenda.called_off")}</Pill>
        </p>
      )}
      <dl className={styles.facts}>
        {rows.map(([name, value]) => (
          <div key={name} className={styles.fact}>
            <dt>{name}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <div className={styles.paneActs}>
        <a className="btn primary" href={entryHref(entry)}>
          {entry.kind === "due" ? t("schedule.pane.open_todo") : t("schedule.pane.open")}
        </a>
        {entry.link && <SafeLink label={t("schedule.open_calendar")} url={entry.link} />}
      </div>
    </div>
  );
}
