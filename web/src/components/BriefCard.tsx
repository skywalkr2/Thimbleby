// The brief (design 6.32): a card at the top of Today with the morning brief, the evening wrap-up or the Monday briefing,
// whichever is due. Built by rules on the server, so every line here is a kind and its values worded from the sheet. A
// line that waits for the person's yes opens Today's own line; the rest open their record. The card closes for the day,
// which is remembered in this browser only and is no signal of anything. The Monday form also holds the week's goals
// (kept as confirmed) and the message to whoever the person reports to.
import { useQuery } from "@tanstack/react-query";
import { useId, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { useIsNarrow } from "../lib/media";
import { api, type S } from "../lib/api";
import { useAct } from "../lib/act";
import { copyMessage } from "../lib/copy";
import { day, isAfternoon, wallTime } from "../lib/dates";
import { durationWords } from "../lib/duration";
import { chooseFilters } from "../lib/open-items";
import { onSide, useSideFilter } from "../lib/sides";
import type { View } from "../lib/views";
import { useMoney } from "../lib/money";
import { reveal } from "../lib/reveal";
import { useDraftAct, useSendOptions } from "../lib/acts";
import { useToasts } from "../lib/toasts";
import { useQueue, useTodayCount, type QueueLine } from "../lib/today";
import { plainTitle } from "../lib/title-dates";
import { useWords } from "../lib/wording";
import { Button } from "../ui/Button";
import { useLineTitle } from "./TodayQueue";
import styles from "./BriefCard.module.css";
import { Select } from "../ui/Select";

type Brief = S["BriefView"];
type Line = S["BriefLineView"];
type Form = NonNullable<Brief["form"]>;
type T = ReturnType<typeof useWords>["t"];
type Tn = ReturnType<typeof useWords>["tn"];

const KEY = "brief-closed";


/** Whether the card for a form was closed for this day in this browser. A browser that blocks storage shows it every time. */
function closedFor(workspace: string, form: string, on: string): boolean {
  if (closedNow.has(`${workspace}:${form}:${on}`)) return true;
  try {
    return window.localStorage.getItem(`${KEY}:${workspace}:${form}:${on}`) === "1";
  } catch {
    return false;
  }
}

// What was closed when this browser won't keep it, so Undo and the way back work in that case too.
const closedNow = new Set<string>();
const listeners = new Set<() => void>();
let version = 0;
const tell = () => {
  version += 1;
  for (const listener of listeners) listener();
};

function closeFor(workspace: string, form: string, on: string) {
  try {
    window.localStorage.setItem(`${KEY}:${workspace}:${form}:${on}`, "1");
  } catch {
    // Storage can be blocked; the close then lasts until the page is closed.
    closedNow.add(`${workspace}:${form}:${on}`);
  }
  tell();
}

/** Brings a brief closed for the day back. */
function reopenFor(workspace: string, form: string, on: string) {
  closedNow.delete(`${workspace}:${form}:${on}`);
  try {
    window.localStorage.removeItem(`${KEY}:${workspace}:${form}:${on}`);
  } catch {
    // Storage can be blocked.
  }
  tell();
}

/** Draws the caller again whenever a brief is closed or brought back. */
export function useBriefClosings(): number {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => version,
  );
}

export function useBrief(form: Form | null) {
  return useQuery({ queryKey: ["brief", form], queryFn: () => api.brief(form ?? undefined) });
}

/** Whether Today's Briefing card has anything to draw: a form is due, it was not closed for the day, and it is not a quiet day
 * with no message and no goals (a card with nothing in it is not drawn). */
export function hasBrief(data: Brief | undefined, workspace: string): boolean {
  if (!data || data.form === null || closedFor(workspace, data.form, data.day)) return false;
  return briefHasContent(data);
}

const briefHasContent = (data: Brief) => !data.quiet || !!data.message || !!data.goals || data.sections.length > 0;

/** Whether the brief is due, has something in it and was closed for the day: the card then leaves a button to bring it back. */
export function briefClosed(data: Brief | undefined, workspace: string): boolean {
  return !!data && data.form !== null && closedFor(workspace, data.form, data.day) && briefHasContent(data);
}

