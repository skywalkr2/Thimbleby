// The walkthrough's first result (design 7.8): once a mailbox is connected and an AI account is chosen, it offers to look
// back over the person's own mail with what that costs shown first; after their Go it lists a handful of the open promises
// found and has one follow-up ready to copy, through the Follow-ups screen's own route. With nothing found it says what was
// read (messages, meetings this week) and offers "Hand something in" and "Missed one". The server says where it stands,
// and reads the sent folder by itself when the service names it; where it doesn't, "Choose the Sent folder" opens the
// folder picker in place. Nothing here keeps anything.
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api, type S } from "../lib/api";
import { useAct } from "../lib/act";
import { copyMessage } from "../lib/copy";
import { day } from "../lib/dates";
import { useEstimate } from "../lib/money";
import { useToasts } from "../lib/toasts";
import type { Screen } from "../lib/walkthrough";
import { useWords } from "../lib/wording";
import { Button } from "../ui/Button";
import { Skeleton } from "../ui/Skeleton";
import { costWords } from "./LookBack";
import { useMissedOne } from "./MissedOne";
import { SentFolderPicker } from "./SentFolderPicker";

import { EmptyState } from "../ui/EmptyState";
import { FormBlock } from "../ui/FormBlock";
import { Actions } from "../ui/Actions";
type Result = S["FirstPromisesView"];

/** Where the Sent folder is being chosen: the account whose folder it is, held by the screen itself so the choice stays open
 * while the body under it changes with the run (reading, working, done). */
type Picking = { key: string | null; choose: (key: string | null) => void };

/** The first-result screen's body. `go` moves the walkthrough to another screen (to finish what the first result needs).
 * The Sent folder picker is drawn here, beside the body, because the body is a different component at each stage of the
 * run and would take the open picker, and what was picked in it, with it when the run moves on. */
export function FirstPromises(props: { go: (screen: Screen) => void; onHandIn: () => void }) {
  const { t } = useWords();
  const [choosing, setChoosing] = useState<string | null>(null);
  const result = useQuery({
    queryKey: ["first-promises"],
    queryFn: api.firstPromises,
    // Reading and working end by themselves; the live stream refreshes it too, so this only covers a missed update.
    refetchInterval: (query) => (["reading", "working"].includes(query.state.data?.stage ?? "") ? 3000 : false),
  });
  const data = result.data;
  if (!data) return result.isError ? <EmptyState text={t("welcome.failed")} /> : <Skeleton />;
  const chosen = data.coverage.find((p) => p.missing_sent && placeKey(p) === choosing);
  return (
    <>
      <Stage data={data} go={props.go} onHandIn={props.onHandIn} picking={{ key: chosen ? choosing : null, choose: setChoosing }} />
      {chosen && chosen.folders.length > 0 && (
        <SentFolderPicker source={chosen.folders[0].source} label={chosen.folders[0].name} onClose={() => setChoosing(null)} />
      )}
    </>
  );
}

/** What the first result shows at the stage the server says it is at. */
function Stage(props: { data: Result; go: (screen: Screen) => void; onHandIn: () => void; picking: Picking }) {
  const { t } = useWords();
  const { data, picking } = props;
  switch (data.stage) {
    case "no_ai":
      return <Needs text={t("walkthrough.promises.no_ai")} label={t("walkthrough.promises.to_ai")} run={() => props.go("ai")} />;
    case "no_mail":
      // With no mail read there is nothing to look back over: handing something in is the way to see what the assistant
      // does, and connecting mail is the quieter choice beside it.
      return (
        <FormBlock data-first-promises="needs">
          <p>{t("walkthrough.promises.no_mail")}</p>
          <Actions align="end">
            <Button onClick={() => props.go("mail")}>{t("walkthrough.promises.to_mail")}</Button>
            <Button variant="primary" onClick={props.onHandIn}>
              {t("walkthrough.promises.none_hand_in")}
            </Button>
          </Actions>
        </FormBlock>
      );
    case "reading":
      return (
        <p role="status" data-first-promises="reading">
          {t("walkthrough.promises.reading")}
        </p>
      );
    case "offer":
      return <Offer data={data} picking={picking} />;
    case "working":
      return (
        <div data-first-promises="working">
          <p role="status">{t("walkthrough.promises.working", { finished: data.finished, count: data.count })}</p>
          <ReadList data={data} done={false} picking={picking} />
        </div>
      );
    default:
      return <Found data={data} onHandIn={props.onHandIn} picking={picking} />;
  }
}

