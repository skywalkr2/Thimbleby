// Follow-ups by person (design 7.5): the PM first (decisions and their own actions, each a link to the screen where it is
// acted on), then everyone A to Z, each with one clean message to copy, then mark sent. The To send tab also holds what
// waits for the person's approval to go out (design 7.4), above the messages, in one list | detail. The message can be edited where it is shown; what is marked sent is the box's text.
// The same follow-ups can be shown as a table (Message | Table) and copied as one: as an HTML table for mail and chat, or as
// tab-separated cells for a spreadsheet. The table is on screen before anything is copied, and no AI run makes it.
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { api, type S } from "../lib/api";
import { useReviewTime } from "../lib/review-time";
import { useAct } from "../lib/act";
import { actTitle, useWaitingActs } from "../lib/acts";
import { copyBoth, copyMessage, copyPlain, type CopyResult } from "../lib/copy";
import { day, todayOn, monthDay, sinceDay } from "../lib/dates";
import { tablesOf, toHtml, toTsv, type TableWords } from "../lib/followup-table";
import { sendKeyTo, useRowKeys, type RowKey } from "../lib/keys";
import { choiceRow, useListChoice, type ListChoice } from "../lib/list-choice";
import { useIsNarrow, useMediaQuery } from "../lib/media";
import { showRow, useReveal } from "../lib/reveal";
import { hasSeenMessage, markMessageSeen } from "../lib/seen-messages";
import { onSide, useSideFilter, useSides, type SideChoice } from "../lib/sides";
import { useToasts } from "../lib/toasts";
import { viewHref } from "../lib/views";
import { useHandedToast, useWaitsForStart } from "../lib/handed-toast";
import { useWords } from "../lib/wording";
import { AfterMoveAnswers } from "./AfterMoveAnswers";
import { AnswerOnToday } from "./AnswerOnToday";
import { AskChooser } from "./AskChooser";
import { useChangeThis, useQuestionMenu } from "./ChangeThis";
import { LearnedLines } from "./Learned";
import { useDropAction } from "./DropAction";
import { HoldNote, useHold } from "./OnHold";
import { useHoldFor, useSendNow } from "./HoldFor";
import { NotesTitle } from "./ActionNotes";
import { NoteBox, useNoted } from "./NoteBox";
import { NudgeLeftOut } from "./NudgeLeftOut";
import { OriginLink } from "./Origin";
import { OutsideStep } from "./OutsideStep";
import { usePlaceText } from "../lib/place";
import { ProjectTag } from "./ProjectTag";
import { useReassign } from "./ReassignAction";
import { RowMenu, type MenuAction } from "./RowMenu";
import { useAddOwnRequest } from "./HandIn";
import { SafeLink, SafeText } from "./SafeText";
import { Button } from "../ui/Button";
import { ListDetail } from "../ui/ListDetail";
import { SegmentedControl } from "../ui/SegmentedControl";
import { Skeleton } from "../ui/Skeleton";
import { FollowUpTables, tableBar, tableHint } from "./FollowUpTable";
import { SideFilter } from "./SideFilter";
import { MessageStyle } from "./MessageStyle";
import { ActsList, actKey } from "./ToSendActs";
import { OutgoingDetail } from "./OutgoingDetail";
import { SentActs } from "./SentActs";
import { FollowUpsByProject } from "./FollowUpsByProject";
import { ReviewMode } from "./ReviewMode";
import { CurrentCopy } from "./SameDocument";
import { plainTitle } from "../lib/title-dates";
import { Pill } from "../ui/Pill";

import { EmptyState } from "../ui/EmptyState";
import { PageHeader } from "../ui/PageHeader";
import { TabStrip } from "../ui/TabStrip";
import { Actions } from "../ui/Actions";
import { RowList, DetailItem } from "../ui/RowList";
import { SectionRow } from "../ui/SectionRow";
import { DetailTop } from "../ui/DetailTop";
import { RowBody } from "../ui/RowBody";
import { ItemList, Item } from "../ui/ItemList";
import { ExpandableRow } from "../ui/Row";
type Group = "person" | "project";
type Filter = "send" | "later" | "waiting";
const FILTERS: Filter[] = ["send", "later", "waiting"];

const toSendQuestions = (s: S["FollowupSection"]) => s.questions.filter((q) => q.status === "open");
/** Ready to send to this owner: never told, and not a promise they made themselves (which they know already). */
const isToSend = (a: S["FollowupAction"]) => a.to_send;
const toSendActions = (s: S["FollowupSection"]) => s.actions.filter(isToSend);
const waitingQuestions = (s: S["FollowupSection"]) => s.questions.filter((q) => q.status === "sent");
// What was told to the person, and the promises they made themselves (design 6.33): one state each, never also to send.
const waitingActions = (s: S["FollowupSection"]) => s.actions.filter((a) => !isToSend(a));

/** The rows of a section that show under a side choice: those on that side and those on neither. */
const rowsOnSide = (s: S["FollowupSection"], choice: SideChoice): S["FollowupSection"] => ({
  ...s,
  questions: s.questions.filter((q) => onSide(q.side, choice)),
  later: (s.later ?? []).filter((q) => onSide(q.side, choice)),
  actions: s.actions.filter((a) => onSide(a.side, choice)),
});
const hasRows = (s: S["FollowupSection"]) => s.questions.length + (s.later ?? []).length + s.actions.length > 0;

/** The rows of a section that a tab (To send, Later, Waiting on them) holds, for the grouping by project, which lists rows
 * and not people. The person's own section is what waits on them under To send. */
function rowsOnTab(s: S["FollowupSection"], filter: Filter): S["FollowupSection"] {
  if (filter === "later") return { ...s, questions: [], actions: [] };
  if (s.is_pm) return filter === "send" ? { ...s, later: [] } : { ...s, questions: [], actions: [], later: [] };
  if (filter === "send") return { ...s, questions: toSendQuestions(s), actions: toSendActions(s), later: [] };
  return { ...s, questions: waitingQuestions(s), actions: waitingActions(s), later: [] };
}

/** What shows under a side choice. The person's own section and the by-project list are filtered row by row. Someone
 * else's section is one message to them, so it stays whole while any of its rows shows, and goes when none does. */
function sectionsOnSide(found: S["FollowupSection"][], choice: SideChoice, byProject: boolean): S["FollowupSection"][] {
  if (choice === "all") return found;
  return found.flatMap((s) => {
    if (s.is_pm || byProject) {
      const kept = rowsOnSide(s, choice);
      return hasRows(kept) ? [kept] : [];
    }
    return hasRows(rowsOnSide(s, choice)) ? [s] : [];
  });
}