const clock = (at: string | null | undefined) => (at ? wallTime(`T${at}`) : "");

function heading(key: string, t: T): string {
  switch (key) {
    case "today":
      return t("brief.section.today");
    case "changed":
      return t("brief.section.changed");
    case "risk":
      return t("brief.section.risk");
    case "yes":
      return t("brief.section.yes");
    case "done":
      return t("brief.section.done");
    case "moved":
      return t("brief.section.moved");
    case "waiting":
      return t("brief.section.waiting");
    case "yours":
      return t("brief.section.yours");
    case "owed":
      return t("brief.section.owed");
    case "send":
      return t("brief.section.send");
    case "chase":
      return t("brief.section.chase");
    default:
      return t("brief.section.decide");
  }
}

function invitation(line: Line, t: T): string {
  const vars = { name: line.person_name ?? "", text: plainTitle(line.text ?? ""), date: day(line.day), time: clock(line.at), from: [day(line.from_day), clock(line.from_at)].filter(Boolean).join(" "), place: line.detail ?? "" };
  switch (line.change) {
    case "new":
      return line.person_name ? t(line.at ? "brief.line.invitation.new_at" : "brief.line.invitation.new", vars) : t(line.at ? "brief.line.invitation.new_unnamed_at" : "brief.line.invitation.new_unnamed", vars);
    case "cancelled":
      return t("brief.line.invitation.cancelled", vars);
    case "restored":
      return t("brief.line.invitation.restored", vars);
    case "moved":
      return t(line.at ? "brief.line.invitation.moved_at" : "brief.line.invitation.moved", vars);
    case "now_timed":
      return t("brief.line.invitation.now_timed", vars);
    case "now_all_day":
      return t("brief.line.invitation.now_all_day", vars);
    case "end_changed":
      return t("brief.line.invitation.end_changed", vars);
    case "location_changed":
      return t("brief.line.invitation.location_changed", vars);
    case "location_removed":
      return t("brief.line.invitation.location_removed", vars);
    case "title_changed":
      return t("brief.line.invitation.title_changed", vars);
    default:
      return t("brief.line.invitation.organizer_changed", { ...vars, name: line.detail ?? line.person_name ?? "" });
  }
}

/** What a line says. A line that waits for the person's yes is titled as Today's own line is, so the two never disagree. */
function useLineWords(): (line: Line, queue: QueueLine | undefined) => string {
  const { t, tn } = useWords();
  const title = useLineTitle();
  return (line, queue) => lineWords(line, queue, t, tn, title);
}

