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
import { useIsNarrow } from "../lib/media";
import { day, monthDay, todayOn } from "../lib/dates";
import { useRowKeys } from "../lib/keys";
import {
  ACTION_STATES,
  NO_FILTERS,
  QUESTION_STATES,
  actionsShown,
  dueToday,
  groupActions,
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
import { useSideSlot } from "../lib/marks";
import { recordView, toHash, viewHref } from "../lib/views";
import { useWords } from "../lib/wording";
import { Pill } from "../ui/Pill";
import { Icon } from "../ui/Icon";
import { GroupLabel } from "../ui/GroupLabel";
import { MarkDot } from "../ui/MarkDot";
import { InlineAddTodo } from "./InlineAddTodo";
import { Row } from "../ui/Row";
import { FilteredEmpty } from "../ui/FilteredEmpty";
import { ListState } from "../ui/ListState";
import { AskChooser } from "./AskChooser";
import { SideFilter } from "./SideFilter";
import { useChangeThis, useQuestionMenu } from "./ChangeThis";
import { closeEditorOf, useOneEditor } from "../lib/one-editor";
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
import { NeedsADateLine } from "./NeedsADate";
import { ProjectTag } from "./ProjectTag";
import { ViewTags, useViewLabels } from "./ViewTags";
import { NotesTitle } from "./ActionNotes";
import { dateAndTime, useRemindMe } from "./ReminderLine";
import type { MenuAction } from "./RowMenu";
import { RowMenu } from "./RowMenu";
import { shortTitle } from "../lib/title-dates";

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
  const narrow = useIsNarrow();
  const [tab, setTab] = useState<Tab>("actions");
  const [filters, setFilters] = useState<Filters>(takeFilters);
  // The to-dos just ticked stay in their place, struck through, with Undo, until the person moves on (another tab or filter).
  const [settled, setSettled] = useState<Map<string, OpenAction>>(new Map());
  const ids = useId();
  const addTodo = useAddTodo();
  // With a side beside Personal, the list can be narrowed to one side; what is on no side shows under every choice.
  const side = useSideFilter();
  const actions = (items.data?.actions ?? []).filter((a) => onSide(a.side, side.picked, a.views, !!a.project_name));
  const questions = (items.data?.questions ?? []).filter((q) => onSide(q.side, side.picked, q.views, (q.projects ?? []).length > 0));

  // How many of the rows the open tab counts wait on the person: worked out from those rows, so the tab's number, the list and this
  // line never disagree (the side menu counts the same rows, of both tabs, under the same side choice).
  const needYou = tab === "actions" ? actions.filter((a) => a.needs_you).length : questions.filter((q) => q.state === "yours").length;
  const total = tab === "actions" ? actions.length : questions.length;

  // "12 open · 1 overdue · 2 due today": the to-dos and the questions, the same rows the tabs count.
  const late = actions.filter((a) => a.state === "overdue").length;
  const today = todayOn(new Date());
  const dueNow = dueToday(actions, today);
  const openAll = actions.length + questions.length;
  const subtitle =
    openAll === 0 ? undefined : (
      <>
        <strong>{tn("open.subtitle", openAll)}</strong>
        {late > 0 && ` · ${t("open.subtitle.overdue", { n: late })}`}
        {dueNow > 0 && ` · ${t("open.subtitle.today", { n: dueNow })}`}
      </>
    );

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

  // The to-dos that need a date are a group of their own at the top of the to-dos, and not in the list below it.
  const narrowed = actionsShown(actions, filters);
  const needDate = narrowed.filter((a) => a.needs_date);
  const shownActions = narrowed.filter((a) => !a.needs_date);
  const shownQuestions = questionsShown(questions, filters);
  const shown = tab === "actions" ? shownActions.length : shownQuestions.length;
  const set = (patch: Partial<Filters>) => {
    setSettled(new Map());
    setFilters((now) => ({ ...now, ...patch }));
  };
  const choose = (next: Tab) => {
    setTab(next);
    set({ state: "" });
  };
  const gone = (a: OpenAction) => setSettled((now) => new Map(now).set(a.id, a));
  const undone = (id: string) =>
    setSettled((now) => {
      const next = new Map(now);
      next.delete(id);
      return next;
    });
  const stillOpen = new Set(actions.map((a) => a.id));
  const ticked = [...settled.values()].filter((a) => !stillOpen.has(a.id) && actionsShown([a], filters).length > 0);

  return (
    <section className="panel-section" aria-labelledby="open-title" data-open-items="">
      <PageHeader
        id="open-title"
        title={t("open.title")}
        subtitle={subtitle}
        primary={
          !items.isPending && actions.length + questions.length > 0 ? (
            <Button variant="primary" icon="plus" onClick={() => addTodo.open()}>
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
      <ListState query={items} failed={t("open.load_failed")}>
        {() =>
          actions.length + questions.length === 0 ? (
            side.choice !== "all" ? (
              <FilteredEmpty text={t("sides.empty.open", { side: side.named })} onClear={() => side.set("all")} />
            ) : (
              <EmptyState icon="check" text={t("open.empty")} action={{ label: t("addtodo.open"), onClick: () => addTodo.open(), primary: true }} />
            )
          ) : (
            <>
              {shown + (tab === "actions" ? needDate.length : 0) === 0 ? (
                // A tab with nothing in it says so; "nothing matches" is only for rows the filters hid.
                total === 0 ? (
                  <EmptyState icon="check" text={t(`open.empty.${tab}`)} />
                ) : (
                  <FilteredEmpty text={t("open.none_match")} onClear={() => setFilters(NO_FILTERS)} />
                )
              ) : tab === "actions" ? (
                // With no row to list (every to-do waits for a date) what is left is the add row and one line, which are not a list.
                <RowList aria-label={shownActions.length > 0 ? t("open.list.actions") : undefined} role={shownActions.length > 0 ? undefined : "presentation"} className={styles.todoList}>
                  <InlineAddTodo onDetails={addTodo.open} />
                  {groupActions([...shownActions, ...ticked], today).map(({ group, rows }) => (
                    <TodoGroupRows key={group} group={group} rows={rows} inlineOrigin={narrow} ticked={new Set(ticked.map((a) => a.id))} onDone={gone} onUndone={undone} />
                  ))}
                  <NeedsADateLine rows={needDate} />
                </RowList>
              ) : shown === 0 ? null : (
                <RowList aria-label={t("open.list.questions")}>
                  {shownQuestions.map((q) => (
                    <QuestionRow key={q.id} question={q} inlineOrigin={narrow} />
                  ))}
                </RowList>
              )}
              {total > 0 && <p className="hint" data-need-count="">{tn(`open.need.${tab}`, needYou, { total })}</p>}
            </>
          )
        }
      </ListState>
    </section>
  );
}

/** One group of the to-dos: its label with the count, then its rows. The label is a part of the list, not a row of it. */
function TodoGroupRows(props: { group: string; rows: OpenAction[]; inlineOrigin: boolean; ticked: Set<string>; onDone: (a: OpenAction) => void; onUndone: (id: string) => void }) {
  const { t } = useWords();
  const id = useId();
  return (
    <>
      <li role="presentation" className={styles.groupItem}>
        <GroupLabel id={id} as="h3" count={props.rows.filter((a) => !props.ticked.has(a.id)).length} tone={props.group === "overdue" ? "danger" : "plain"} data-todo-group={props.group}>
          {t(`open.group.${props.group}`)}
        </GroupLabel>
      </li>
      {props.rows.map((a) =>
        props.ticked.has(a.id) ? (
          <DoneRow key={a.id} action={a} onUndone={props.onUndone} />
        ) : (
          <ActionRow key={a.id} action={a} inlineOrigin={props.inlineOrigin} onDone={props.onDone} />
        ),
      )}
    </>
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

function ActionRow(props: { action: OpenAction; inlineOrigin: boolean; onDone?: (a: OpenAction) => void }) {
  const { t, tn } = useWords();
  const place = usePlaceText();
  const act = useAct();
  const noted = useNoted();
  const a = props.action;
  const ref = useRef<HTMLLIElement & HTMLDivElement>(null);
  const focus = () => ref.current?.focus();
  const [noting, setNoting] = useOneEditor(`${a.id}:note`);
  const [asking, setAsking] = useOneEditor(`${a.id}:owner`);
  const hold = useHold(a);
  const drop = useDropAction(a, focus);
  const hand = useHandToAssistant(a, focus);
  const edit = useEditAction(a, focus);
  const remind = useRemindMe(a.id, a.remind_at, focus);
  const stopRepeat = useStopRepeat(a);
  const said = useSaid();
  const done = (note?: string) =>
    act(
      async () => {
        const result = await api.actionStatus(a.id, "done", note);
        props.onDone?.(a);
        return result;
      },
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
  // Escape closes the editor that is open on this row and hands the cursor back to it.
  const escape = (e: React.KeyboardEvent) => {
    if (e.key === "Escape" && closeEditorOf(a.id)) {
      e.stopPropagation();
      focus();
    }
  };
  // The menu's sections: what changes the to-do, then when it comes back, then taking it away (in red, last).
  const menu: MenuAction[] = [
    ...(unowned ? [] : [{ id: "note", label: t("note.add"), run: () => setNoting(true) } satisfies MenuAction]),
    edit.entry,
    ...(merge ? [merge] : []),
    ...(unowned || !hand.entry ? [] : [hand.entry]),
  ];
  const timing: MenuAction[] = [...(unowned ? [] : [...remind.entries, hold.entry]), ...(stopRepeat ? [stopRepeat] : [])];
  const inViews = useViewLabels(a.views);
  const people = useQuery({ queryKey: ["people"], queryFn: api.people });
  const me = people.data?.find((p) => p.is_pm)?.id;
  const slot = useSideSlot()(a.side);
  const today = todayOn(new Date());
  // The owners are named when one of them is somebody else; a to-do that is the person's own doesn't say so on every line.
  const others = a.owners.filter((o) => o.person !== me).map((o) => o.name);
  const dueWords = a.due
    ? a.due_check
      ? t("op.meta.due_check", { date: day(a.due) })
      : a.state === "overdue"
        ? t("open.due", { date: day(a.due) })
        : a.due.slice(0, 10) === today
          ? t("open.due_today")
          : t("open.due", { date: day(a.due) })
    : null;
  const dueMark =
    dueWords && !a.due_check && a.state === "overdue" ? (
      <span key="d" className={styles.dueLate} data-due="late">
        <Icon name="alert" size={16} />
        {dueWords}
      </span>
    ) : dueWords && a.due?.slice(0, 10) === today && !a.due_check ? (
      <strong key="d" className={styles.dueToday} data-due="today">
        {dueWords}
      </strong>
    ) : (
      dueWords
    );
  const placeMark = place({ name: a.project_name, side: a.side_name, parent: a.parent_name }) ? (
    <span key="p" className={styles.placeMark}>
      {slot !== null && <MarkDot kind="side" slot={slot} />}
      <ProjectTag name={a.project_name} side={a.side_name} parent={a.parent_name} />
    </span>
  ) : null;
  const meta = join([
    others.length > 0 && others.join(", "),
    a.to_send && (
      <strong key="s" className={styles.toSend} data-to-send="">
        {t("action.to_send")}
      </strong>
    ),
    dueMark,
    a.remind_at && t("today.todo.reminder", { when: dateAndTime(a.remind_at) }),
    a.repeat && (
      <span key="r" data-repeat="" title={said(a.repeat)}>
        {t("repeat.mark")}
      </span>
    ),
    placeMark,
    inViews.length > 0 && <ViewTags key="v" views={a.views} />,
    a.state === "stale" && a.untouched_days != null && tn("open.untouched", a.untouched_days),
    a.on_hold || a.blocker ? <HoldNote key="h" on_hold={a.on_hold} blocker={a.blocker} due={a.due} /> : null,
  ]);
  // The title opens the to-do's own page.
  const title = (
    <NotesTitle notes={a.notes}>
      <a href={viewHref(recordView("action", a.id))}>{shortTitle(a.text, a.due, 2)}</a>
    </NotesTitle>
  );
  return (
    <Row
      ref={ref}
      onKeyDown={escape}
      clamp={shortTitle(a.text, a.due, 2) !== a.text ? a.text : undefined}
      lead={
        unowned ? undefined : <RoundCheck label={t("followups.mark_done")} data-key="primary" onClick={() => void done()} />
      }
      pill={pillOf(a, t)}
      title={title}
      meta={
        <>
          {meta}
          <OriginLink origin={a.origin} inline={props.inlineOrigin} />
        </>
      }
      primary={
        unowned && a.owner_question ? (
          <Button variant="primary" data-key="primary" aria-expanded={asking} onClick={() => setAsking(!asking)}>
            {t("queue.act.pick_owner")}
          </Button>
        ) : undefined
      }
      menu={
        <RowMenu
          label={a.text}
          actions={menu}
          groups={[
            { id: "timing", entries: timing },
            { id: "remove", entries: [drop.entry] },
          ]}
        />
      }
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
      {hand.form}
      {remind.form}
      {hold.form}
      {drop.form}
      {hand.line}
      <LearnedLines records={[a.id]} />
    </Row>
  );
}

/** A to-do just ticked: it stays where it was, struck through, with when it was done and Undo, until the person moves on. */
function DoneRow(props: { action: OpenAction; onUndone: (id: string) => void }) {
  const { t } = useWords();
  const act = useAct();
  const a = props.action;
  const undo = () =>
    void act(
      async () => {
        const result = await api.actionStatus(a.id, "open");
        props.onUndone(a.id);
        return result;
      },
      undefined,
    );
  return (
    <Row
      data-done-row=""
      lead={<Icon name="check" size={18} />}
      title={<span className={styles.doneTitle}>{a.text}</span>}
      meta={t("open.done_just_now")}
      primary={
        <Button variant="quiet" size="sm" onClick={undo} aria-label={t("open.undo_named", { text: a.text })}>
          {t("toast.undo")}
        </Button>
      }
    />
  );
}

function pillOf(a: OpenAction, t: T): ReactNode {
  switch (a.state) {
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

function QuestionRow(props: { question: OpenQuestion; inlineOrigin: boolean }) {
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
  const inViews = useViewLabels(q.views);
  const meta = join([
    who,
    q.since && t("open.q.since", { date: monthDay(q.since) }),
    q.waiting_days != null && tn("open.q.days", q.waiting_days),
    q.chases > 0 && tn("open.q.chases", q.chases),
    place({ name: q.project_name, side: q.side_name }) && <ProjectTag key="p" name={q.project_name} side={q.side_name} />,
    inViews.length > 0 && <ViewTags key="v" views={q.views} />,
  ]);
  return (
    <Row
      ref={ref}
      pill={q.state === "waiting" || q.state === "yours" ? undefined : <Pill tone="neutral">{t(`open.qstate.${q.state}`)}</Pill>}
      title={q.title}
      meta={
        <>
          {meta}
          <OriginLink origin={q.origin} inline={props.inlineOrigin} />
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
