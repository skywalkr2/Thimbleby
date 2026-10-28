// The Schedule card of Today's rail (design 7.7): the first days of the schedule (the connected calendars' events and the
// app's own entries, day by day), today first, and a link to the full schedule. It is today's view: the week (what is due,
// who is waiting, the meetings further on) is the inspector's when no line is chosen, never a list in this card. The card is
// always drawn: with nothing in it, it says so, and with no calendar connected it offers one link to connect one.
import { useQuery } from "@tanstack/react-query";
import { useId, useRef, useState, type ReactNode } from "react";
import { api, type S } from "../lib/api";
import { useAct } from "../lib/act";
import { addDays, day, todayOn, time, wallTime } from "../lib/dates";
import { deliveryDetails, deliveryRange, deliveryStatusWord, isOnItsWay } from "../lib/deliveries";
import { useWords } from "../lib/wording";
import { AgendaItems } from "./AgendaList";
import { useChangeThis } from "./ChangeThis";
import { LearnedLines } from "./Learned";
import { RowMenu } from "./RowMenu";
import { SafeLink } from "./SafeText";
import { recordView, viewHref } from "../lib/views";
import { Button, ButtonLink } from "../ui/Button";
import { Drawer } from "../ui/Drawer";
import { Skeleton } from "../ui/Skeleton";
import { Empty, Failed, RailPanel } from "./RailPanel";
import { SourceProblems, useNow, useSourceNames, useSourceState } from "./RailSources";
import { Pill } from "../ui/Pill";

type T = ReturnType<typeof useWords>["t"];

type Event = S["AgendaItemView"];

interface DayGroup {
  date: string;
  events: Event[];
}

/** Events by the days they fall on (today onward): the connected calendars' events with all-day ones first, then the
 * app's own entries. */
export function groupByDay(events: Event[], today: string): DayGroup[] {
  const days = new Map<string, Event[]>();
  for (const event of events) {
    for (const date of event.days) {
      if (date < today) continue;
      days.set(date, [...(days.get(date) ?? []), event]);
    }
  }
  return [...days.keys()]
    .sort()
    .map((date) => {
      const all = days.get(date)!;
      const connected = all.filter((e) => !e.own);
      return {
        date,
        events: [
          ...connected.filter((e) => e.all_day),
          ...connected.filter((e) => !e.all_day),
          ...all.filter((e) => e.own),
        ],
      };
    });
}

function whenText(event: Event, date: string, t: T): string {
  if (event.all_day) return deliveryRange(event, t) ?? t("today.agenda.all_day");
  const startDay = event.start.slice(0, 10);
  const endDay = event.end?.slice(0, 10);
  if (date > startDay) {
    return event.end && endDay === date ? t("today.agenda.until", { time: wallTime(event.end) }) : t("today.agenda.all_day");
  }
  return event.end && endDay === date
    ? t("today.agenda.range", { start: wallTime(event.start), end: wallTime(event.end) })
    : wallTime(event.start);
}

/** The Schedule card, which is always drawn (so Today's side column is never left blank), and whether it has anything to tell:
 * `drawn` is true when the calendars have events from today on, a calendar couldn't be read, or there is a calendar to connect
 * (`onAddSource` opens Sources with the add form, offered once setup is finished; `connectHref` is the link offered otherwise);
 * `settled` is true once everything it asks has answered. */