function lineWords(line: Line, queue: QueueLine | undefined, t: T, tn: Tn, title: (q: QueueLine) => string): string {
  const name = line.person_name ?? "";
  const text = plainTitle(line.text ?? "");
  const date = day(line.day);
  switch (line.kind) {
    case "closed":
      return name ? t("brief.line.closed", { name, text }) : t("brief.line.closed_rule", { text });
    case "moved":
      if (line.change === "meeting") return t("brief.line.moved_meeting", { text, date });
      return name ? t("brief.line.moved", { name, text, date }) : t("brief.line.moved_unnamed", { text, date });
    case "moved_ahead":
      return t("brief.line.moved_ahead", { text, date });
    case "news":
      if (line.detail) return name ? t("brief.line.news", { name, text, detail: line.detail }) : t("brief.line.news_unnamed", { text, detail: line.detail });
      return name ? t("brief.line.news_bare", { name, text }) : t("brief.line.news_bare_unnamed", { text });
    case "invitation":
      return invitation(line, t);
    case "own_due":
      if (line.state === "today") return t(line.at ? "brief.line.own_due.today_at" : "brief.line.own_due.today", { text, time: clock(line.at) });
      return tn("brief.line.own_due.overdue", line.days ?? 0, { text });
    case "owed_late":
      return tn("brief.line.owed_late", line.days ?? 0, { name, text });
    case "dated": {
      const kind = line.change === "renewal" || line.change === "expiry" ? line.change : "deadline";
      const days = line.days ?? 0;
      return days === 0 ? t(`brief.line.dated.${kind}.today`, { text }) : tn(`brief.line.dated.${kind}`, days, { text, date });
    }
    case "meeting_wait": {
      const vars = { name, text, other: plainTitle(line.other ?? ""), time: clock(line.at) };
      return name ? t("brief.line.meeting_wait", vars) : t("brief.line.meeting_wait_unnamed", vars);
    }
    case "clash":     {
      const vars = { text, other: plainTitle(line.other ?? ""), date, time: clock(line.at) };
      if (line.state !== "travel") return tn("brief.line.clash", line.minutes ?? 0, vars);
      // The time between the meetings is what the travel asked for less what falls short.
      const needed = line.needed_minutes ?? 0;
      const need = durationWords(needed, tn);
      const between = Math.max(0, needed - (line.minutes ?? 0));
      return line.place && line.other_place
        ? tn("brief.line.clash.travel", between, { ...vars, need, from: line.place, to: line.other_place })
        : tn("brief.line.clash.travel_apart", between, { ...vars, need });
    }
    case "capacity":
      return t("brief.line.capacity", { needed: durationWords(line.needed_minutes ?? 0, tn), free: durationWords(line.minutes ?? 0, tn) });
    case "digest":
      if (line.change?.startsWith("pattern_")) return tn(`brief.line.digest.${line.change}`, line.count ?? 1, { name, text });
      if (line.change === "stale" && text) return t("brief.line.digest.stale_named", { text });
      return line.change === "escalate" ? t("brief.line.digest.escalate", { name, text }) : tn(`brief.line.digest.${line.change}`, line.count ?? 1);
    case "yes":
      if (line.change === "reminder_offer") return t("brief.line.reminder_offer", { text, date, time: clock(line.at) });
      return queue ? title(queue) : text || t("brief.line.yes");
    case "done":
      return line.you ? t("brief.line.done_you", { text }) : name ? t("brief.line.done_them", { name, text }) : t("brief.line.done_anyone", { text });
    case "carried":
      return t("brief.line.carried", { text });
    case "waiting":
      return line.day ? t("brief.line.waiting_due", { name, text, date }) : t("brief.line.waiting", { name, text });
    case "waiting_answer":
      return t("brief.line.waiting_answer", { name, text });
    case "week_promise": {
      const late = line.state === "overdue";
      if (line.you) return t(late ? "brief.line.week.overdue" : "brief.line.week.due", { text, date });
      return t(late ? "brief.line.week.owed_overdue" : "brief.line.week.owed", { name, text, date });
    }
    case "send_question":
      return t("brief.line.send_question", { name, text });
    case "chase_answer":
      return t("brief.line.chase_answer", { name, text });
    case "decision":
      return t("brief.line.decision", { text });
    case "on_today": {
      // What Today already has a line for is counted here, never listed again.
      const n = line.count ?? 0;
      return line.change === "late" ? tn("brief.line.on_today.late", n) : line.change === "clash" ? tn("brief.line.on_today.clash", n) : tn("brief.line.on_today.need", n);
    }
    default:
      return text;
  }
}

/** Where a suggestion that waited for the brief is dealt with, since its line isn't on Today. */
const DIGEST_VIEW: Record<string, View> = { stale: "work/open", unfiled: "records/projects", escalate: "work/followups", learned: "records/knowledge", catch_up: "records/knowledge" };

