// A conversation on a record (design 6.25, 6.32): a box on every record that has a page, and in the pane or drawer that shows
// one, to ask the assistant about it or to ask for something to be done to it. The conversation is kept on the record, oldest first. An
// answer is prose that shows the words it rests on; when it proposes changes they are listed under it, each kept or
// dropped here (an applied one is dropped with Undo, one held for the person is kept or dropped). Work above the amount
// the person asked to be asked about waits for their go, shown with its estimate.
import { useQuery } from "@tanstack/react-query";
import { useId, useRef, useState } from "react";
import { api, type S } from "../lib/api";
import { useAct } from "../lib/act";
import { whenText } from "../lib/dates";
import { useTotal } from "../lib/money";
import { useWords } from "../lib/wording";
import { SafeText } from "./SafeText";
import { Button } from "../ui/Button";
import { Actions } from "../ui/Actions";
import { RowList } from "../ui/RowList";
import { Row } from "../ui/Row";
import { Pill } from "../ui/Pill";
import { RowBody } from "../ui/RowBody";
import { AskAboutThis } from "../ui/AskAboutThis";
type Turn = S["AskView"];
type Op = S["OpView"];

/** The kinds of record a conversation can be about: every kind that has a page of its own (the engine's list). */
export const CONVERSATION_KINDS: ReadonlySet<string> = new Set([
  "action",
  "question",
  "person",
  "organization",
  "team",
  "project",
  "event",
  "series",
  "source",
  "fact",
  "note",
  "rule",
  "lesson",
  "glossary_entry",
]);

export function RecordConversation(props: { kind: string; id: string }) {
  const { t } = useWords();
  const act = useAct();
  const base = useId();
  const field = useRef<HTMLTextAreaElement>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const talk = useQuery({
    queryKey: ["conversation", props.kind, props.id],
    queryFn: () => api.conversation(props.kind, props.id),
    // While the assistant is working on a message, look again for the answer.
    refetchInterval: (query) => (query.state.data?.turns.some((x) => x.state === "queued" || x.state === "running") ? 3000 : false),
  });

  const send = async () => {
    const text = message.trim();
    if (!text || busy) return;
    setBusy(true);
    const sent = await act(
      () => api.say(props.kind, props.id, text),
      () => ({ message: t("conversation.toast.sent") }),
    );
    setBusy(false);
    if (sent) {
      setMessage("");
      field.current?.focus();
    }
  };

  const turns = talk.data?.turns ?? [];
  return (
    <section aria-labelledby={`${base}-title`} className="conversation" data-conversation="">
      <h2 id={`${base}-title`} className="what">
        {t("conversation.title")}
      </h2>
      {turns.length === 0 && !talk.isPending ? <p className="hint">{t("conversation.empty")}</p> : null}
      {turns.length > 0 && (
        <RowList>
          {turns.map((turn) => (
            <TurnRow key={turn.id} turn={turn} />
          ))}
        </RowList>
      )}
      <AskAboutThis
        label={t("conversation.label")}
        placeholder={t("conversation.placeholder")}
        hint={t("conversation.hint")}
        value={message}
        onChange={setMessage}
        onSend={() => void send()}
        busy={busy}
        sendLabel={t("conversation.send")}
        inputRef={field}
      />
    </section>
  );
}

function TurnRow(props: { turn: Turn }) {
  const { t, tn } = useWords();
  const total = useTotal();
  const act = useAct();
  const { turn } = props;
  const answered = turn.answer && (turn.state === "review" || turn.state === "done");
  const state = answered ? "done" : turn.state;
  const when = whenText(turn.created_at);
  const ops = turn.ops ?? [];
  const cs = turn.changeset;
  const titleId = `turn-${turn.id}`;

  const drop = (op: Op) => {
    if (!cs) return;
    void act(
      async () => (op.status === "held" ? await api.declineOp(cs, op.index) : await api.undo(cs, [op.index])),
      () => ({ message: t("conversation.toast.dropped") }),
    );
  };
  const keep = (op: Op) => {
    if (!cs) return;
    void act(
      () => api.release(cs, op.index),
      () => ({ message: t("conversation.toast.kept") }),
    );
  };
  const keepAll = () => {
    if (!cs) return;
    void act(
      () => api.looksGood(cs),
      () => ({ message: t("conversation.toast.kept_all") }),
    );
  };

  return (
    <Row
      aria-labelledby={titleId}
      loop={false}
      title={turn.question}
      titleId={titleId}
      meta={
        <>
          <Pill>{t(`ask.state.${state}`)}</Pill>
          {!answered && turn.waiting ? ` ${turn.waiting}` : ""}
          {when ? ` · ${when}` : ""}
        </>
      }
    >
      <RowBody>
        {turn.waiting_for_go && (
          <div className="ask-item">
            <span className="hint">{turn.estimate_usd != null ? t("conversation.waiting_go_cost", { cost: total(turn.estimate_usd) }) : t("conversation.waiting_go")}</span>
            <Actions>
              <Button variant="primary" onClick={() => void act(() => api.stageGo(turn.id, turn.version), () => ({ message: t("toast.go") }))}>
                {t("conversation.go")}
              </Button>
            </Actions>
          </div>
        )}
        {turn.answer && (
          <div className="ask-answer">
            <SafeText text={turn.answer.text} />
            {turn.answer.cites.length > 0 && (
              <div className="because">
                <span className="what">{t("ask.based_on")}</span>
                <ul className="plain-list">
                  {turn.answer.cites.map((cite, i) => (
                    <li key={i}>
                      <SafeText text={`“${cite.quote}”`} />
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
        {ops.length > 0 && (
          <div className="ask-item">
            <span className="what">{tn("conversation.changes", ops.length)}</span>
            <ul className="plain-list">
              {ops.map((op) => (
                <li key={op.index}>
                  <span>{op.title}</span> <span className="hint">{t(`conversation.op.${op.status}`)}</span>
                  {op.status === "held" && (
                    <Button aria-label={t("conversation.keep_named", { what: op.title })} onClick={() => keep(op)}>
                      {t("conversation.keep")}
                    </Button>
                  )}
                  {(op.status === "held" || op.status === "applied") && (
                    <Button variant="quiet" aria-label={t("conversation.drop_named", { what: op.title })} onClick={() => drop(op)}>
                      {t("conversation.drop")}
                    </Button>
                  )}
                </li>
              ))}
            </ul>
            {!turn.reviewed && ops.some((o) => o.status === "applied") && (
              <Actions>
                <Button onClick={keepAll}>
                  {t("conversation.keep_all")}
                </Button>
              </Actions>
            )}
          </div>
        )}
      </RowBody>
    </Row>
  );
}
