// An entry's details beside the calendar (design 7.7): what it is, when, where, which calendar it is on (or that it is the
// app's own), which side it is on, a delivery's tracking, carrier, status and range, and "Open" to its page. The person's own
// entry can be moved or cancelled here at once (with Undo); a connected calendar's event, after the person's yes in Waiting to go
// out, or with the plain reason it can't be and where to change it. Every word of a connected calendar's is untrusted text and
// shown as text.
import { day } from "../lib/dates";
import { deliveryLines, deliveryRange } from "../lib/deliveries";
import { useWords } from "../lib/wording";
import { Button, ButtonLink } from "../ui/Button";
import { Pill } from "../ui/Pill";
import { Definition, DefinitionList } from "../ui/DefinitionList";
import { useEventActs } from "./EventActs";
import { RowMenu } from "./RowMenu";
import { SafeLink } from "./SafeText";
import { entryHref, fullWhen, type Calendars, type Entry } from "./ScheduleEntry";
import styles from "./Schedule.module.css";

/** Moving and cancelling an entry that has a record of its own: the app's own entry, or a connected event the app keeps one for. */
function EntryChanges(props: { id: string; title: string; link: string | null | undefined }) {
  const acts = useEventActs(props.id, {}, true, props.link);
  return (
    <>
      {acts.menu.length > 0 && <RowMenu label={props.title} actions={acts.menu} />}
      {acts.form}
      {acts.note}
    </>
  );
}

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
  const changeable = entry.kind === "due" || entry.kind === "delivery" ? null : entry.own ? entry.snapshot : (entry.entry ?? null);
  // A connected event the app keeps no entry for can't be drafted against: it is changed in its calendar app.
  const appOnly = entry.kind === "event" && !entry.own && !changeable;
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
      <DefinitionList>
        {rows.map(([name, value]) => (
          <Definition key={name}>
            <dt>{name}</dt>
            <dd>{value}</dd>
          </Definition>
        ))}
      </DefinitionList>
      <div className={styles.paneActs}>
        <ButtonLink variant="primary" href={entryHref(entry)}>
          {entry.kind === "due" ? t("schedule.pane.open_todo") : t("schedule.pane.open")}
        </ButtonLink>
        {entry.link && <SafeLink label={t("schedule.open_calendar")} url={entry.link} />}
        {changeable && <EntryChanges id={changeable} title={entry.title} link={entry.link} />}
      </div>
      {appOnly && <p className="hint">{t("acts.event.why.app_only")}</p>}
    </div>
  );
}