/** `compact` is for a narrow column on Today: headings sit one level down, and the PM's own actions are left to the to-do list beside it. */
export function FollowUps(props: { compact?: boolean }) {
  const { t } = useWords();
  const compact = !!props.compact;
  // The full screen counts as time spent looking over the assistant's work; the compact one on Today is part of that screen.
  useReviewTime("followups", !compact);
  const [filter, setFilter] = useState<Filter>("send");
  const [group, setGroup] = useState<Group>("person");
  const followups = useQuery({ queryKey: ["followups"], queryFn: api.followups });
  const latest = useRef(followups.data);
  latest.current = followups.data;
  // A row the person is sent to (a question to answer, a person's group): once the list shows it, it is chosen and in view.
  const [picked, setPicked] = useState<{ key: string; n: number; focus: boolean; enter?: boolean } | null>(null);
  // A link to a person's group (a to-do that waits on them): the filter that shows them is chosen, and their group is looked at.
  const seek = (person: string) => {
    const found = latest.current?.find((s) => !s.is_pm && s.person === person);
    if (!found) return false;
    setGroup("person");
    setFilter(waitingQuestions(found).length + waitingActions(found).length > 0 ? "waiting" : "send");
    setPicked({ key: person, n: Date.now(), focus: true });
    return true;
  };
  useReveal("person", seek);
  const present = (followups.data ?? []).filter(
    (s) => s.questions.length || (s.later ?? []).length || (s.actions.length && !(compact && s.is_pm)),
  );
  const side = useSideFilter();
  // With no side beside Personal the follow-ups are by person only: there is no grouping by project to choose.
  const { justMe } = useSides();
  const byProject = group === "project" && !justMe;
  const sections = sectionsOnSide(present, side.choice, byProject);
  // By project the tab picks the rows, since a project holds rows of several people.
  const projectSections = byProject ? sections.map((s) => rowsOnTab(s, filter)).filter(hasRows) : sections;
  const shown = sections.filter((s) =>
    filter === "send"
      ? s.is_pm || s.to_send > 0
      : filter === "later"
        ? (s.later ?? []).length > 0
        : !s.is_pm && waitingQuestions(s).length + waitingActions(s).length > 0,
  );
  // The list | detail choice (design 7.13): beside the list the first row is chosen as the list opens; below 1024px a row opens
  // its detail as a drawer.
  const beside = useMediaQuery("(min-width: 1024px)") && !compact;
  // What waits to go out is the first part of To send, ahead of the messages: one list, one detail.
  const acts = useWaitingActs();
  const actRows = !compact && !byProject && filter === "send" ? (acts.data ?? []) : [];
  // With nothing to follow up on any tab (and nothing waiting to go out), the choices between tabs and groupings change nothing, so
  // they are not drawn until there is something. The side choice is the screen's own and stays.
  const nothingAnywhere = followups.isSuccess && present.length === 0 && (compact || (!acts.isPending && (acts.data ?? []).length === 0));
  // What waits to go out leads the list, so no row is chosen as the first until it has been read: the messages below may be
  // here sooner, and the first row would then be one of them.
  const actsComing = !compact && !byProject && filter === "send" && acts.isPending;
  const choice = useListChoice({
    keys: [...actRows.map((a) => actKey(a.id)), ...shown.map((s) => s.person)],
    beside,
    reset: `${group}|${filter}|${side.choice}`,
    wait: actsComing,
  });
  useEffect(() => {
    if (!picked) return;
    if (picked.enter) choice.enter(picked.key);
    else choice.choose(picked.key);
    // A person's line takes the cursor here.
    if (picked.focus) showRow(choiceRow(picked.key) ?? document.getElementById("followups-group-title"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picked]);
  // The acts the person has looked at again since they went stale; a fresh read keeps it.
  const [looked, setLooked] = useState<Record<string, true>>({});
  // Another part of the app (a Today line, a record page) asks for an act to be opened; it may be asked before the list has loaded.
  const [wantAct, setWantAct] = useState<string | null>(null);
  useReveal("act", (id) => {
    setWantAct(id);
    return true;
  });
  useEffect(() => {
    if (wantAct === null || !acts.data) return;
    const held = acts.data.some((a) => a.id === wantAct);
    // The list kept from an earlier visit may be older than the act asked for (it was drafted since): while it is being read
    // again the request waits for that, and is dropped only when a read that has finished doesn't hold the act either.
    if (!held && acts.isFetching) return;
    if (held) {
      setGroup("person");
      setFilter("send");
      setPicked({ key: actKey(wantAct), n: Date.now(), focus: false, enter: true });
    }
    setWantAct(null);
  }, [wantAct, acts.data, acts.isFetching]);
  const selectedAct = actRows.find((a) => actKey(a.id) === choice.chosen) ?? null;
  const selected = shown.find((s) => s.person === choice.chosen) ?? null;
  // What a person's message keeps while it is shown on the line and in the detail.
  const [messages, setMessages] = useState<Record<string, MessageState>>({});
  const sharedMessage = (person: string) => ({
    state: messages[person] ?? { draft: null, copied: false },
    set: (patch: Partial<MessageState>) => setMessages((all) => ({ ...all, [person]: { ...(all[person] ?? { draft: null, copied: false }), ...patch } })),
  });
  // On a phone the messages to send can be gone through one at a time (design 7.1).
  const phone = useIsNarrow() && !compact;
  const [reviewing, setReviewing] = useState(false);
  const reviewable = filter === "send" && group === "person" ? shown.filter((s) => !s.is_pm).map((s) => ({ id: s.person, section: s })) : [];
  const detailOf = (s: S["FollowupSection"]) =>
    filter === "later" ? (
      <LaterSection section={s} pane />
    ) : s.is_pm ? (
      <YourSection section={s} compact={compact} pane />
    ) : filter === "send" ? (
      <PersonSection section={s} pane shared={sharedMessage(s.person)} />
    ) : (
      <WaitingSection section={s} compact={compact} pane />
    );

  return (
    <section className={compact ? "panel-section compact" : "panel-section"} aria-labelledby="followups-title">
      <PageHeader
        id="followups-title"
        level={compact ? 3 : 1}
        title={t("followups.title")}
        tabs={
          !nothingAnywhere ? (
            <TabStrip label={t("followups.filter")} value={filter} onChange={setFilter} options={FILTERS.map((f) => ({ value: f, label: t(`followups.filter.${f}`) }))} />
          ) : undefined
        }
        filters={
          <>
            {!compact && !justMe && !nothingAnywhere && (
              <SegmentedControl
                label={t("followups.group")}
                value={group}
                onChange={setGroup}
                options={[
                  { value: "person", label: t("followups.group.person") },
                  { value: "project", label: t("followups.group.project") },
                ]}
              />
            )}
            <SideFilter waiting="followups" />
          </>
        }
      />
      {followups.isPending ? (
        <Skeleton />
      ) : followups.isError ? (
        <EmptyState icon="alert" text={t("followups.load_failed")} action={{ label: t("action.try_again"), onClick: () => void followups.refetch() }} />
      ) : sections.length === 0 && actRows.length === 0 ? (
        <EmptyState text={present.length > 0 ? t("sides.empty.followups", { side: side.named }) : t("followups.empty")} />
      ) : byProject ? (
        projectSections.length === 0 ? (
          <EmptyState text={t(`followups.empty_${filter}`)} />
        ) : (
          <FollowUpsByProject sections={projectSections} compact={compact} beside={beside} onOpenPerson={(person) => void (seek(person) || (setGroup("person"), setFilter("send")))} />
        )
      ) : shown.length === 0 && actRows.length === 0 ? (
        <EmptyState text={t(`followups.empty_${filter}`)} />
      ) : reviewing && phone && reviewable.length > 0 ? (
        <ReviewMode
          own
          progress="followups.review.progress"
          items={reviewable}
          render={(item) => <PersonSection key={item.id} section={item.section} open />}
          onClose={() => setReviewing(false)}
        />
      ) : shown.length === 1 && actRows.length === 0 && !compact ? (
        // One group has nothing to choose between: its items are shown in place, not as a list beside a pane that holds them.
        <div className="in-place" data-in-place="">
          <h2 id="followups-group-title" tabIndex={-1}>{shown[0].is_pm ? t("followups.you") : shown[0].name}</h2>
          <RowList as="ol" detail>{detailOf(shown[0])}</RowList>
        </div>
      ) : (
        <ListDetail
          title={selectedAct ? actTitle(selectedAct, t) : selected ? (selected.is_pm ? t("followups.you") : selected.name) : ""}
          onClose={choice.close}
          fit={FOLLOWUPS_FIT}
          detail={
            selectedAct ? (
              <OutgoingDetail
                key={`${selectedAct.id}:${selectedAct.fingerprint}`}
                act={selectedAct}
                looked={!!looked[selectedAct.id]}
                onLook={() => setLooked((now) => ({ ...now, [selectedAct.id]: true }))}
              />
            ) : selected ? (
              <RowList as="ol" detail>{detailOf(selected)}</RowList>
            ) : null
          }
        >
          {actRows.length > 0 && <ActsList acts={actRows} choice={choice} onLook={(id) => setLooked((now) => ({ ...now, [id]: true }))} />}
          {shown.length > 0 && actRows.length > 0 && <h2 id="followups-messages-title">{t("followups.messages_title")}</h2>}
          {shown.length > 0 && (
            <RowList as="ol" aria-labelledby={actRows.length > 0 ? "followups-messages-title" : undefined}>
              {phone && reviewable.length > 0 && (
                <li className="review-start">
                  <Button variant="primary" onClick={() => setReviewing(true)}>
                    {t("followups.review.start")}
                  </Button>
                </li>
              )}
              {shown.map((s) => (
                <FollowListRow
                  key={s.person}
                  section={s}
                  kind={filter === "later" ? "later" : s.is_pm ? "you" : filter}
                  choice={choice}
                  compact={compact}
                  copied={sharedMessage(s.person).state.copied}
                  message={sharedMessage(s.person).state.draft ?? s.message}
                  onCopied={() => sharedMessage(s.person).set({ copied: true })}
                />
              ))}
            </RowList>
          )}
        </ListDetail>
      )}
      {!compact && !byProject && filter === "send" && acts.isError && (
        <EmptyState icon="alert" text={t("outgoing.load_failed")} action={{ label: t("action.try_again"), onClick: () => void acts.refetch() }} />
      )}
      {!compact && !byProject && filter === "send" && acts.isSuccess && <SentActs />}
      {!compact && !byProject && filter === "send" && <MessageStyle />}
    </section>
  );
}

/** What the person's own section says it holds: decisions, questions and to-dos. */
function yourCounts(s: S["FollowupSection"], compact: boolean, tn: Tn): string {
  const decisions = s.questions.filter((q) => q.kind === "decision").length;
  const asked = s.questions.length - decisions;
  const actions = compact ? 0 : s.actions.length;
  return [decisions ? tn("followups.decisions", decisions) : "", asked ? tn("followups.questions", asked) : "", actions ? tn("followups.your_actions", actions) : ""]
    .filter(Boolean)
    .join(" · ");
}

/** The width the list needs beside the pane: a name, one line under it and the primary. */
const FOLLOWUPS_FIT = 420;

/** The cursor goes to the message in the detail once it is on screen (a drawer takes a moment to open). */
function focusMessage(tries = 12): void {
  const box = document.querySelector<HTMLTextAreaElement>("[data-detail-pane] textarea.msg, [data-modal-open] textarea.msg");
  if (box) box.focus();
  else if (tries > 0) window.requestAnimationFrame(() => focusMessage(tries - 1));
}

/** One person as a line of the list (design 7.13): who, how many asks and how long the oldest has waited, and on To send the
 * one primary, Copy. Choosing the line shows the person's message and asks in the detail; Copy on a line whose detail is not
 * shown shows it first, and the next Copy is the one that copies. */
function FollowListRow(props: {
  section: S["FollowupSection"];
  kind: "you" | "send" | "later" | "waiting";
  choice: ListChoice;
  compact: boolean;
  copied: boolean;
  /** The message as it stands now (the person's edit, or the assistant's wording). */
  message: string;
  /** Called once the line has copied the message itself, so the line and the detail say Mark sent. */
  onCopied: () => void;
}) {
  const { t, tn } = useWords();
  const { push } = useToasts();
  const { section: s, choice, kind } = props;
  const ref = useRef<HTMLLIElement>(null);
  const questions = waitingQuestions(s);
  const actions = waitingActions(s);
  // The longest anyone has waited, and whether it is time to follow up.
  const days = [...questions.map((q) => q.waiting_days), ...actions.map((a) => a.told_days)].filter((d): d is number => d !== null);
  const oldest = days.length ? Math.max(...days) : null;
  const chase = questions.some((q) => q.chase_due) || actions.some((a) => a.chase_due);
  const name = kind === "you" ? t("followups.you") : s.name;
  // A batch that has waited says since when ("ready since Tue"), so a stale one shows; one ready today says nothing of it.
  const since = sinceDay(s.ready_since, new Date());
  const sinceText = (what: string) => (since ? t("followups.ready_since", { what, day: since }) : what);
  const sub =
    kind === "you"
      ? yourCounts(s, props.compact, tn)
      : kind === "send"
        ? sinceText(tn("followups.to_send", s.to_send))
        : kind === "later"
          ? tn("followups.later_count", (s.later ?? []).length)
          : tn("followups.waiting_count", questions.length + actions.length);
  // The line's keys and button reach the person's message in the detail once it is shown there. Until then they show it, with
  // the cursor in the message, and the next press is the one that acts.
  const showFirst = () => {
    choice.choose(s.person);
    if (kind === "send") focusMessage();
  };
  // A message the person has already seen, exactly as it is now, is copied at once; a new or changed one is shown first.
  const copyAtOnce = async () => {
    if ((await copyMessage(props.message)) === "blocked") {
      showFirst();
      return;
    }
    markMessageSeen(s.person, props.message);
    props.onCopied();
    push({ message: t("toast.copied") });
  };
  const toDetail = (key: RowKey) => {
    const detail = choice.chosen === s.person ? document.querySelector<HTMLElement>("[data-detail-pane] [data-row], [data-modal-open] [data-row]") : null;
    if (detail) {
      sendKeyTo(detail, key);
      return;
    }
    if (kind === "send" && (key === "primary" || key === "copy") && !props.copied && hasSeenMessage(s.person, props.message)) {
      void copyAtOnce();
      return;
    }
    showFirst();
  };
  useRowKeys(ref, {
    toggle: () => choice.enter(s.person),
    primary: kind === "send" ? () => toDetail("primary") : undefined,
    copy: kind === "send" ? () => toDetail("copy") : undefined,
    edit: kind === "send" ? () => toDetail("edit") : undefined,
  });
  return (
    <ExpandableRow
      ref={ref}
      aria-label={name}
      {...choice.rowProps(s.person)}
      title={name}
      meta={
        <>
          {sub}
          {kind === "waiting" && <WaitingPill days={oldest} chase={chase} />}
        </>
      }
      expand={{ expanded: choice.chosen === s.person, inert: choice.chosen === s.person, onToggle: () => choice.choose(s.person) }}
      primary={
        kind === "send" ? (
          <Button variant="primary" onClick={() => toDetail("primary")}>
            {props.copied ? t("followups.mark_sent") : t("followups.copy_message")}
          </Button>
        ) : undefined
      }
    />
  );
}

function YourSection(props: { section: S["FollowupSection"]; compact: boolean; pane?: boolean }) {
  const { t, tn } = useWords();
  const s = props.section;
  const actions = props.compact ? [] : s.actions;
  const Heading = props.compact ? "h4" : "h3";
  return (
<SectionRow pane={props.pane} title={<Heading>{t("followups.you")}</Heading>} meta={yourCounts(s, props.compact, tn)}>
      {s.questions.length > 0 && (
        <ItemList pane={props.pane}>
          {s.questions.map((q) => (
            <YourQuestionRow key={q.id} question={q} />
          ))}
        </ItemList>
      )}
      {actions.length > 0 && (
        // Follow-ups is about other people: the person's own to-dos are one line that opens them where they are kept.
        <p className="hint" data-own-todos="">
          {tn("followups.your_actions", actions.length)} ·{" "}
          <a href={viewHref("work/open")}>{t("followups.open_your_todos")}</a>
        </p>
      )}
    </SectionRow>
  );
}

/** A decision or a question to the person, as Follow-ups lists it: what it is and where it came from, and a link to its line on
 * Today, where it is answered. Its menu keeps the other things that can be done with it (reword it, ask someone else, drop it). */
function YourQuestionRow(props: { question: S["FollowupQuestion"] }) {
  const { t } = useWords();
  const q = props.question;
  const ref = useRef<HTMLLIElement>(null);
  const who = q.about === "owner" || q.about === "held-op";
  const back = () => ref.current?.focus();
  const menu = useQuestionMenu(q, { canMarkSent: false, onClosed: back });
  const change = useChangeThis({ kind: q.kind === "decision" ? "decision" : "question", id: q.id }, back);
  const titleId = `your-q-${q.id}`;
  return (
    <Item row ref={ref}>
      <div>
        <div className="what">{t(who ? "followups.who_question" : q.kind === "decision" ? "followups.decision" : "followups.question")}</div>
        <div className="title" id={titleId}>
          {q.title}
        </div>
        {q.text && <SafeText text={q.text} />}
        {q.links.map((l) => (
          <div key={l.url}>
            <SafeLink label={l.label} url={l.url} />
          </div>
        ))}
        {q.from_outside && q.links.length > 0 && <OutsideStep word="outside.step.open" />}
        <OriginLink origin={q.origin} />
      </div>
      <Actions>
        <AnswerOnToday question={q.id} describedBy={titleId} />
        <RowMenu label={q.title} actions={[...menu.entries, change.entry]} />
      </Actions>
      {menu.form}
      {change.form}
      <LearnedLines records={[q.id]} />
    </Item>
  );
}

/** A question the person is asked. After a move, `check` gives it its own two answers in place of the answer form; `move` is
 * what it came after. `inLine`: the row sits under the line that already says the question, so it is not said again. */
export function DecisionRow(props: { question: S["FollowupQuestion"]; reveal: number; check?: S["AfterMoveCheck"] | null; move?: S["AfterMove"] | null; inLine?: boolean }) {
  const { t } = useWords();
  const act = useAct();
  const noted = useNoted();
  const q = props.question;
  const ref = useRef<HTMLLIElement>(null);
  const [answer, setAnswer] = useState("");
  const who = q.about === "owner" || q.about === "held-op";
  const back = () => ref.current?.focus();
  const menu = useQuestionMenu(q, { canMarkSent: false, onClosed: back });
  const change = useChangeThis({ kind: q.kind === "decision" ? "decision" : "question", id: q.id }, back);
  useEffect(() => {
    if (props.reveal) showRow(ref.current, true);
  }, [props.reveal]);
  return (
    <Item row ref={ref}>
      <div>
        {!props.inLine && <div className="what">{t(who ? "followups.who_question" : q.kind === "decision" ? "followups.decision" : "followups.question")}</div>}
        {!props.inLine && <div className="title">{q.title}</div>}
        {/* Words that only repeat the title are not shown a second time. */}
        {q.text && q.text.trim() !== q.title.trim() && <SafeText text={q.text} />}
        {q.links.map((l) => (
          <div key={l.url}>
            <SafeLink label={l.label} url={l.url} />
          </div>
        ))}
        {q.from_outside && q.links.length > 0 && <OutsideStep word="outside.step.open" />}
        <OriginLink origin={q.origin} />
      </div>
      <Actions>
        <RowMenu label={q.title} actions={[...menu.entries, change.entry]} />
      </Actions>
      {menu.form}
      {change.form}
      <LearnedLines records={[q.id]} />
      <div className="full">
        {who ? (
          <AskChooser ask={{ id: q.id, about: q.about ?? "other", options: q.options, name: null }} />
        ) : q.about === "version" ? (
          <CurrentCopy question={q.id} copies={q.options} />
        ) : props.check ? (
          <AfterMoveAnswers question={q} check={props.check} move={props.move} />
        ) : (
          <form
            className="answer-form"
            onSubmit={(e) => {
              e.preventDefault();
              void act(
                () => api.answer(q.id, { text: answer }),
                (done) => ({ message: noted(t("toast.answered"), done.request) }),
              );
            }}
          >
            <label className="hint" htmlFor={`ans-${q.id}`}>
              {t("followups.answer_label")}
            </label>
            <textarea id={`ans-${q.id}`} className="short" value={answer} onChange={(e) => setAnswer(e.target.value)} />
            <Actions align="end">
              <Button variant="primary" type="submit" data-key="primary" disabled={!answer.trim()}>
                {t("followups.answer")}
              </Button>
            </Actions>
          </form>
        )}
      </div>
    </Item>
  );
}

/** One of the person's own to-dos, as Follow-ups lists it: its words, due date and project, and a link to To-dos and questions,
 * where it is marked done and changed. */
type T = (key: string, vars?: Record<string, string | number>) => string;
type Tn = (key: string, n: number, vars?: Record<string, string | number>) => string;

function dueWords(a: S["FollowupAction"], t: T): string {
  return a.due ? t(a.due_check ? "op.meta.due_check" : "op.meta.due", { date: day(a.due) }) : "";
}

/** An ask that is an action says its project first, as a tag with the project it is part of when there is one, then `rest`. */
function ActionMeta(props: { a: S["FollowupAction"]; rest: string }) {
  const { a, rest } = props;
  const where = usePlaceText()({ name: a.project_name, parent: a.parent_name, side: a.side_name });
  return (
    <>
      {where && <ProjectTag name={a.project_name} parent={a.parent_name} side={a.side_name} />}
      {where && rest && " · "}
      {rest}
    </>
  );
}

/** What a person's message keeps while the list shows them and the detail edits them: the words as edited, and whether the
 * message has been copied (so its button says Mark sent). The screen holds it, so the list's line and the detail agree. */
export interface MessageState {
  draft: string | null;
  copied: boolean;
}

/** One person's message to send. `open` shows the message box from the start (the Today inspector). `pane` is the detail
 * beside the list: the person's name is the pane's heading and the message is always shown. `shared` holds the message's
 * state for a screen that shows it in two places. */
export function PersonSection(props: { section: S["FollowupSection"]; open?: boolean; pane?: boolean; shared?: { state: MessageState; set: (patch: Partial<MessageState>) => void } }) {
  const { t, tn } = useWords();
  const act = useAct();
  const { push } = useToasts();
  const { justMe } = useSides();
  const s = props.section;
  const ref = useRef<HTMLLIElement>(null);
  const area = useRef<HTMLTextAreaElement>(null);
  const [open, setOpen] = useState(!!props.open || !!props.pane);
  const [ownDraft, setOwnDraft] = useState<string | null>(null);
  const [ownCopied, setOwnCopied] = useState(false);
  const { shared } = props;
  const draft = shared ? shared.state.draft : ownDraft;
  const copied = shared ? shared.state.copied : ownCopied;
  const setDraft = (value: string | null) => (shared ? shared.set({ draft: value }) : setOwnDraft(value));
  const setCopied = (value: boolean) => (shared ? shared.set({ copied: value }) : setOwnCopied(value));
  const [view, setView] = useState<"message" | "table">("message");
  const message = draft ?? s.message;
  const questions = toSendQuestions(s);
  const actions = toSendActions(s);

  const edit = () => {
    setView("message");
    setOpen(true);
    window.setTimeout(() => area.current?.focus(), 0);
  };
  // Once the message is on screen it counts as seen, so Copy on its line later copies at once while it is unchanged.
  useEffect(() => {
    if (open) markMessageSeen(s.person, s.message);
  }, [open, s.person, s.message]);

  // Two deliberate steps. Copy only puts the text on the clipboard, formatted and plain together (mail and documents take
  // the formatting, chat the plain text); nothing changes on the server. Once it has copied, the card offers Mark sent,
  // which records the box's text as sent (with Undo). The row menu always offers Mark sent, for after a reload or a
  // message sent some other way, and Copy as plain text. If the browser blocks the copy, the text is selected for a
  // manual copy.
  const copyWith = async (put: (text: string) => Promise<CopyResult>, done: string) => {
    if (!message.trim()) return;
    if ((await put(message)) === "blocked") {
      setCopied(false);
      setOpen(true);
      window.setTimeout(() => {
        area.current?.focus();
        area.current?.select();
      }, 0);
      push({ message: t("toast.copy_blocked") });
      return;
    }
    markMessageSeen(s.person, message);
    setCopied(true);
    push({ message: t(done) });
  };
  const copy = () => copyWith(copyMessage, "toast.copied");
  const copyPlainText = () => copyWith(copyPlain, "toast.copied_plain");

  // The table is what the message holds, in rows: its words come from the sheet and nothing is added to it.
  const words: TableWords = {
    // A person with only their own life has everything in one place, so the table has no column for it.
    project: justMe ? null : t("followups.table.project"),
    action: t("followups.table.action"),
    question: t("followups.table.question"),
    due: t("followups.table.due"),
    asked: t("followups.table.asked"),
    link: t("followups.table.link"),
    update: t("followups.table.update"),
    answer: t("followups.table.answer"),
    notSent: t("followups.table.not_sent"),
    noLink: t("followups.table.no_link"),
    overdue: (date) => t("followups.table.overdue", { date }),
    side: (side) => t("side.not_in_project", { side }),
    due_day: day,
    asked_day: monthDay,
  };
  const tables = tablesOf(s, words, todayOn(new Date()));
  const preview = useRef<HTMLDivElement>(null);
  // If the browser won't copy, the table on screen is selected so the person can copy it by hand.
  const blocked = () => {
    setCopied(false);
    const shown = preview.current;
    if (shown) {
      const range = document.createRange();
      range.selectNodeContents(shown);
      window.getSelection()?.removeAllRanges();
      window.getSelection()?.addRange(range);
    }
    push({ message: t("toast.copy_blocked") });
  };
  /** Copies the table as HTML (with the tab-separated cells as its plain text), for mail and chat. */
  const copyTable = async () => {
    if (!tables.length) return;
    // A table that could not go as a table is not told as one: the table on screen is selected to copy by hand.
    if ((await copyBoth(toTsv(tables, words), toHtml(tables, words))) !== "formatted") {
      blocked();
      return;
    }
    setCopied(true);
    push({ message: t("toast.copied_table") });
  };
  /** Copies the table as tab-separated cells with full web addresses, for a spreadsheet. */
  const copySheet = async () => {
    if (!tables.length) return;
    if ((await copyPlain(toTsv(tables, words))) === "blocked") {
      blocked();
      return;
    }
    setCopied(true);
    push({ message: t("toast.copied_sheet") });
  };

  const markSent = async () => {
    if (!message.trim()) return;
    const result = await act(
      () => api.markSent(s.person, message),
      (counts) => ({
        message: t("toast.marked_sent", { name: s.name }),
        undo: () => api.unmarkSent(s.person, { question_ids: counts.question_ids, action_ids: counts.action_ids }),
      }),
    );
    if (result) {
      setDraft(null);
      setCopied(false);
    }
  };

  // Copy never reaches the clipboard unless the message it copies is on screen: on a closed card it opens the message
  // (with the cursor in it) and the next Copy is the one that copies.
  const copyShown = () => void (!open ? edit() : view === "table" ? copyTable() : copy());
  const primary = () => void (copied ? markSent() : copyShown());
  const hold = useHoldFor(questions, s.person);
  const menu: MenuAction[] = [
    { id: "edit", label: t("followups.edit"), run: edit },
    { id: "copy-plain", label: t("followups.copy_plain"), run: () => void (!open ? edit() : view === "table" ? copySheet() : copyPlainText()) },
    ...(questions.length > 1 ? [hold.messageEntry] : []),
    ...(questions.length > 0 ? [hold.entry] : []),
    { id: "mark-sent", label: t("followups.mark_sent"), run: () => void markSent() },
  ];
  useRowKeys(ref, {
    toggle: props.pane ? undefined : () => setOpen((v) => !v),
    primary,
    copy: copyShown,
    edit,
  });

  const buttons = (
    <Actions>
      <Button variant="primary" onClick={primary}>
        {copied ? t("followups.mark_sent") : t("followups.copy_message")}
      </Button>
      <RowMenu label={s.name} actions={menu} />
    </Actions>
  );
  const opened = (
    <>
          <SegmentedControl
            label={t("followups.view")}
            value={view}
            onChange={setView}
            options={[
              { value: "message", label: t("followups.view.message") },
              { value: "table", label: t("followups.view.table") },
            ]}
          />
          {view === "table" ? (
            <>
              <div ref={preview}>
                <FollowUpTables tables={tables} name={s.name} noLink={words.noLink} />
              </div>
              <div className={tableBar}>
                <Button variant="primary" disabled={!tables.length} onClick={() => void copyTable()}>
                  {t("followups.copy_table")}
                </Button>
                <Button disabled={!tables.length} onClick={() => void copySheet()}>
                  {t("followups.copy_sheet")}
                </Button>
                <p className={tableHint}>{t("followups.copy_table_hint")}</p>
                <Button variant={copied ? "primary" : "secondary"} onClick={() => void markSent()}>
                  {t("followups.mark_sent")}
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="what" id={`in-${s.person}`}>
                {t("followups.in_message")}
              </div>
              <ul className="plain-list" aria-labelledby={`in-${s.person}`}>
                {questions.map((q) => (
                  <li key={q.id}>
                    <span className="title">{q.title}</span>
                  </li>
                ))}
                {actions.map((a) => (
                  <li key={a.id}>
                    <span className="title">
                      <NotesTitle notes={a.notes}>{plainTitle(a.text, a.due)}</NotesTitle>
                    </span>
                    {(a.project_name || a.side_name || dueWords(a, t)) && (
                      <span className="meta">
                        <ActionMeta a={a} rest={dueWords(a, t)} />
                      </span>
                    )}
                  </li>
                ))}
              </ul>
              <div className="message">
                {(s.limited_out ?? []).map((x) => (
                  <p key={`${x.kind}:${x.id}`} className="hint" data-limited-out="">
                    {t("followups.limited_out", { name: s.name, text: x.text, names: x.limited_to })}
                  </p>
                ))}
                {s.withheld && (
                  <p className="hint" role="alert">
                    {s.withheld}
                  </p>
                )}
                <label className="hint" htmlFor={`msg-${s.person}`}>
                  {t("followups.message_label", { name: s.name })}
                </label>
                <textarea id={`msg-${s.person}`} className="msg" ref={area} value={message} onChange={(e) => setDraft(e.target.value)} />
                <Actions align="end">
                  <span className="hint">{t("followups.clean_copy")}</span>
                  {draft !== null && (
                    <Button variant="quiet" onClick={() => setDraft(null)}>
                      {t("followups.reset")}
                    </Button>
                  )}
                  <Button variant="primary" onClick={primary} disabled={!!s.withheld}>
                    {copied ? t("followups.mark_sent") : t("followups.copy_message")}
                  </Button>
                </Actions>
              </div>
            </>
          )}
    </>
  );
  if (props.pane) {
    return (
      <DetailItem data-row="" tabIndex={-1} ref={ref}>
        <DetailTop state={<span>{tn("followups.to_send", s.to_send)}</span>} actions={buttons} />
        {hold.form}
        {open && <RowBody pane>{opened}</RowBody>}
      </DetailItem>
    );
  }
  return (
    <ExpandableRow
      ref={ref}
      aria-labelledby={`p-${s.person}`}
      title={s.name}
      titleId={`p-${s.person}`}
      meta={tn("followups.to_send", s.to_send)}
      expand={{ expanded: open, onToggle: () => setOpen(!open) }}
      primary={
        <Button variant="primary" onClick={primary}>
          {copied ? t("followups.mark_sent") : t("followups.copy_message")}
        </Button>
      }
      menu={<RowMenu label={s.name} actions={menu} />}
    >
      {hold.form}
      {open && <RowBody>{opened}</RowBody>}
    </ExpandableRow>
  );
}

// Questions held for a meeting or a day, per person: out of To send until that day, with the way to send one now.
function LaterSection(props: { section: S["FollowupSection"]; pane?: boolean }) {
  const { tn } = useWords();
  const s = props.section;
  const later = s.later ?? [];
  return (
    <SectionRow pane={props.pane} title={s.name} titleId={`l-${s.person}`} meta={tn("followups.later_count", later.length)}>
      <ul className="plain-list" aria-label={s.name}>
        {later.map((q) => (
          <LaterQuestion key={q.id} question={q} />
        ))}
      </ul>
    </SectionRow>
  );
}

function LaterQuestion(props: { question: S["FollowupQuestion"] }) {
  const { t } = useWords();
  const q = props.question;
  const sendNow = useSendNow(q);
  const when = q.held_until ? day(q.held_until) : "";
  return (
    <li>
      <span className="title">{q.title}</span>
      <span className="meta">
        {q.held_for_name ? t("followups.later_for", { meeting: q.held_for_name, date: when }) : t("followups.later_until", { date: when })}
      </span>
      <RowMenu label={q.title} actions={[sendNow]} />
    </li>
  );
}

// What each person has already been sent or told, one line each, with the step that closes it.
export function WaitingSection(props: { section: S["FollowupSection"]; compact: boolean; nudgeOpen?: boolean; pane?: boolean }) {
  const { tn } = useWords();
  const s = props.section;
  const Heading = props.compact ? "h4" : "h3";
  const questions = waitingQuestions(s);
  const actions = waitingActions(s);
  return (
    <SectionRow
      pane={props.pane}
      tabIndex={-1}
      title={<Heading id={`w-${s.person}`}>{s.name}</Heading>}
      labelledBy={`w-${s.person}`}
      meta={tn("followups.waiting_count", questions.length + actions.length)}
    >
      {s.nudge && <NudgeCard section={s} nudge={s.nudge} start={!!props.nudgeOpen} />}
      <ItemList pane={props.pane}>
        {questions.map((q) => (
          <WaitingQuestion key={q.id} question={q} person={s.name} />
        ))}
        {actions.map((a) => (
          <WaitingAction key={a.id} action={a} person={s.person} name={s.name} />
        ))}
      </ItemList>
    </SectionRow>
  );
}

/** The drafted follow-up to one person, from a template with no AI run: what it lists, the message to edit, then Copy and
 * Mark sent, as for every message. Marking it sent records a chase on each item and starts the wait again; what the
 * message listed was first asked stays on each item. */
function NudgeCard(props: { section: S["FollowupSection"]; nudge: S["NudgeView"]; start: boolean }) {
  const { t, tn, has } = useWords();
  const act = useAct();
  const { push } = useToasts();
  const s = props.section;
  const { nudge } = props;
  const [open, setOpen] = useState(props.start);
  const [focusBox, setFocusBox] = useState(false);
  const [draft, setDraft] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const area = useRef<HTMLTextAreaElement>(null);
  const text = draft ?? nudge.text;
  const today = todayOn(new Date());
  const questions = s.questions.filter((q) => nudge.question_ids.includes(q.id));
  const actions = s.actions.filter((a) => nudge.action_ids.includes(a.id));
  const first = s.name.split(" ")[0];
  const round = has(`followups.nudge.round.${nudge.round}`) ? t(`followups.nudge.round.${nudge.round}`) : t("followups.nudge.round_n", { n: nudge.round });
  const copyWith = async (put: (text: string) => Promise<CopyResult>, done: string) => {
    if (!text.trim()) return;
    if ((await put(text)) === "blocked") {
      setCopied(false);
      area.current?.focus();
      area.current?.select();
      push({ message: t("toast.copy_blocked") });
      return;
    }
    setCopied(true);
    push({ message: t(done) });
  };
  const copy = () => copyWith(copyMessage, "toast.copied");
  const copyPlainText = () => copyWith(copyPlain, "toast.copied_plain");
  const markSent = async () => {
    if (!text.trim()) return;
    const done = await act(
      () => api.nudgeSent(s.person, { text, question_ids: nudge.question_ids, action_ids: nudge.action_ids }),
      (result) => ({
        message: t("toast.followed_up", { name: first }),
        undo: () =>
          api.nudgeUnsent(s.person, {
            question_ids: result.question_ids,
            action_ids: result.action_ids,
            on: result.on,
            previous_told: result.previous_told,
            signal_at: result.signal_at ?? null,
          }),
      }),
    );
    if (done) {
      setDraft(null);
      setCopied(false);
      setOpen(false);
    }
  };
  if (!open)
    return (
      <div className="nudge-start">
        <Button variant="primary"
          onClick={() => {
            setFocusBox(true);
            setOpen(true);
          }}
        >
          {t("followups.nudge.draft")}
        </Button>
      </div>
    );
  return (
    <div className="nudge" data-nudge="">
      <div className="what" id={`nudge-${s.person}`}>
        {t("followups.in_message")}
      </div>
      <ul className="plain-list" aria-labelledby={`nudge-${s.person}`}>
        {questions.map((q) => (
          <li key={q.id}>
            <span className="title">{q.title}</span>
            <span className="meta">
              {[
                q.sent ? t("followups.nudge.first_asked", { date: day(q.sent) }) : "",
                q.followed_up ? t("followups.followed_up_on", { date: day(q.followed_up) }) : "",
              ]
                .filter(Boolean)
                .join(" · ")}
            </span>
          </li>
        ))}
        {actions.map((a) => (
          <li key={a.id}>
            <span className="title">{plainTitle(a.text, a.due)}</span>
            <span className="meta">
              {[
                a.due ? t(a.due_check ? "op.meta.due_check" : a.due < today ? "followups.nudge.overdue" : "op.meta.due", { date: day(a.due) }) : "",
                a.told ? tn("followups.sent_on", a.told_days ?? 0, { date: day(a.told) }) : "",
              ]
                .filter(Boolean)
                .join(" · ")}
            </span>
          </li>
        ))}
        <NudgeLeftOut items={nudge.left_out} />
      </ul>
      <div className="message">
        {nudge.withheld && (
          <p className="hint" role="alert">
            {nudge.withheld}
          </p>
        )}
        <label className="hint" htmlFor={`nudge-msg-${s.person}`}>
          {t("followups.message_label", { name: s.name })}
        </label>
        <textarea
          id={`nudge-msg-${s.person}`}
          className="msg"
          ref={area}
          autoFocus={focusBox}
          value={text}
          onChange={(e) => setDraft(e.target.value)}
        />
        <Actions align="end">
          <span className="hint">{round}</span>
          {draft !== null && (
            <Button variant="quiet" onClick={() => setDraft(null)}>
              {t("followups.reset")}
            </Button>
          )}
          {!copied && (
            <Button variant="quiet" onClick={() => void markSent()} disabled={!!nudge.withheld}>
              {t("followups.mark_sent")}
            </Button>
          )}
          <Button variant="primary" onClick={() => void (copied ? markSent() : copy())} disabled={!!nudge.withheld}>
            {copied ? t("followups.mark_sent") : t("followups.nudge.copy")}
          </Button>
          <RowMenu label={s.name} actions={[{ id: "copy-plain", label: t("followups.copy_plain"), run: () => void copyPlainText() }]} />
        </Actions>
      </div>
    </div>
  );
}

function sentLine(date: string | null, days: number | null, project: string, tn: Tn, t: T): string {
  const when = !date ? "" : !days ? t("followups.sent_today") : tn("followups.sent_on", days, { date: day(date) });
  return [project, when].filter(Boolean).join(" · ");
}

/** "waiting 5 days", in the warning color and with "follow up" added once the follow-up rule says it is time. Nothing on
 * the day it went out, which the sent line already says ("sent today"). */
function WaitingPill(props: { days: number | null; chase: boolean }) {
  const { tn } = useWords();
  if (props.days === null || (props.days === 0 && !props.chase)) return null;
  return (
    <Pill tone={props.chase ? "danger" : "need"} className="pill-gap">
      {props.chase ? tn("followups.waiting_pill.chase", props.days) : tn("followups.waiting_pill", props.days)}
    </Pill>
  );
}

function WaitingQuestion(props: { question: S["FollowupQuestion"]; person: string }) {
  const { t, tn } = useWords();
  const act = useAct();
  const addOwn = useAddOwnRequest();
  const q = props.question;
  const [replying, setReplying] = useState(false);
  const [text, setText] = useState("");
  const row = useRef<HTMLLIElement>(null);
  const menu = useQuestionMenu(q, { canMarkSent: false, onClosed: () => row.current?.focus() });
  const change = useChangeThis({ kind: "question", id: q.id }, () => row.current?.focus());
  const first = props.person.split(" ")[0];
  const waitsForStart = useWaitsForStart();
  const toast = useHandedToast();
  const submit = async () => {
    let waits = false;
    const handed = await act(
      async () => {
        const made = await api.reply(q.id, text);
        waits = await waitsForStart();
        return made;
      },
      () => toast(waits, t("toast.reply_handed_in", { name: first }), t("toast.handed_in_waiting")),
    );
    if (handed) {
      addOwn(handed.request);
      setText("");
      setReplying(false);
    }
  };
  const meta = sentLine(q.sent, q.waiting_days, "", tn, t);
  return (
    <Item ref={row} tabIndex={-1}>
      <div>
        <div className="title">
          {q.title}
          <WaitingPill days={q.waiting_days} chase={!!q.chase_due} />
        </div>
        {meta && <div className="meta">{meta}</div>}
        <OriginLink origin={q.origin} />
      </div>
      <Actions>
        {!replying && (
          <Button onClick={() => setReplying(true)}>
            {t("followups.record_reply")}
          </Button>
        )}
        <RowMenu label={q.title} actions={[...menu.entries, change.entry]} />
      </Actions>
      {menu.form}
      {change.form}
      <LearnedLines records={[q.id]} />
      {replying && (
        <form
          className="answer-form"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <label className="hint" htmlFor={`reply-${q.id}`}>
            {t("followups.reply_label", { name: first })}
          </label>
          <textarea
            id={`reply-${q.id}`}
            className="short"
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setReplying(false);
            }}
          />
          <Actions align="end">
            <Button variant="quiet" onClick={() => setReplying(false)}>
              {t("action.cancel")}
            </Button>
            <Button variant="primary" type="submit" disabled={!text.trim()}>
              {t("followups.reply_go")}
            </Button>
          </Actions>
        </form>
      )}
    </Item>
  );
}

