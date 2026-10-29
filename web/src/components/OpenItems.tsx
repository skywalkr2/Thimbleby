// To-dos and questions (design 7.5, 6.8, 6.9): every open to-do and every open question in one place each. A to-do row
// has its owners, due date, project (and the project that holds it), where it came from, and its state; a question row
// who it waits on and since when. Both are narrowed by project, person and state, each chosen from a list. A row's one
// primary act is the likeliest next step, and the rest are in its menu: edit, reassign, merge a near-duplicate, hold,
// drop, a note to the assistant. Every act is the person's own, at once, with Undo; the server records its signal.
import { useQuery } from "@tanstack/react-query";
import { useId, useRef, useState, type ReactNode } from "react";
import { api } from "../lib/api";
import { useReviewTime } from "../lib/review-time";
import { useAct } from "../lib/act";
import { day, monthDay } from "../lib/dates";
import { useRowKeys } from "../lib/keys";
import {
  ACTION_STATES,
  QUESTION_STATES,
  actionsShown,
  questionsShown,
  takeFilters,
  type Filters,
  type OpenAction,
  type OpenQuestion,
} from "../lib/open-items";
import { useSaid } from "../lib/repeat";
import { revealOrKeep } from "../lib/reveal";
import { openOnToday } from "./AnswerOnToday";
import { onSide, useSideFilter, useSides } from "../lib/sides";
import { toHash } from "../lib/views";
import { useWords } from "../lib/wording";
import { Pill } from "../ui/Pill";
import { Row } from "../ui/Row";
import { Skeleton } from "../ui/Skeleton";
import { AskChooser } from "./AskChooser";
import { SideFilter } from "./SideFilter";
import { useChangeThis, useQuestionMenu } from "./ChangeThis";
import { useDropAction } from "./DropAction";
import { useAddTodo } from "./AddTodo";
import { useEditAction } from "./EditAction";
import { Button } from "../ui/Button";
import { useStopRepeat } from "./StopRepeat";
import { NoteBox, useNoted } from "./NoteBox";
import { LearnedLines } from "./Learned";
import { HoldNote, useHold } from "./OnHold";
import styles from "./OpenItems.module.css";
import { OriginLink } from "./Origin";
import { useHandToAssistant } from "./HandToAssistant";
import { usePlaceText } from "../lib/place";
import { ProjectTag } from "./ProjectTag";
import { NotesTitle } from "./ActionNotes";
import { useReassign } from "./ReassignAction";
import { dateAndTime, useRemindMe } from "./ReminderLine";
import type { MenuAction } from "./RowMenu";
import { RowMenu } from "./RowMenu";
import { plainTitle } from "../lib/title-dates";

import { EmptyState } from "../ui/EmptyState";
import { FilterChip } from "../ui/FilterChip";
import { PageHeader } from "../ui/PageHeader";
import { RoundCheck } from "../ui/RoundCheck";
import { TabStrip } from "../ui/TabStrip";
import { RowList } from "../ui/RowList";
type Tab = "actions" | "questions";
type T = (key: string, vars?: Record<string, string | number>) => string;