function LineRow(props: { line: Line; queue: QueueLine | undefined; onOpenRecord: (kind: string, id: string) => void; onOpenView?: (view: View) => void }) {
  const { t } = useWords();
  const act = useAct();
  const words = useLineWords();
  const { line } = props;
  const offer = line.kind === "yes" && line.change === "reminder_offer" && line.link && line.when ? { action: line.link.id, at: line.when } : null;
  const remind = () => {
    if (!offer) return;
    void act(
      () => api.remind(offer.action, { at: offer.at }),
      (result) => ({ message: t("brief.remind.saved", { text: line.text ?? "" }), undo: () => api.undo(result.changeset) }),
    );
  };
  const view = line.kind === "digest" && line.change ? DIGEST_VIEW[line.change] : undefined;
  const open = () => {
    if (view && props.onOpenView) {
      if (line.change === "stale") chooseFilters({ state: "stale" });
      props.onOpenView(view);
      return;
    }
    if (line.queue && reveal("line", line.queue)) return;
    if (line.link) props.onOpenRecord(line.link.kind, line.link.id);
  };
  const opens = !offer && (Boolean(line.queue) || Boolean(line.link) || Boolean(view && props.onOpenView));
  const meta = [line.kind === "own_due" && line.person_name ? t("brief.line.own_due.for", { name: line.person_name }) : "", line.kind === "week_promise" && line.you && line.person_name ? t("brief.line.week.to", { name: line.person_name }) : "", line.on_today_line ? t("brief.line.on_today_marked") : "", line.ready ? t("brief.ready") : ""].filter(Boolean);
  return (
    <li className={styles.line} data-kind={line.kind}>
      <span className={styles.what}>{words(line, props.queue)}</span>
      {meta.length > 0 && <span className={styles.meta}>{meta.join(" · ")}</span>}
      {offer && (
        <Button size="sm" className={styles.open} onClick={remind}>
          {t("brief.remind")}
        </Button>
      )}
      {opens && (
        <Button size="sm" className={styles.open} onClick={open} aria-label={line.kind === "on_today" ? `${t("brief.show_lines")}: ${words(line, props.queue)}` : undefined}>
          {line.kind === "on_today" ? t("brief.show_lines") : t("brief.open")}
        </Button>
      )}
    </li>
  );
}

/** The goals for the week: the proposed or confirmed ones, and a small form to set them (the cursor in the first field). */
function Goals(props: { goals: NonNullable<Brief["goals"]> }) {
  const { t } = useWords();
  const act = useAct();
  const { goals } = props;
  const [editing, setEditing] = useState(false);
  const [rows, setRows] = useState<string[]>([]);
  const [problem, setProblem] = useState(false);
  const first = useRef<HTMLInputElement>(null);
  const shown = goals.confirmed ? goals.goals : goals.proposed;
  const id = useId();
  const keep = async (list: string[]) => {
    const kept = await act(
      () => api.putGoals({ goals: list }),
      (result) => ({ message: t("brief.goals.saved"), undo: () => api.putGoals({ goals: result.previous }) }),
    );
    if (kept) setEditing(false);
  };
  const edit = () => {
    const start = shown.length > 0 ? shown : [""];
    setRows(start);
    setProblem(false);
    setEditing(true);
    window.setTimeout(() => first.current?.focus(), 0);
  };
  const save = () => {
    const list = rows.map((r) => r.trim()).filter(Boolean);
    if (list.length < goals.fewest) {
      setProblem(true);
      return;
    }
    void keep(list);
  };
  return (
    <div className={styles.block} data-block="goals">
      <h3 className={styles.sub}>{t("brief.goals.title")}</h3>
      {editing ? (
        <form
          className={styles.form}
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <p className="hint">{t("brief.goals.count", { fewest: goals.fewest, most: goals.most })}</p>
          <ul className={styles.rows}>
            {rows.map((row, n) => (
              <li key={n} className={styles.goalRow}>
                <label htmlFor={`${id}-${n}`} className="sr">
                  {t("brief.goals.field", { n: n + 1 })}
                </label>
                <input
                  id={`${id}-${n}`}
                  ref={n === 0 ? first : undefined}
                  type="text"
                  value={row}
                  maxLength={200}
                  placeholder={t("brief.goals.field", { n: n + 1 })}
                  onChange={(e) => setRows(rows.map((r, i) => (i === n ? e.target.value : r)))}
                />
                <Button onClick={() => setRows(rows.filter((_, i) => i !== n))}>
                  {t("brief.goals.drop", { n: n + 1 })}
                </Button>
              </li>
            ))}
          </ul>
          {problem && (
            <p className="hint" role="alert">
              {t("brief.goals.too_few", { fewest: goals.fewest })}
            </p>
          )}
          <div className={styles.actions}>
            {rows.length < goals.most && (
              <Button onClick={() => setRows([...rows, ""])}>
                {t("brief.goals.add")}
              </Button>
            )}
            <Button type="submit" variant="primary">
              {t("brief.goals.save")}
            </Button>
            <Button onClick={() => setEditing(false)}>
              {t("brief.goals.cancel")}
            </Button>
          </div>
        </form>
      ) : (
        <>
          {shown.length > 0 ? (
            <>
              <p className="hint">{goals.confirmed ? t("brief.goals.confirmed") : t("brief.goals.proposed")}</p>
              <ol className={styles.goalList}>
                {shown.map((g) => (
                  <li key={g}>{g}</li>
                ))}
              </ol>
            </>
          ) : (
            <p className="hint">{t("brief.goals.none")}</p>
          )}
          <div className={styles.actions}>
            {!goals.confirmed && shown.length >= goals.fewest && (
              <Button variant="primary" onClick={() => void keep(shown)}>
                {t("brief.goals.use")}
              </Button>
            )}
            <Button onClick={edit}>{shown.length > 0 ? t("brief.goals.change") : t("brief.goals.set")}</Button>
          </div>
        </>
      )}
    </div>
  );
}

