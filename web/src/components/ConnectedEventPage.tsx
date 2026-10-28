// A connected calendar's event the app keeps no entry for (design 7.7): a read-only page with what the calendar says (its
// title, when, where, who is coming and which calendar it came from) and a link to open it there, with the address' real
// domain. It uses the record page's layout. Everything on it is the calendar's own words, so it is shown as text only.
import { useQuery } from "@tanstack/react-query";
import { api, type S } from "../lib/api";
import { day, wallTime } from "../lib/dates";
import { useWords } from "../lib/wording";
import { Skeleton } from "../ui/Skeleton";
import { Attendees } from "./Attendees";
import { SafeLink } from "./SafeText";
import { Button } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";
import { PageHeader } from "../ui/PageHeader";
import { Pill } from "../ui/Pill";
type T = ReturnType<typeof useWords>["t"];

/** The page's address names the event and the date of it that was opened: the snapshot, an at sign, then the date's start. */
const split = (id: string): { snapshot: string; start?: string } => {
  const at = id.indexOf("@");
  return at < 0 ? { snapshot: id } : { snapshot: id.slice(0, at), start: id.slice(at + 1) };
};

/** When the event is, in words: a day for an all-day event (a range of days when it has several), else the day and the
 * time, with the end after it. */
function whenText(event: S["ConnectedEventView"], t: T): string {
  if (event.all_day) {
    return event.end ? t("schedule.event.all_day_range", { start: day(event.start), end: day(event.end) }) : t("schedule.event.all_day", { date: day(event.start) });
  }
  if (!event.end) return t("schedule.event.day_and_time", { date: day(event.start), time: wallTime(event.start) });
  if (event.end.slice(0, 10) === event.start.slice(0, 10)) {
    return t("schedule.event.range_same_day", { date: day(event.start), start: wallTime(event.start), end: wallTime(event.end) });
  }
  return t("schedule.event.range_other_day", {
    start: t("schedule.event.day_and_time", { date: day(event.start), time: wallTime(event.start) }),
    end: t("schedule.event.day_and_time", { date: day(event.end), time: wallTime(event.end) }),
  });
}

export function ConnectedEventPage(props: { id: string; onBack: () => void }) {
  const { t } = useWords();
  const { snapshot, start } = split(props.id);
  const found = useQuery({ queryKey: ["schedule-event", snapshot, start ?? ""], queryFn: () => api.scheduleEvent(snapshot, start), retry: false });
  const watch = useQuery({ queryKey: ["watch"], queryFn: api.watchSources });
  const event = found.data;
  const calendar = event ? ((watch.data ?? []).find((s) => s.id === event.source)?.label ?? t("schedule.event.calendar_unknown")) : "";
  const rows: Array<{ name: string; label: string; value: string }> = event
    ? [
        { name: "when", label: t("schedule.event.when"), value: whenText(event, t) },
        ...(event.where ? [{ name: "where", label: t("schedule.event.where"), value: event.where }] : []),
        { name: "calendar", label: t("schedule.event.calendar"), value: calendar },
        ...(event.repeats ? [{ name: "repeats", label: t("schedule.event.repeats"), value: event.repeats }] : []),
        ...(event.cancelled ? [{ name: "status", label: t("schedule.event.status"), value: t("today.agenda.called_off") }] : []),
      ]
    : [];
  return (
    <section className="panel-section record-page" aria-labelledby="record-title">
      <PageHeader
        id="record-title"
        title={event?.title ?? t("schedule.event.kind")}
        kind={<Pill tone="neutral">{t("schedule.event.kind")}</Pill>}
        crumb={
          <Button variant="quiet" size="sm" onClick={props.onBack}>
            {t("record.back")}
          </Button>
        }
      />
      {found.isPending && <Skeleton />}
      {found.isError && <EmptyState text={t("schedule.event.gone")} />}
      {event && (
        <>
          <p className="hint">{t("schedule.event.note")}</p>
          <div className="record-grid">
            <div className="record-main">
              <Attendees fields={{ organizer: event.organizer, attendees: event.attendees, invitation: false }} names={new Map()} />
            </div>
            <aside className="record-side">
              <section aria-labelledby="record-details">
                <div className="heading">
                  <h3 id="record-details">{t("record.details")}</h3>
                </div>
                <dl className="details-list">
                  {rows.map((row) => (
                    <div key={row.name} className="detail" data-detail={row.name}>
                      <dt>{row.label}</dt>
                      <dd>{row.value}</dd>
                    </div>
                  ))}
                </dl>
                {event.link && (
                  <p>
                    <SafeLink label={t("schedule.open_calendar")} url={event.link} />
                  </p>
                )}
              </section>
            </aside>
          </div>
        </>
      )}
    </section>
  );
}
