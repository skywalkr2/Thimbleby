// What a queue line opens (design 7.7): its items in full, with the buttons that deal with them. It is the inspector from
// 1680px and expands under the line below that. The pieces are the ones the Work screens use (a change's card, a
// person's message to copy, a question's answer form), so a line and its screen can never disagree.
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { api } from "../lib/api";
import { seeMove } from "../lib/moves";
import type { QueueLine } from "../lib/today";
import { useWords } from "../lib/wording";
import { Skeleton } from "../ui/Skeleton";
import { CapacityDetail } from "./CapacityDetail";
import { ClashDetail } from "./ClashDetail";
import { RerouteForm } from "./ChangeThis";
import { DecisionRow, PersonSection, WaitingSection } from "./FollowUps";
import { PromiseWhy } from "./PromiseWhy";
import { ReassignForm } from "./ReassignAction";
import { SideChoose } from "./SideChoose";
import { BatchDetail } from "./BatchDetail";
import { HeldDetail } from "./HeldDetail";
import { MadeBy } from "./MadeBy";
import { OutsideStep } from "./OutsideStep";
import { ProjectEndingDetail } from "./ProjectEndingDetail";
import { ChangeRow, OpRow } from "./WhatChanged";
import { RowList } from "../ui/RowList";
import { ItemList } from "../ui/ItemList";

/** The kinds of line that open to items; the rest are a single act on the line itself. */
const OPENS = new Set<QueueLine["kind"]>(["capacity", "clash", "decision", "question", "who_is", "owner", "held", "moved", "terms", "project_ending", "go", "refused", "failed", "review", "intake_review", "batches", "send", "nudge", "escalate", "promise"]);

export function opensItems(line: QueueLine): boolean {
  // The line that asks which side items belong to opens the list of sides to pick from.
  return OPENS.has(line.kind) || (line.kind === "unfiled" && line.state === "which_side") || paysFromOutside(line);
}

/** A reminder to pay a bill whose words came from outside content: the one step that spends money says where it came from. */
const paysFromOutside = (line: QueueLine): boolean => line.kind === "date_reminder" && line.state === "bill" && line.untrusted;

/** What a line opens, headed by its action's notes when it is about one: where there is no hover (the phone, and below the
 * inspector's width) this is where they are read. */
export function LineDetail(props: { line: QueueLine; sendBack?: boolean; onOpenGuide?: (step: string) => void }) {
  return (
    <>
      {props.line.notes && (
        <p className="hint" data-notes="">
          {props.line.notes}
        </p>
      )}
      <OutsideNote line={props.line} />
      <MadeBy line={props.line} />
      <LineItems {...props} />
    </>
  );
}

function LineItems(props: { line: QueueLine; sendBack?: boolean; onOpenGuide?: (step: string) => void }) {
  const { line } = props;
  switch (line.kind) {
    case "decision":
    case "question":
    case "owner":
    case "who_is":
      return <QuestionDetail line={line} onOpenGuide={props.onOpenGuide} />;
    case "held":
      return <HeldDetail line={line} />;
    case "moved":
      return <MovedDetail line={line} />;
    case "terms":
      return <TermsDetail line={line} />;
    case "project_ending":
      return <ProjectEndingDetail line={line} />;
    case "send":
      return <SendDetail line={line} />;
    case "nudge":
      return <NudgeDetail line={line} />;
    case "escalate":
      return <EscalateDetail line={line} />;
    case "capacity":
      return <CapacityDetail />;
    case "clash":
      return <ClashDetail line={line} />;
    case "unfiled":
      return <SideChoose />;
    case "date_reminder":
      return <OutsideStep word="outside.step.pay" />;
    case "promise":
      return <PromiseWhy action={(line.actions ?? [])[0] ?? ""} />;
    case "review":
    case "intake_review":
    case "batches":
      return <BatchDetail line={line} sendBack={props.sendBack} />;
    default:
      return <ChangeDetail line={line} sendBack={props.sendBack} onOpenGuide={props.onOpenGuide} />;
  }
}

/** What came in from outside is said once, here, and not on every line of a list: the assistant reads it as information and
 * never as instructions (the packet keeps the marking, and links show their real domain). */
function OutsideNote(props: { line: QueueLine }) {
  const { t } = useWords();
  const { line } = props;
  const parts = line.kind === "batches" ? (line.parts ?? []) : [line];
  const outside = parts.some((part) => part.untrusted || (part.items ?? []).some((item) => item.untrusted));
  if (!outside) return null;
  const kind = (parts.find((part) => part.untrusted)?.title ?? (parts[0]?.items ?? [])[0]?.title ?? line.title)?.kind;
  return (
    <p className="hint" data-outside-note="">
      {kind === "email" ? t("queue.detail.outside.email") : kind === "calendar" ? t("queue.detail.outside.calendar") : t("queue.detail.outside.other")}
    </p>
  );
}

function Gone() {
  const { t } = useWords();
  return <p className="hint">{t("queue.detail.gone")}</p>;
}

/** The change a line is about: the same card What changed shows, open, with its buttons. */
function ChangeDetail(props: { line: QueueLine; sendBack?: boolean; onOpenGuide?: (step: string) => void }) {
  const changes = useQuery({ queryKey: ["changes"], queryFn: api.changes });
  if (changes.isPending) return <Skeleton />;
  const item = changes.data?.find((c) => c.id === props.line.request);
  if (!item) return <Gone />;
  return (
    <RowList as="ol">
      <ChangeRow item={item} reveal={0} open sendBack={props.sendBack} onOpenGuide={props.onOpenGuide} />
    </RowList>
  );
}