export function OpenItems() {
  const { t, tn } = useWords();
  useReviewTime("open");
  const items = useQuery({ queryKey: ["open-items"], queryFn: api.openItems });
  const projects = useQuery({ queryKey: ["projects"], queryFn: api.projects });
  const [tab, setTab] = useState<Tab>("actions");
  const [filters, setFilters] = useState<Filters>(takeFilters);
  const ids = useId();
  const addTodo = useAddTodo();
  // With a side beside Personal, the list can be narrowed to one side; what is on no side shows under every choice.
  const side = useSideFilter();
  const actions = (items.data?.actions ?? []).filter((a) => onSide(a.side, side.choice));
  const questions = (items.data?.questions ?? []).filter((q) => onSide(q.side, side.choice));

  const projectName = (id: string) => projects.data?.find((p) => p.id === id)?.name ?? actions.find((a) => a.project === id)?.project_name ?? id;
  const projectChoices = [...new Set(tab === "actions" ? actions.filter((a) => !a.side_name).map((a) => a.project).filter((p): p is string => !!p) : questions.flatMap((q) => q.projects ?? []))]
    .map((id) => ({ id, name: projectName(id) }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const personChoices = [
    ...new Map((tab === "actions" ? actions.flatMap((a) => a.owners.map((o) => [o.person, o.name] as const)) : questions.map((q) => [q.to, q.to_name] as const))).entries(),
  ]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
  // With no side beside Personal the projects are the areas of the person's life, and a to-do with no owner is their own,
  // so neither "Project" nor "No owner" is offered to narrow by.
  const { justMe } = useSides();
  const states: readonly string[] = tab === "actions" ? ACTION_STATES.filter((s) => !(justMe && s === "no_owner")) : QUESTION_STATES;

  const shownActions = actionsShown(actions, filters);
  const shownQuestions = questionsShown(questions, filters);
  const shown = tab === "actions" ? shownActions.length : shownQuestions.length;
  const set = (patch: Partial<Filters>) => setFilters((now) => ({ ...now, ...patch }));
  const choose = (next: Tab) => {
    setTab(next);
    set({ state: "" });
  };

  return (
    <section className="panel-section" aria-labelledby="open-title" data-open-items="">
      <PageHeader
        id="open-title"
        title={t("open.title")}
        primary={
          !items.isPending && actions.length + questions.length > 0 ? (
            <Button variant="primary" icon="plus" onClick={addTodo.open}>
              {t("addtodo.open")}
            </Button>
          ) : undefined
        }
        tabs={
          <TabStrip
            label={t("open.tabs")}
            value={tab}
            onChange={choose}
            options={[
              { value: "actions", label: t("open.tab.actions"), count: actions.length },
              { value: "questions", label: t("open.tab.questions"), count: questions.length },
            ]}
          />
        }
        filters={
          <>
            {!items.isPending && !items.isError && actions.length + questions.length > 0 && (
              <>
                <Choice id={`${ids}-person`} label={t("open.filter.person")} value={filters.person} onChange={(v) => set({ person: v })} none={t("person.everyone")} options={personChoices.map((p) => [p.id, p.name])} />
                <Choice id={`${ids}-state`} label={t("open.filter.state")} value={filters.state} onChange={(v) => set({ state: v })} none={t("open.filter.any_state")} options={states.map((s) => [s, t(`open.${tab === "actions" ? "state" : "qstate"}.${s}`)])} />
                <Choice id={`${ids}-project`} label={t(justMe ? "open.filter.area" : "open.filter.project")} value={filters.project} onChange={(v) => set({ project: v })} none={t(justMe ? "open.filter.all_areas" : "open.filter.all_projects")} options={projectChoices.map((p) => [p.id, p.name])} />
              </>
            )}
            <SideFilter waiting="open" />
          </>
        }
      />
      {addTodo.form}
      {items.isPending ? (
        <Skeleton />
      ) : items.isError ? (
        <EmptyState icon="alert" text={t("open.load_failed")} action={{ label: t("action.try_again"), onClick: () => void items.refetch() }} />
      ) : actions.length + questions.length === 0 ? (
        <EmptyState
          icon="check"
          text={side.choice === "all" ? t("open.empty") : t("sides.empty.open", { side: side.named })}
          action={{ label: t("addtodo.open"), onClick: addTodo.open, primary: true }}
        />
      ) : (
        <>
          {shown === 0 ? (
            <EmptyState text={t("open.none_match")} />
          ) : tab === "actions" ? (
            <RowList aria-label={t("open.list.actions")}>
              {shownActions.map((a) => (
                <ActionRow key={a.id} action={a} />
              ))}
            </RowList>
          ) : (
            <RowList aria-label={t("open.list.questions")}>
              {shownQuestions.map((q) => (
                <QuestionRow key={q.id} question={q} />
              ))}
            </RowList>
          )}
          <p className="hint">{tn("open.count", shown)}</p>
        </>
      )}
    </section>
  );
}

function Choice(props: { id: string; label: string; value: string; onChange: (v: string) => void; none: string; options: Array<[string, string]> }) {
  // A filter with fewer than two real choices besides "all" changes nothing; one already set stays so the person can clear it.
  if (props.options.length < 2 && !props.value) return null;
  return <FilterChip label={props.label} value={props.value} onChange={props.onChange} options={[["", props.none], ...props.options]} />;
}

/** The pieces of a meta line, with a dot between them. */
function join(parts: Array<ReactNode | null | undefined | false | "">): ReactNode {
  const kept = parts.filter((p) => p !== null && p !== undefined && p !== false && p !== "");
  return kept.map((p, i) => (
    <span key={i}>
      {i > 0 && " · "}
      {p}
    </span>
  ));
}

function ActionRow(props: { action: OpenAction }) {
  const { t, tn } = useWords();
  const place = usePlaceText();
  const act = useAct();
  const noted = useNoted();
  const a = props.action;
  const ref = useRef<HTMLLIElement & HTMLDivElement>(null);
  const focus = () => ref.current?.focus();
  const [noting, setNoting] = useState(false);
  const [asking, setAsking] = useState(false);
  const hold = useHold(a);
  const change = useChangeThis({ kind: "action", id: a.id }, focus);
  const drop = useDropAction(a, focus);
  const reassign = useReassign(a, focus);
  const hand = useHandToAssistant(a, focus);
  const edit = useEditAction(a, focus);
  const remind = useRemindMe(a.id, a.remind_at, focus);
  const stopRepeat = useStopRepeat(a);
  const said = useSaid();
  const done = (note?: string) =>
    act(
      () => api.actionStatus(a.id, "done", note),
      (result) => ({ message: noted(t("toast.action_done"), result.request), undo: () => api.actionStatus(a.id, "open") }),
    );
  const twin = a.duplicate;
  const merge: MenuAction | null = twin
    ? {
        id: "merge",
        label: t("open.merge", { text: twin.text }),
        run: () =>
          void act(
            () => api.mergeActions(a.id, { other: twin.id, read_version: a.version, other_version: twin.version }),
            (result) => ({ message: t("open.merged", { text: twin.text }), undo: () => api.undo(result.changeset) }),
          ),
      }
    : null;
  const unowned = a.state === "no_owner";
  useRowKeys(ref, { primary: unowned ? () => setAsking(true) : () => void done() });
  const menu: MenuAction[] = [
    ...(unowned ? [] : [{ id: "note", label: t("note.add"), run: () => setNoting(true) } satisfies MenuAction]),
    ...(unowned ? [] : [edit.entry, reassign.entry]),
    ...(merge ? [merge] : []),
    ...(unowned || !hand.entry ? [] : [hand.entry]),
    ...(unowned ? [] : [...remind.entries, hold.entry]),
    ...(stopRepeat ? [stopRepeat] : []),
    change.entry,
    drop.entry,
  ];
  const meta = join([
    a.owners.length > 0 ? a.owners.map((o) => o.name).join(", ") : t("open.nobody"),
    a.to_send && (
      <strong key="s" className={styles.toSend} data-to-send="">
        {t("action.to_send")}
      </strong>
    ),
    a.due && t(a.due_check ? "op.meta.due_check" : "op.meta.due", { date: day(a.due) }),
    a.remind_at && t("today.todo.reminder", { when: dateAndTime(a.remind_at) }),
    a.repeat && (
      <span key="r" data-repeat="" title={said(a.repeat)}>
        {t("repeat.mark")}
      </span>
    ),
    place({ name: a.project_name, side: a.side_name, parent: a.parent_name }) && <ProjectTag key="p" name={a.project_name} side={a.side_name} parent={a.parent_name} />,
    a.state === "stale" && a.untouched_days != null && tn("open.untouched", a.untouched_days),
    a.on_hold || a.blocker ? <HoldNote key="h" on_hold={a.on_hold} blocker={a.blocker} due={a.due} /> : null,
  ]);
  const title = <NotesTitle notes={a.notes}>{plainTitle(a.text, a.due)}</NotesTitle>;
  return (
    <Row
      ref={ref}
      lead={
        unowned ? undefined : <RoundCheck label={t("followups.mark_done")} data-key="primary" onClick={() => void done()} />
      }
      pill={pillOf(a, t)}
      title={title}
      meta={
        <>
          {meta}
          <OriginLink origin={a.origin} />
        </>
      }
      primary={
        unowned && a.owner_question ? (
          <Button variant="primary" data-key="primary" aria-expanded={asking} onClick={() => setAsking(!asking)}>
            {t("queue.act.pick_owner")}
          </Button>
        ) : undefined
      }
      menu={<RowMenu label={a.text} actions={menu} />}
    >
      {asking && a.owner_question && <AskChooser ask={{ id: a.owner_question, about: "owner", options: [], suggestion: null }} />}
      {noting && (
        <NoteBox
          sends={[{ label: t("followups.mark_done"), run: done }]}
          onClose={() => {
            setNoting(false);
            focus();
          }}
        />
      )}
      {edit.form}
      {reassign.form}
      {hand.form}
      {remind.form}
      {hold.form}
      {change.form}
      {drop.form}
      <LearnedLines records={[a.id]} />
    </Row>
  );
}

function pillOf(a: OpenAction, t: T): ReactNode {
  switch (a.state) {
    case "overdue":
      return <Pill tone="danger">{t("open.state.overdue")}</Pill>;
    case "stale":
      return <Pill tone="warn">{t("open.state.stale")}</Pill>;
    case "no_owner":
      return <Pill tone="warn">{t("open.state.no_owner")}</Pill>;
    case "on_hold":
      return <Pill tone="neutral">{t("open.state.on_hold")}</Pill>;
    default:
      return undefined;
  }
}

function QuestionRow(props: { question: OpenQuestion }) {
  const { t, tn } = useWords();
  const place = usePlaceText();
  const q = props.question;
  const ref = useRef<HTMLLIElement & HTMLDivElement>(null);
  const focus = () => ref.current?.focus();
  const menu = useQuestionMenu(q, { canMarkSent: q.state === "not_sent", onClosed: focus });
  const change = useChangeThis({ kind: q.kind === "decision" ? "decision" : "question", id: q.id }, focus);
  // The step itself is elsewhere: a question to the person is answered on Today, and the reply and the message are in
  // Follow-ups. The row takes the person to it.
  const open = () => {
    if (q.state === "yours") {
      openOnToday(q.id);
      return;
    }
    if (!revealOrKeep("person", q.to)) window.location.hash = toHash("work/followups");
  };
  useRowKeys(ref, { primary: open });
  const label = { yours: "followups.answer_on_today", waiting: "followups.record_reply", not_sent: "open.q.to_send", later: "open.q.to_send" }[q.state];
  const who =
    q.state === "yours"
      ? t("open.q.on_you")
      : q.state === "waiting"
        ? t("open.q.waiting_on", { name: q.to_name })
        : q.state === "later"
          ? t("open.q.held", { name: q.to_name, date: q.held_until ? monthDay(q.held_until) : "" })
          : t("open.q.not_sent", { name: q.to_name });
  const meta = join([
    who,
    q.since && t("open.q.since", { date: monthDay(q.since) }),
    q.waiting_days != null && tn("open.q.days", q.waiting_days),
    q.chases > 0 && tn("open.q.chases", q.chases),
    place({ name: q.project_name, side: q.side_name }) && <ProjectTag key="p" name={q.project_name} side={q.side_name} />,
  ]);
  return (
    <Row
      ref={ref}
      pill={q.state === "waiting" || q.state === "yours" ? undefined : <Pill tone="neutral">{t(`open.qstate.${q.state}`)}</Pill>}
      title={q.title}
      meta={
        <>
          {meta}
          <OriginLink origin={q.origin} />
        </>
      }
      primary={
        <Button variant="primary" data-key="primary" onClick={open}>
          {t(label)}
        </Button>
      }
      menu={<RowMenu label={q.title} actions={[...menu.entries, change.entry]} />}
    >
      {menu.form}
      {change.form}
    </Row>
  );
}