function Needs(props: { text: string; label: string; run: () => void }) {
  return (
    <FormBlock data-first-promises="needs">
      <p>{props.text}</p>
      <Actions align="end">
        <Button onClick={props.run}>{props.label}</Button>
      </Actions>
    </FormBlock>
  );
}

/** The look back, offered with its estimate before anything is read: one total and one Go. */
function Offer(props: { data: Result; picking: Picking }) {
  const { t, tn } = useWords();
  const act = useAct();
  const estimate = useEstimate();
  const [busy, setBusy] = useState(false);
  const { data } = props;
  const title = data.days == null ? t("walkthrough.promises.offer.title_any") : tn("walkthrough.promises.offer.title", data.days);
  const go = async () => {
    setBusy(true);
    await act(() => api.firstPromisesGo());
    setBusy(false);
  };
  return (
    <FormBlock data-first-promises="offer">
      <h3 id="first-promises-offer">{title}</h3>
      <p role="status">{tn("walkthrough.promises.offer.found", data.count, { cost: costWords(data, estimate, t) })}</p>
      <ReadList data={data} done={false} plan picking={props.picking} />
      <Actions align="end">
        <Button variant="primary" loading={busy} onClick={() => void go()}>
          {t("walkthrough.promises.go")}
        </Button>
      </Actions>
    </FormBlock>
  );
}

/** What was found: the promises, one follow-up ready to copy, or the plain empty case with "Missed one". */
function Found(props: { data: Result; onHandIn: () => void; picking: Picking }) {
  const { t, tn } = useWords();
  const missed = useMissedOne();
  const { data } = props;
  const list = <ReadList data={data} done picking={props.picking} />;
  if (data.promises.length === 0) {
    return (
      <FormBlock data-first-promises="none">
        <p>{t(unread(data) ? "walkthrough.promises.none_partial" : "walkthrough.promises.none")}</p>
        {data.coverage.length > 0 && (
          <p>
            {t("walkthrough.promises.none_read", {
              messages: tn("walkthrough.promises.none_read_messages", data.messages_read),
              meetings: tn("walkthrough.promises.none_read_meetings", data.meetings_week),
            })}
          </p>
        )}
        <p className="hint">{t("walkthrough.promises.none_hint")}</p>
        {list}
        <Actions align="end">
          <Button onClick={missed}>{t("missed.open")}</Button>
          <Button variant="primary" onClick={props.onHandIn}>
            {t("walkthrough.promises.none_hand_in")}
          </Button>
        </Actions>
      </FormBlock>
    );
  }
  return (
    <FormBlock data-first-promises="found">
      <h3 id="first-promises-list">{t("walkthrough.promises.found")}</h3>
      <ul className="plain-list" aria-labelledby="first-promises-list">
        {data.promises.map((p) => (
          <li key={p.action} data-promise={p.action}>
            <span className="title">{p.text}</span>
            <span className="meta">{p.mine ? t("walkthrough.promises.mine") : t("walkthrough.promises.owner", { owner: p.owner })}</span>
            {p.promised_to.length > 0 && <span className="meta">{t("walkthrough.promises.to", { names: p.promised_to.join(", ") })}</span>}
            {p.due && <span className="meta">{t("walkthrough.promises.due", { date: day(p.due) })}</span>}
            {p.quote && <span className="meta">{t("walkthrough.promises.quote", { quote: p.quote })}</span>}
          </li>
        ))}
      </ul>
      {data.more > 0 && <p className="hint">{tn("walkthrough.promises.more", data.more)}</p>}
      {data.follow_up && <FollowUpReady followUp={data.follow_up} />}
      {list}
    </FormBlock>
  );
}

type Place = Result["coverage"][number];
type Folder = Place["folders"][number];

/** What names the account whose Sent folder is chosen. */
const placeKey = (p: Place) => `${p.kind}:${p.account ?? ""}`;

/** Whether a folder the person connected wasn't read. A missing sent folder alone isn't that: it has its own line. */
const unread = (data: Result) => data.coverage.some((p) => p.folders.some((f) => f.outcome !== "read"));

/** What is read, one row per source: before the Start the account, the folder and the day it reads from; after it how
 * each one went, said in words. A source that wasn't read, or a mail account with no sent folder, is said plainly
 * beside it, so a list made from less than everything never reads as complete. */