/** The message to whoever the person reports to: ask for it, see where it stands, read the draft, copy it. */
function Message(props: { message: NonNullable<Brief["message"]> }) {
  const { t } = useWords();
  const act = useAct();
  const money = useMoney();
  const { push } = useToasts();
  const { message } = props;
  const names = message.to.map((p) => p.name).join(", ");
  // Where the account can carry it out, Send drafts the message as an act that waits for the person's yes beside Copy.
  const draftAct = useDraftAct();
  const sending = useSendOptions(message.state === "draft" || message.state === "kept").data;
  const canSend = !!sending?.can_act && message.to.length > 0;
  const send = (text: string) =>
    void draftAct({
      kind: "message",
      action: "send",
      account: sending?.account ?? undefined,
      recipients: message.to.map((p) => ({ person: p.person, kind: "email", role: "to", called_out: false, from_text: false })),
      parts: { subject: t("brief.message.subject"), body: text },
    });
  const copy = async (text: string, accept: boolean) => {
    if ((await copyMessage(text)) === "blocked") {
      push({ message: t("brief.message.copy_blocked") });
      return;
    }
    if (accept) await act(() => api.briefMessageCopied(), () => ({ message: t("brief.message.copied") }));
    else push({ message: t("brief.message.copied") });
  };
  let body: ReactNode;
  switch (message.state) {
    case "none":
      body = (
        <Button onClick={() => void act(() => api.askBriefMessage({}), () => ({ message: t("brief.message.asked") }))}>{t("brief.message.ask")}</Button>
      );
      break;
    case "working":
      body = <p className="hint">{t("brief.message.working")}</p>;
      break;
    case "needs_go":
      body = <p className="hint">{message.estimate_usd != null ? t("brief.message.needs_go_cost", { cost: money(message.estimate_usd) }) : t("brief.message.needs_go")}</p>;
      break;
    default:
      body = (
        <>
          <p className="hint">{message.state === "draft" ? t("brief.message.draft") : t("brief.message.kept")}</p>
          <p className={styles.message} data-message={message.state}>
            {message.text}
          </p>
          <div className={styles.actions}>
            {canSend && (
              <Button variant="primary" onClick={() => send(message.text ?? "")}>
                {t("brief.message.send")}
              </Button>
            )}
            <Button variant={canSend ? undefined : "primary"} onClick={() => void copy(message.text ?? "", message.state === "draft")}>
              {t("brief.message.copy")}
            </Button>
          </div>
        </>
      );
  }
  return (
    <div className={styles.block} data-block="message">
      <h3 className={styles.sub}>{t("brief.message.title", { names })}</h3>
      <p className="hint">{t(canSend ? "brief.message.hint_send" : "brief.message.hint")}</p>
      {body}
    </div>
  );
}

