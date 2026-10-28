// What the person can do to an event of theirs on a connected calendar (design 6.12): move it to another time or cancel it. Each
// drafts an act and opens it in Waiting to go out, where the person says yes to exactly what will be written to the calendar;
// nothing changes there before it. Only an event that is the person's own is offered, and only when acting is on for its account
// and the account's service does it.
import { useId, useState, type ReactNode } from "react";
import { useActOptions, useDraftAct } from "../lib/acts";
import { useWords } from "../lib/wording";
import type { MenuAction } from "./RowMenu";

export interface EventActs {
  /** The entries for the entry page's menu; none when nothing is offered. */
  menu: MenuAction[];
  /** The form a choice opened, shown beside the entry. */
  form: ReactNode;
}

/** A moment as the text a `datetime-local` box takes, in the person's own time. A day with no time starts at nine. */
export function localInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const when = new Date(iso.length === 10 ? `${iso}T09:00` : iso);
  if (Number.isNaN(when.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${when.getFullYear()}-${p(when.getMonth() + 1)}-${p(when.getDate())}T${p(when.getHours())}:${p(when.getMinutes())}`;
}

/** What a `datetime-local` box holds as ISO text, or nothing when it holds no moment. */
export function isoInput(local: string): string {
  const when = new Date(local);
  return Number.isNaN(when.getTime()) ? "" : when.toISOString();
}

/** The acts on the calendar entry `entry`, whose own start and end are `current`. `enabled` false asks the server nothing. */
export function useEventActs(entry: string, current: { start?: string | null; end?: string | null }, enabled: boolean): EventActs {
  const { t } = useWords();
  const found = useActOptions(entry, enabled);
  const draft = useDraftAct();
  const [moving, setMoving] = useState(false);
  const options = found.data?.kind === "event" ? found.data : null;
  const offered = options?.event_actions ?? [];
  if (!enabled || !options || offered.length === 0) return { menu: [], form: null };
  const menu: MenuAction[] = [
    ...(offered.includes("move") ? [{ id: "event-move", label: t("acts.event.move"), run: () => setMoving(true) }] : []),
    ...(offered.includes("cancel") ? [{ id: "event-cancel", label: t("acts.event.cancel"), run: () => void draft({ kind: "calendar", action: "cancel", about: [entry] }) }] : []),
  ];
  return {
    menu,
    form: moving ? (
      <MoveForm
        start={localInput(current.start)}
        end={localInput(current.end)}
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
function MoveForm(props: { start: string; end: string; onCancel: () => void; onSubmit: (start: string, end: string) => Promise<void> }) {
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
      <div className="field">
        <label htmlFor={`${base}-start`}>{t("acts.propose.start")}</label>
        <input id={`${base}-start`} type="datetime-local" autoFocus value={start} onChange={(e) => setStart(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor={`${base}-end`}>{t("acts.propose.end")}</label>
        <input id={`${base}-end`} type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} />
      </div>
      {bad && (
        <p className="problem-note" role="alert">
          {t("acts.event.move.bad")}
        </p>
      )}
      <div className="row-end">
        <button type="button" className="btn quiet" onClick={props.onCancel}>
          {t("acts.cancel")}
        </button>
        <button type="submit" className="btn primary" disabled={busy || !start}>
          {t("acts.event.move.go")}
        </button>
      </div>
    </form>
  );
}