function ReadList(props: { data: Result; done: boolean; plan?: boolean; picking: Picking }) {
  const { t } = useWords();
  const { data, plan, picking } = props;
  if (data.coverage.length === 0) return null;
  // A mail account whose sent folder the service didn't name is read without it: the person chooses it here, and the
  // screen draws the picker (`FirstPromises`) and keeps it open while the run moves on.
  const missing = data.coverage.filter((p) => p.missing_sent);
  const place = (p: Place) => t(`walkthrough.coverage.${p.kind}${p.account ? "_at" : ""}`, { account: p.account ?? "" });
  const named = (f: Folder) => (f.folder && f.folder.toLowerCase() !== f.name.toLowerCase() ? t("walkthrough.coverage.folder_named", { name: f.name, folder: f.folder }) : f.name);
  const row = (p: Place, f: Folder) => {
    const vars = { place: place(p), name: named(f), date: f.from_date ? day(f.from_date) : "" };
    if (plan) return t(f.from_date ? "walkthrough.coverage.plan_from" : "walkthrough.coverage.plan", vars);
    return t(f.outcome === "read" && f.from_date ? "walkthrough.coverage.read_from" : `walkthrough.coverage.${f.outcome}`, vars);
  };
  return (
    <FormBlock as="section"  data-coverage={props.done ? (data.complete ? "complete" : "partial") : "plan"} aria-labelledby="first-promises-read">
      <h3 id="first-promises-read">{t(plan ? "walkthrough.coverage.title_plan" : "walkthrough.coverage.title_read")}</h3>
      <ul className="plain-list" aria-labelledby="first-promises-read">
        {data.coverage.flatMap((p) =>
          p.folders.map((f) => (
            <li key={f.source} data-source={f.source} data-outcome={plan ? undefined : f.outcome}>
              {row(p, f)}
            </li>
          )),
        )}
        {missing.map((p) => (
          <li key={`sent:${p.kind}:${p.account ?? ""}`} data-missing-sent="">
            {t(p.account ? "walkthrough.coverage.no_sent_at" : "walkthrough.coverage.no_sent", { account: p.account ?? "" })}
          </li>
        ))}
      </ul>
      {props.done && <p className="hint">{t(data.complete ? "walkthrough.coverage.complete" : unread(data) ? "walkthrough.coverage.partial" : "walkthrough.coverage.read_no_sent")}</p>}
      {missing.length > 0 && picking.key === null && (
        <Actions align="end">
          <Button onClick={() => picking.choose(placeKey(missing[0]))}>{t("walkthrough.coverage.add_sent")}</Button>
        </Actions>
      )}
    </FormBlock>
  );
}

/** The follow-up the Follow-ups screen composes: Copy puts it on the clipboard, then Mark sent keeps it as copied. */
function FollowUpReady(props: { followUp: NonNullable<Result["follow_up"]> }) {
  const { t } = useWords();
  const act = useAct();
  const { push } = useToasts();
  const [copied, setCopied] = useState(false);
  const [sent, setSent] = useState(false);
  const [text, setText] = useState(props.followUp.message);
  const { person, name } = props.followUp;
  const copy = async () => {
    if (!text.trim()) return;
    if ((await copyMessage(text)) === "blocked") {
      setCopied(false);
      push({ message: t("toast.copy_blocked") });
      return;
    }
    setCopied(true);
    push({ message: t("toast.copied") });
  };
  const markSent = async () => {
    if (!text.trim()) return;
    const done = await act(
      () => api.markSent(person, text),
      (counts) => ({
        message: t("toast.marked_sent", { name }),
        undo: () => api.unmarkSent(person, { question_ids: counts.question_ids, action_ids: counts.action_ids }),
      }),
    );
    if (done) {
      setSent(true);
      setCopied(false);
    }
  };
  return (
    <FormBlock as="section"  data-follow-up={person} aria-labelledby="first-promises-follow-up">
      <h3 id="first-promises-follow-up">{t("walkthrough.promises.follow_up")}</h3>
      <p className="hint">{t("walkthrough.promises.follow_up_to", { name })}</p>
      <label htmlFor="first-promises-message">{t("walkthrough.promises.follow_up_text", { name })}</label>
      <textarea id="first-promises-message" className="msg" value={text} onChange={(e) => setText(e.target.value)} />
      <Actions align="end">
        <Button variant="primary" disabled={sent} onClick={() => void (copied ? markSent() : copy())}>
          {copied ? t("followups.mark_sent") : t("followups.copy_message")}
        </Button>
      </Actions>
    </FormBlock>
  );
}