// A waiting action's one primary is Followed up once it has waited past the nudge threshold, and They finished it before
// then; the other is in the row's menu. A chase keeps the action open and counts as told again.
function WaitingAction(props: { action: S["FollowupAction"]; person: string; name: string }) {
  const { t, tn } = useWords();
  const act = useAct();
  const noted = useNoted();
  const a = props.action;
  const first = props.name.split(" ")[0];
  const ref = useRef<HTMLLIElement>(null);
  const [noting, setNoting] = useState(false);
  const finished = (note?: string) =>
    act(
      () => api.theyFinished(props.person, a.id, note),
      (result) => ({
        message: noted(t("toast.they_finished", { name: first }), result.request),
        undo: () => api.actionStatus(a.id, "open"),
      }),
    );
  const followedUp = (note?: string) =>
    act(
      () => api.followedUp(props.person, a.id, note),
      (done) => ({
        message: noted(t("toast.followed_up", { name: first }), done.request),
        undo: () => api.unfollow(props.person, a.id, { on: done.on, previous_told: done.previous_told }),
      }),
    );
  const chase = a.chase_due;
  const hold = useHold(a);
  const change = useChangeThis({ kind: "action", id: a.id }, () => ref.current?.focus());
  const drop = useDropAction(a, () => ref.current?.focus());
  const reassign = useReassign({ id: a.id, version: a.version ?? 0, owners: a.owners ?? [] }, () => ref.current?.focus(), props.person);
  const rest = a.followed_up ? t("followups.followed_up_on", { date: day(a.followed_up) }) : sentLine(a.told, a.told_days, "", tn, t);
  const finish: MenuAction = { id: "finished", label: t("followups.they_finished"), run: () => void finished() };
  const chased: MenuAction = { id: "followed-up", label: t("followups.followed_up"), run: () => void followedUp() };
  const note: MenuAction = { id: "note", label: t("note.add"), run: () => setNoting(true) };
  // A note can go with either act; the row's main one comes first, so Enter sends that one.
  const sends = [
    { label: t("followups.they_finished"), run: finished },
    { label: t("followups.followed_up"), run: followedUp },
  ];
  return (
    <Item row ref={ref}>
      <div>
        <div className="title">
          <NotesTitle notes={a.notes}>{plainTitle(a.text, a.due)}</NotesTitle>
          {a.on_hold || a.blocker ? <HoldNote on_hold={a.on_hold} blocker={a.blocker} due={a.due} /> : <WaitingPill days={a.told_days} chase={chase} />}
        </div>
        {(a.project_name || a.side_name || rest) && (
          <div className="meta">
            <ActionMeta a={a} rest={rest} />
          </div>
        )}
        <OriginLink origin={a.origin} />
      </div>
      <Actions>
        <Button variant="primary" onClick={() => void (chase ? followedUp() : finished())}>
          {t(chase ? "followups.followed_up" : "followups.they_finished")}
        </Button>
        <RowMenu label={a.text} actions={[chase ? finish : chased, note, ...(a.version != null && a.owners ? [reassign.entry] : []), hold.entry, change.entry, drop.entry]} />
      </Actions>
      {noting && (
        <NoteBox
          sends={chase ? [sends[1], sends[0]] : sends}
          onClose={() => {
            setNoting(false);
            ref.current?.focus();
          }}
        />
      )}
      {reassign.form}
      {hold.form}
      {change.form}
      {drop.form}
      <LearnedLines records={[a.id]} />
    </Item>
  );
}