/** Asked once, when nobody is marked as someone the person reports to: who the weekly message is for, or nobody. */
function WhoFor(props: { message: NonNullable<Brief["message"]> }) {
  const { t } = useWords();
  const act = useAct();
  const id = useId();
  // The people on the job, but not the ones the person serves or who work for them: a customer, a supplier or staff is not
  // who they report to. The one they gave as their manager is picked to begin with.
  const said = (role: string | null | undefined) => (role ?? "").trim().toLowerCase();
  const not = ["customer", "supplier", "staff"].map((r) => t(`walkthrough.people.role.${r}`).toLowerCase());
  const choices = (props.message.choices ?? []).filter((c) => !not.includes(said(c.role)));
  const managers = choices.filter((c) => said(c.role) === t("walkthrough.people.role.manager").toLowerCase());
  const [chosenBy, setPicked] = useState<string | null>(null);
  const picked = chosenBy ?? (managers.length === 1 ? managers[0].person : "");
  const mark = () => {
    const chosen = choices.find((c) => c.person === picked);
    if (!chosen) return;
    void act(
      () => api.briefMessageFor({ person: chosen.person }),
      (result) => ({ message: t("brief.message.who_saved", { name: chosen.name }), undo: () => api.undo(result.changeset ?? "") }),
    );
  };
  const nobody = () =>
    void act(
      () => api.briefMessageFor({ nobody: true }),
      () => ({ message: t("brief.message.who_none_saved"), undo: () => api.briefMessageFor({ nobody: false }) }),
    );
  return (
    <div className={styles.block} data-block="message" data-message-ask="">
      <h3 className={styles.sub}>{t("brief.message.who_title")}</h3>
      <p className="hint">{t("brief.message.who_hint")}</p>
      <div className={styles.actions}>
        {choices.length > 0 && (
          <>
            <label htmlFor={`${id}-who`} className="sr">
              {t("brief.message.who_label")}
            </label>
            <Select id={`${id}-who`} value={picked} onChange={(e) => setPicked(e.target.value)}>
              <option value="">{t("brief.message.who_pick")}</option>
              {choices.map((c) => (
                <option key={c.person} value={c.person}>
                  {c.name}
                </option>
              ))}
            </Select>
            <Button variant="primary" disabled={!picked} reason={picked ? undefined : t("brief.message.who_why_disabled")} onClick={mark}>
              {t("brief.message.who_save")}
            </Button>
          </>
        )}
        <Button onClick={nobody}>{t("brief.message.who_nobody")}</Button>
      </div>
    </div>
  );
}

