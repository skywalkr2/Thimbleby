// What a clash line opens (design 6.32): the two entries that overlap, each with when it is, which calendar it is on, Open (its
// page) and Move to another time. An entry the app keeps moves at once with Undo; a connected event drafts the move for the
// person's yes, or says why it can't be changed here (the same acts as the Schedule's details pane).
import { wallTime } from "../lib/dates";
import type { QueueLine } from "../lib/today";
import { useWords } from "../lib/wording";
import { viewHref, recordView, EVENT_PAGE } from "../lib/views";
import { SafeLink } from "./SafeText";
import { Button, ButtonLink } from "../ui/Button";
import { Definition, DefinitionList } from "../ui/DefinitionList";
import { useEventActs } from "./EventActs";
import styles from "./Schedule.module.css";

function ClashEntry(props: { title: string; entry: string | null | undefined; page?: string | null; link?: string | null; starts?: string | null; ends?: string | null; calendar?: string | null }) {
  const { t } = useWords();
  const { entry } = props;
  const acts = useEventActs(entry ?? "", { start: props.starts, end: props.ends }, !!entry);
  return (
    <section className={styles.pane} role="group" aria-label={props.title}>
      <h4>{props.title}</h4>
      <DefinitionList>
        <Definition>
          <dt>{t("schedule.pane.when")}</dt>
          <dd>{t("queue.clash.when", { from: props.starts ? wallTime(props.starts) : "", to: props.ends ? wallTime(props.ends) : "" })}</dd>
        </Definition>
        <Definition>
          <dt>{t("schedule.event.calendar")}</dt>
          <dd>{props.calendar || t("schedule.pane.calendar_own")}</dd>
        </Definition>
      </DefinitionList>
      <div className={styles.paneActs}>
        {(entry || props.page) && (
          <ButtonLink variant="primary" href={viewHref(recordView(entry ? "event" : EVENT_PAGE, entry ?? props.page ?? ""))}>
            {t("schedule.pane.open")}
          </ButtonLink>
        )}
        {acts.menu.map((action) => (
          <Button key={action.id} onClick={action.run}>
            {action.label}
          </Button>
        ))}
      </div>
      {acts.form}
      {acts.note}
      {/* A connected calendar's event the app keeps no entry for is changed in that calendar: the page says so, and links to it there. */}
      {!entry && props.page && (
        <p className="hint" data-event-why="app_only">
          {t("acts.event.why.app_only")} {props.link && <SafeLink label={t("schedule.open_calendar")} url={props.link} />}
        </p>
      )}
    </section>
  );
}

export function ClashDetail(props: { line: QueueLine }) {
  const { line } = props;
  return (
    <>
      <ClashEntry title={line.text ?? ""} entry={line.entry} page={line.event_page} link={line.calendar_link} starts={line.starts} ends={line.ends} calendar={line.source_name} />
      <ClashEntry title={line.other ?? ""} entry={line.other_entry} page={line.other_event_page} link={line.other_calendar_link} starts={line.other_starts} ends={line.other_ends} calendar={line.other_source_name} />
    </>
  );
}