/** A question put to the person: the answer form, or the choice of who or which one. A name the assistant couldn't place
 * is asked as a question too; when it has none the change that holds it is what opens. */
function QuestionDetail(props: { line: QueueLine; onOpenGuide?: (step: string) => void }) {
  const followups = useQuery({ queryKey: ["followups"], queryFn: api.followups });
  if (followups.isPending) return <Skeleton />;
  const question = followups.data?.find((s) => s.is_pm)?.questions.find((q) => q.id === props.line.question);
  if (!question) return props.line.request ? <ChangeDetail line={props.line} onOpenGuide={props.onOpenGuide} /> : <AskedItem question={props.line.question ?? ""} />;
  return (
    <ItemList>
      <DecisionRow question={question} reveal={0} check={props.line.after_move?.check} move={props.line.after_move} inLine />
    </ItemList>
  );
}

/** A question about an item the assistant made (who owns it) is not among Follow-ups' questions: it is answered here, on the
 * item's own row with the choice of who, as What changed shows only a link to this line. */
function AskedItem(props: { question: string }) {
  const changes = useQuery({ queryKey: ["changes"], queryFn: api.changes });
  if (changes.isPending) return <Skeleton />;
  for (const item of changes.data ?? []) {
    const cs = item.changeset;
    const op = cs?.ops.find((o) => o.ask?.id === props.question);
    if (cs && op) {
      return (
        <ItemList>
          <OpRow op={op} cs={cs} source={item.source} />
        </ItemList>
      );
    }
  }
  return <Gone />;
}

/** Notes that the group of a move's questions is on screen with this many, so the toast for the last one can say it is settled. */
function Seen(props: { move?: string; total: number }) {
  useEffect(() => {
    if (props.move) seeMove(props.move, props.total);
  }, [props.move, props.total]);
  return null;
}

/** The things to check after a move: one row for each, each with its own answer. */
function MovedDetail(props: { line: QueueLine }) {
  const followups = useQuery({ queryKey: ["followups"], queryFn: api.followups });
  if (followups.isPending) return <Skeleton />;
  const mine = followups.data?.find((s) => s.is_pm)?.questions ?? [];
  const rows = (props.line.questions ?? []).map((id) => mine.find((q) => q.id === id)).filter((q) => q !== undefined);
  if (rows.length === 0) return <Gone />;
  const checks = new Map((props.line.after_move?.rows ?? []).map((r) => [r.question, r.check]));
  return (
    <>
      <Seen move={props.line.after_move?.request} total={(props.line.questions ?? []).length} />
      <ItemList>
        {rows.map((question) => (
          <DecisionRow key={question.id} question={question} reveal={0} check={checks.get(question.id)} move={props.line.after_move} />
        ))}
      </ItemList>
    </>
  );
}

/** The questions about words, together: one row for each, each with its own answer box and a way to drop it. */
function TermsDetail(props: { line: QueueLine }) {
  const followups = useQuery({ queryKey: ["followups"], queryFn: api.followups });
  if (followups.isPending) return <Skeleton />;
  const mine = followups.data?.find((s) => s.is_pm)?.questions ?? [];
  const rows = (props.line.questions ?? []).map((id) => mine.find((q) => q.id === id)).filter((q) => q !== undefined);
  if (rows.length === 0) return <Gone />;
  return (
    <ItemList>
      {rows.map((question) => (
        <DecisionRow key={question.id} question={question} reveal={0} />
      ))}
    </ItemList>
  );
}

/** What is ready to send to a person: the message in a box, to copy and then mark as sent. */
function SendDetail(props: { line: QueueLine }) {
  const followups = useQuery({ queryKey: ["followups"], queryFn: api.followups });
  if (followups.isPending) return <Skeleton />;
  const section = followups.data?.find((s) => !s.is_pm && s.person === props.line.person);
  if (!section) return <Gone />;
  return (
    <RowList as="ol">
      <PersonSection section={section} open />
    </RowList>
  );
}

/** What a person hasn't answered: each item with the step that closes it. */
function NudgeDetail(props: { line: QueueLine }) {
  const followups = useQuery({ queryKey: ["followups"], queryFn: api.followups });
  if (followups.isPending) return <Skeleton />;
  const section = followups.data?.find((s) => !s.is_pm && s.person === props.line.person);
  if (!section) return <Gone />;
  return (
    <RowList as="ol">
      <WaitingSection section={section} compact nudgeOpen />
    </RowList>
  );
}

/** The suggestion to ask someone else about the one thing a person hasn't answered: a list of people. For a question it
 * asks them instead; for an action it takes the person off it and gives it to them. Nothing is sent: what goes to the new
 * person is the next message to copy. */
function EscalateDetail(props: { line: QueueLine }) {
  const { t } = useWords();
  const id = (props.line.questions ?? [])[0];
  const action = (props.line.actions ?? [])[0];
  const items = useQuery({ queryKey: ["open-items"], queryFn: api.openItems, enabled: !!action });
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const look = window.setTimeout(() => box.current?.querySelector<HTMLElement>("select")?.focus(), 0);
    return () => window.clearTimeout(look);
  });
  if (id) {
    return (
      <div ref={box}>
        <RerouteForm q={{ id }} onClose={() => undefined} />
      </div>
    );
  }
  if (action && items.isPending) return <Skeleton />;
  const found = items.data?.actions.find((a) => a.id === action);
  if (!found) return <Gone />;
  return (
    <div ref={box}>
      <ReassignForm action={found} from={props.line.person ?? undefined} label={t("question.reroute_label")} />
    </div>
  );
}
