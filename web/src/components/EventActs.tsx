// What the person can do to a calendar entry of theirs (design 6.12): move it to another time or cancel it.
// An entry the app keeps itself changes at once, with Undo in a toast. An event on a connected calendar drafts an act and opens it
// in Waiting to go out, where the person says yes to exactly what will be written to the calendar; nothing changes there before
// it. That is offered only when acting is on for its account and the account's service does it; otherwise a note says which
// (acting is off, with the way to turn it on, or the service doesn't do it and the change is made in the calendar app).
import { useQuery } from "@tanstack/react-query";
import { useId, useState, type ReactNode } from "react";
import { api } from "../lib/api";
import { useAct } from "../lib/act";
import { inputOn, momentOf } from "../lib/dates";
import { useActOptions, useDraftAct } from "../lib/acts";
import { settingsView, viewHref } from "../lib/views";
import { useWords } from "../lib/wording";
import type { MenuAction } from "./RowMenu";
import { SafeLink } from "./SafeText";
import { Button } from "../ui/Button";
import { DateField } from "../ui/DateField";
import { FormField } from "../ui/FormField";
import { Actions } from "../ui/Actions";
export interface EventActs {
  /** The entries for the entry page's menu; none when nothing is offered. */
  menu: MenuAction[];
  /** The form a choice opened, shown beside the entry. */
  form: ReactNode;
  /** Why a connected event can't be changed from here, in plain words, when it can't. */
  note: ReactNode;
}

/** A moment as the text a `datetime-local` box takes, on the person's own clock. A day with no time starts at nine. */
export function localInput(iso: string | null | undefined): string {
  if (!iso) return "";
  if (iso.length === 10) return `${iso}T09:00`;
  const when = new Date(iso);
  return Number.isNaN(when.getTime()) ? "" : inputOn(when);
}

/** What a `datetime-local` box holds as ISO text, on the person's own clock, or nothing when it holds no moment. */
export function isoInput(local: string): string {
  return momentOf(local)?.toISOString() ?? "";
}

/** The acts on the calendar entry `entry`, whose own start and end are `current` (the entry's own record says when they are left out).
 * `link` is the event's address on its calendar, when it has one. `enabled` false asks the server nothing. */
export function useEventActs(entry: string, current: { start?: string | null; end?: string | null }, enabled: boolean, link?: string | null): EventActs {
  const { t } = useWords();
  const found = useActOptions(entry, enabled);
  const draft = useDraftAct();
  const act = useAct();
  const record = useQuery({ queryKey: ["record", "event", entry], queryFn: () => api.record("event", entry), enabled: enabled && !!entry });
  const [moving, setMoving] = useState(false);
  const options = found.data?.kind === "event" ? found.data : null;
  const offered = options?.event_actions ?? [];
  if (!enabled || !options) return { menu: [], form: null, note: null };
  const start = current.start ?? (record.data?.fields.start as string | undefined);
  const end = current.end !== undefined ? current.end : (record.data?.fields.end as string | null | undefined);

  // An entry the app keeps itself: the person's own change, at once, with Undo.
  if (options.event_own) {
    const version = record.data?.version;
    const said = (done: { changeset?: string | null; refused?: "changed" | "referred_to" | null }, message: string) =>
      done.refused || !done.changeset ? { message: t(`calendar.own.refused.${done.refused ?? "changed"}`) } : { message, undo: () => api.undo(done.changeset ?? "") };
    return {
      menu: version
        ? [
            { id: "event-move", label: t("acts.event.move"), run: () => setMoving(true) },
            {
              id: "event-cancel",
              label: t("acts.event.cancel"),
              run: () => void act(() => api.cancelEvent(entry, { read_version: version }), (done) => said(done, t("calendar.own.cancelled"))),
            },
          ]
        : [],
      note: null,
      form: moving && version ? (
        <MoveForm
          start={localInput(start)}
          end={localInput(end)}
          go={t("calendar.own.move.go")}
          onCancel={() => setMoving(false)}
          onSubmit={async (from, to) => {
            const done = await act(
              () => api.moveEvent(entry, { start: from, end: to || null, read_version: version }),
              (result) => said(result, t("calendar.own.moved")),
            );
            if (done) setMoving(false);
          }}
        />
      ) : null,
    };
  }

  if (offered.length === 0) {
    const why = options.event_why;
    const account = options.account_label ?? "";
    return {
      menu: [],
      form: null,
      note: why ? (
        <p className="hint" data-event-why={why}>
          {why === "acting_off" ? (
            <>
              {t("acts.event.why.acting_off", { account })} <a href={viewHref(settingsView("you"))}>{t("acts.event.why.settings")}</a>
            </>
          ) : (
            <>
              {t("acts.event.why.app_only")} {link && <SafeLink label={t("schedule.open_calendar")} url={link} />}
            </>
          )}
        </p>
      ) : null,
    };
  }
  const menu: MenuAction[] = [
    ...(offered.includes("move") ? [{ id: "event-move", label: t("acts.event.move"), run: () => setMoving(true) }] : []),
    ...(offered.includes("cancel") ? [{ id: "event-cancel", label: t("acts.event.cancel"), run: () => void draft({ kind: "calendar", action: "cancel", about: [entry] }) }] : []),
  ];
  return {
    menu,
    note: null,
    form: moving ? (
      <MoveForm
        start={localInput(start)}
        end={localInput(end)}
        go={t("acts.event.move.go")}
        onCancel={() => setMoving(false)}
        onSubmit={async (start, end) => {
          const made = await draft({ kind: "calendar", action: "move", about: [entry], start, end });
          if (made) setMoving(false);
        }}
      />
    ) : null,
  };
}

/** The new start and end, with the entry's own time to begin with; the cursor starts in the start. */
function MoveForm(props: { start: string; end: string; go: string; onCancel: () => void; onSubmit: (start: string, end: string) => Promise<void> }) {
  const { t } = useWords();
  const base = useId();
  const [start, setStart] = useState(props.start);
  const [end, setEnd] = useState(props.end);
  const [busy, setBusy] = useState(false);
  const [bad, setBad] = useState(false);
  const submit = () => {
    const from = isoInput(start);
    const to = isoInput(end);
    // An event with no end moves by its start alone; one with an end needs an end after the start.
    if (!from || (end !== "" && (!to || new Date(to) <= new Date(from)))) {
      setBad(true);
      return;
    }
    setBad(false);
    setBusy(true);
    void props.onSubmit(from, to).finally(() => setBusy(false));
  };
  return (
    <form
      className="answer-form"
      data-act-form="move-event"
      aria-labelledby={`${base}-title`}
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") props.onCancel();
      }}
    >
      <h3 id={`${base}-title`}>{t("acts.event.move.title")}</h3>
      <FormField id={`${base}-start`} label={t("acts.propose.start")}>
        <DateField id={`${base}-start`} kind="datetime-local" autoFocus value={start} onChange={(e) => setStart(e.target.value)} />
      </FormField>
      <FormField id={`${base}-end`} label={t("acts.propose.end")}>
        <DateField id={`${base}-end`} kind="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} />
      </FormField>
      {bad && (
        <p className="problem-note" role="alert">
          {t("acts.event.move.bad")}
        </p>
      )}
      <Actions align="end">
        <Button variant="quiet" onClick={props.onCancel}>
          {t("acts.cancel")}
        </Button>
        <Button variant="primary" type="submit" disabled={busy || !start}>
          {props.go}
        </Button>
      </Actions>
    </form>
  );
}