export function useScheduleCard(onAddSource?: () => void, connectHref?: string): { settled: boolean; drawn: boolean; card: ReactNode } {
  const { t, tn } = useWords();
  const sourceState = useSourceState(onAddSource ?? (connectHref ? () => {} : undefined), t("today.agenda.connect"), "calendar");
  const watch = useQuery({ queryKey: ["watch"], queryFn: api.watchSources });
  const agenda = useQuery({ queryKey: ["today", "agenda"], queryFn: api.agenda });
  const span = useQuery({ queryKey: ["today", "agenda-span"], queryFn: api.agendaSpan });
  const now = useNow();
  const today = todayOn(now);
  const tomorrow = addDays(today, 1);
  const events = agenda.data ?? [];
  const sourceName = useSourceNames(events.filter((e) => !e.own).map((e) => e.source));
  const groups = groupByDay(events, today);
  // Deliveries with no date yet are on no day: they are listed under "On its way" at the card's end.
  const onItsWay = events.filter(isOnItsWay);
  const count = events.filter((e) => !e.cancelled && e.days.includes(today)).length;
  const settled = !agenda.isPending && !watch.isPending;
  // With no calendar connected the card offers one link to connect one: to the add form once setup is finished, else to Connections.
  const connect = sourceState.button ? (onAddSource ? sourceState.button : { label: sourceState.button.label, href: connectHref }) : undefined;
  const drawn = agenda.isError || groups.length > 0 || onItsWay.length > 0 || sourceState.problems.length > 0 || (!!sourceState.button && !!onAddSource);
  const dayLabel = (date: string) => (date === today ? t("today.agenda.today") : date === tomorrow ? t("today.agenda.tomorrow") : day(date));
  const summary = count > 0 ? tn("today.agenda.count", count) : "";

  const card = (
    <RailPanel
      id="schedule"
      title={t("today.schedule.title")}
      count={agenda.data ? count : null}
      countText={tn("today.agenda.count", count)}
      summary={agenda.data ? summary || (sourceState.problems.length > 0 ? t("today.rail.not_read") : t("today.agenda.none_today")) : ""}
      footer={
        <div className="row-end">
          <AddMeeting today={today} />
          <ButtonLink size="sm" href={viewHref("schedule")}>
            {t("schedule.open")}
          </ButtonLink>
        </div>
      }
    >
      {agenda.isPending || watch.isPending ? (
        <Skeleton />
      ) : agenda.isError ? (
        <Failed text={t("today.agenda.load_failed")} retry={() => void agenda.refetch()} />
      ) : groups.length === 0 && onItsWay.length === 0 ? (
        sourceState.problems.length > 0 ? (
          <Empty text={t("today.agenda.not_read")}>
            <SourceProblems problems={sourceState.problems} />
          </Empty>
        ) : (
          <Empty inline text={connect && span.data ? t("today.agenda.empty", { start: day(span.data.first), end: day(span.data.last) }) : t("today.agenda.empty_today")} button={connect} />
        )
      ) : (
        <>
          {groups.map((group) => {
            const headId = `agenda-day-${group.date}`;
            // On today's list, a line marks where the day has got to: after what has ended, before what is still to come.
            const ended = (e: Event) => new Date(e.end ?? e.start).getTime() <= now.getTime();
            const rows: Array<Event | "now"> = [...group.events];
            if (group.date === today) {
              const timed = group.events.filter((e) => !e.all_day && !e.own);
              if (timed.length > 0) {
                const upcoming = timed.find((e) => !ended(e));
                rows.splice(upcoming ? rows.indexOf(upcoming) : group.events.filter((e) => !e.own).length, 0, "now");
              }
            }
            return (
              <div key={group.date} className="tb-group">
                <h3 id={headId} className="tb-group-head">
                  {dayLabel(group.date)}
                </h3>
                <ul className="tb-list" aria-labelledby={headId}>
                  {rows.map((row, i) =>
                    row === "now" ? (
                      <li key="now" className="now-line">
                        <span>{t("today.agenda.now", { time: time(now) })}</span>
                      </li>
                    ) : (
                      <AgendaRow
                        key={`${row.snapshot}:${i}`}
                        event={row}
                        when={whenText(row, group.date, t)}
                        past={group.date === today && !row.all_day && !row.own && ended(row)}
                        source={sourceName(row.source)}
                      />
                    ),
                  )}
                </ul>
              </div>
            );
          })}
          {onItsWay.length > 0 && (
            <div className="tb-group">
              <h3 id="agenda-on-its-way" className="tb-group-head">
                {t("today.agenda.on_its_way")}
              </h3>
              <ul className="tb-list" aria-labelledby="agenda-on-its-way">
                {onItsWay.map((row, i) => (
                  <AgendaRow key={`${row.snapshot}:${i}`} event={row} when={t("today.agenda.delivery.no_date")} past={false} source="" />
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </RailPanel>
  );
  return { settled, drawn, card };
}

/** The button that adds a meeting to the agenda, opening a drawer with one line to fill: what, the day (today to begin with)
 * and the time (none: all day). The server makes the person's own calendar entry, or merges the meeting into one already
 * there and says so; Undo takes an added one back. The drawer closes once it is added; a refusal leaves what was typed. */
export function AddMeeting(props: { today: string }) {
  const { t } = useWords();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        {t("meeting.open")}
      </Button>
      {open && <MeetingDrawer today={props.today} onClose={() => setOpen(false)} />}
    </>
  );
}

function MeetingDrawer(props: { today: string; onClose: () => void }) {
  const { t } = useWords();
  const act = useAct();
  const base = useId();
  const [what, setWhat] = useState("");
  const [on, setOn] = useState("");
  const [at, setAt] = useState("");
  const day_ = on || props.today;
  const submit = async () => {
    const title = what.trim();
    if (!title || !day_) return;
    const done = await act(
      () => api.addMeeting({ what: title, day: day_, time: at || null }),
      (added) =>
        added.merged
          ? { message: t("meeting.merged", { what: added.merged_with ?? title }) }
          : { message: t("meeting.added", { what: title }), undo: () => api.undo(added.changeset ?? "") },
    );
    if (done) props.onClose();
  };
  return (
    <Drawer
      open
      title={t("meeting.title")}
      onClose={props.onClose}
      dirty={what.trim() !== ""}
      footer={
        <>
          <Button onClick={props.onClose}>{t("action.cancel")}</Button>
          <Button type="submit" form={`${base}-form`} variant="primary" disabled={!what.trim() || !day_}>
            {t("meeting.add")}
          </Button>
        </>
      }
    >
      <form
        id={`${base}-form`}
        className="meeting-line"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <div className="field">
          <label htmlFor={`${base}-what`}>{t("meeting.what")}</label>
          <input id={`${base}-what`} type="text" value={what} onChange={(e) => setWhat(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor={`${base}-day`}>{t("meeting.day")}</label>
          <input id={`${base}-day`} type="date" value={day_} onChange={(e) => setOn(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor={`${base}-time`}>{t("meeting.time")}</label>
          <input id={`${base}-time`} type="time" value={at} onChange={(e) => setAt(e.target.value)} />
        </div>
        {/* The drawer's Add button is outside the form; this one lets Enter in a field add the meeting. */}
        <button type="submit" hidden tabIndex={-1} aria-hidden="true" />
      </form>
    </Drawer>
  );
}

function AgendaRow(props: { event: Event; when: string; past: boolean; source: string }) {
  const { t, tn } = useWords();
  const { event } = props;
  const row = useRef<HTMLLIElement>(null);
  const change = useChangeThis({ kind: "event", id: event.snapshot }, () => row.current?.focus());
  const act = useAct();
  // A plain entry that reads as a task is offered as a to-do, one click, with Undo.
  const offer = event.entry && event.todo_offer ? { entry: event.entry, text: event.todo_offer } : null;
  const addTodo = offer
    ? {
        id: "add-todo",
        label: t("today.agenda.add_todo"),
        icon: "plus" as const,
        run: () => void act(() => api.entryTodo(offer.entry), (made) => ({ message: t("today.agenda.todo_added", { what: offer.text }), undo: () => api.undo(made.changeset) })),
      }
    : null;
  const meta = [event.where, ...deliveryDetails(event, t), event.own ? t("today.agenda.own") : props.source].filter(Boolean).join(" · ");
  const status = deliveryStatusWord(event, t);
  // A meeting of a series shows how many open items wait for it, linking to the series' page; with none, nothing is said.
  const open = event.series && (event.open_items ?? 0) > 0 ? event.open_items! : 0;
  return (
    <li className={props.past ? "tb-row stacked past" : "tb-row stacked"} ref={row} tabIndex={event.own ? -1 : undefined}>
      <span className="tb-when">{props.when}</span>
      <div className="tb-what">
        <div className="tb-title">
          {event.cancelled && <Pill tone="danger" className="pill-gap">{t("today.agenda.called_off")}</Pill>}
          <span className={event.cancelled ? "struck" : undefined}>
            {event.link ? (
              <SafeLink label={event.title} url={event.link} />
            ) : event.entry ? (
              <a href={viewHref(recordView("event", event.entry))}>{event.title}</a>
            ) : (
              event.title
            )}
          </span>
          {status && (
            <Pill tone={event.delivery?.status === "arrived" ? "ok" : "neutral"} className="pill-gap">
              {status}
            </Pill>
          )}
          {open > 0 && event.series && (
            <>
              {" · "}
              <a href={viewHref(recordView("series", event.series))}>{tn("today.agenda.open", open)}</a>
            </>
          )}
        </div>
        {meta && <div className="tb-meta">{meta}</div>}
        <AgendaItems items={event.agenda ?? []} />
      </div>
      {event.own && <RowMenu label={event.title} actions={[change.entry]} />}
      {!event.own && addTodo && <RowMenu label={event.title} actions={[addTodo]} />}
      {event.own && change.form}
      {event.own && <LearnedLines records={[event.snapshot]} />}
    </li>
  );
}