export function BriefCard(props: {
  workspace: string;
  onOpenRecord: (kind: string, id: string) => void;
  onOpenView?: (view: View) => void;
  /** Called when the card is closed for the day, so the screen around it can count it gone. */
  onClosed?: () => void;
}) {
  const { t, tn } = useWords();
  const act = useAct();
  const [asked, setAsked] = useState<Form | null>(null);
  useBriefClosings();
  // On the phone the card is folded to its title until it is opened.
  const narrow = useIsNarrow();
  const [unfolded, setUnfolded] = useState(false);
  const found = useBrief(asked);
  const queue = useQueue();
  const filter = useSideFilter();
  // How many things need the person is Today's own count (the heading's), so the two never disagree.
  const needing = useTodayCount(filter.choice);
  const id = useId();
  const data = found.data;
  if (!data || data.form === null) return null;
  const form = data.form;
  if (closedFor(props.workspace, form, data.day)) {
    if (!briefHasContent(data)) return null;
    return (
      <p className={styles.reopen} data-brief-closed={form}>
        <Button variant="quiet" onClick={() => reopenFor(props.workspace, form, data.day)}>
          {form === "morning" ? t("brief.show.morning") : form === "evening" ? t("brief.show.evening") : t("brief.show.monday")}
        </Button>
      </p>
    );
  }
  const byKey = new Map((queue.data ?? []).map((line) => [line.key, line]));
  const others = data.forms.filter((f) => f !== form);
  const title = form === "morning" ? t(isAfternoon(new Date(), data.afternoon_from_hour) ? "brief.title.afternoon" : "brief.title.morning") : form === "evening" ? t("brief.title.evening") : t("brief.title.monday");
  const showWords = (f: Form) => (f === "morning" ? t("brief.show.morning") : f === "evening" ? t("brief.show.evening") : t("brief.show.monday"));
  const quiet = form === "morning" ? t("brief.quiet.morning") : form === "evening" ? t("brief.quiet.evening") : t("brief.quiet.monday");
  if (narrow && !unfolded) {
    return (
      <section className={styles.card} aria-labelledby={`${id}-head`} data-brief={form} data-folded="">
        <h2 id={`${id}-head`} className={styles.title}>
          <button type="button" className={styles.foldToggle} aria-expanded={false} onClick={() => setUnfolded(true)}>
            {title}
          </button>
        </h2>
      </section>
    );
  }
  return (
    <section className={styles.card} aria-labelledby={`${id}-head`} data-brief={form}>
      <div className={styles.head}>
        <h2 id={`${id}-head`} className={styles.title}>
          {narrow ? (
            <button type="button" className={styles.foldToggle} aria-expanded onClick={() => setUnfolded(false)}>
              {title}
            </button>
          ) : (
            title
          )}
        </h2>
        <div className={styles.headActions}>
          {/* A day with nothing in it has no other forms to ask for: the brief shows by itself at its time. */}
          {!data.quiet &&
            others.map((f) => (
              <Button key={f} onClick={() => setAsked(f)}>
                {showWords(f)}
              </Button>
            ))}
          {/* The week's briefing is offered until it is used or dismissed; dismissing ends the offer for this week only. */}
          {(form === "monday" || (!data.quiet && others.includes("monday"))) && (
            <Button
              variant="quiet"
              onClick={() =>
                void act(
                  () => api.dismissWeekly(),
                  () => ({ message: t("brief.weekly.dismissed"), undo: () => api.undismissWeekly() }),
                ).then(() => setAsked(null))
              }
            >
              {t("brief.weekly.dismiss")}
            </Button>
          )}
          <Button
            variant="quiet"
            onClick={() => {
              closeFor(props.workspace, form, data.day);
              props.onClosed?.();
              void act(
                async () => undefined,
                () => ({ message: t("brief.closed"), undo: async () => reopenFor(props.workspace, form, data.day) }),
              );
            }}
          >
            {t("brief.close")}
          </Button>
        </div>
      </div>
      {data.on_today > 0 && (
        <p className={styles.summary} data-brief-summary="">
          {tn("brief.on_today", data.on_today)}
        </p>
      )}
      {data.message && (data.message.state === "ask" ? <WhoFor message={data.message} /> : <Message message={data.message} />)}
      {data.sections.map((section) => ({ section, lines: section.lines.filter((line) => onSide(line.side, filter.choice)) })).filter(({ section, lines }) => lines.length > 0 || section.lines.length === 0).map(({ section, lines }) => (
        <div key={section.key} className={styles.section} data-section={section.key}>
          <h3 className={styles.sub}>{heading(section.key, t)}</h3>
          <ul className={styles.lines}>
            {lines.map((line) => (
              <LineRow key={line.key} line={line.kind === "on_today" && line.change === "need" && needing ? { ...line, count: needing } : line} queue={line.queue ? byKey.get(line.queue) : undefined} onOpenRecord={props.onOpenRecord} onOpenView={props.onOpenView} />
            ))}
          </ul>
          {section.more > 0 && <p className="hint">{tn("brief.more", section.more)}</p>}
        </div>
      ))}
      {data.quiet && <p className={styles.quiet}>{quiet}</p>}
      {data.goals && <Goals goals={data.goals} />}
    </section>
  );
}
