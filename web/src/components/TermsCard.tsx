// The questions about new words, one at a time (design 7.7): the word, its answer box, Skip (the next word), "Not a term"
// (drops the question, with Undo, so the word is never raised again) and where the person is in the list.
import { useState } from "react";
import { api, type S } from "../lib/api";
import { useAct } from "../lib/act";
import { useWords } from "../lib/wording";
import { Actions } from "../ui/Actions";
import { Button } from "../ui/Button";
import { Item, ItemList } from "../ui/ItemList";
import { useNoted } from "./NoteBox";
import { SafeText } from "./SafeText";

export function TermsCard(props: { questions: S["FollowupQuestion"][] }) {
  const { t } = useWords();
  const [at, setAt] = useState(0);
  const rows = props.questions;
  if (rows.length === 0) return null;
  const index = at % rows.length;
  const q = rows[index];
  return (
    <ItemList>
      <Item data-terms-card="">
        <div>
          <div className="what">{t("queue.terms.progress", { n: index + 1, total: rows.length })}</div>
          <div className="title">{q.title}</div>
          {q.text && q.text.trim() !== q.title.trim() && <SafeText text={q.text} />}
        </div>
        <div className="full">
          <TermForm key={q.id} question={q} more={rows.length > 1} onSkip={() => setAt(index + 1)} />
        </div>
      </Item>
    </ItemList>
  );
}

function TermForm(props: { question: S["FollowupQuestion"]; more: boolean; onSkip: () => void }) {
  const { t } = useWords();
  const act = useAct();
  const noted = useNoted();
  const q = props.question;
  const [answer, setAnswer] = useState("");
  return (
    <form
      className="answer-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (!answer.trim()) return;
        void act(
          () => api.answer(q.id, { text: answer }),
          (done) => ({ message: noted(t("toast.answered"), done.request) }),
        );
      }}
    >
      <label className="hint" htmlFor={`ans-${q.id}`}>
        {t("followups.answer_label")}
      </label>
      <textarea id={`ans-${q.id}`} className="short" autoFocus value={answer} onChange={(e) => setAnswer(e.target.value)} />
      <Actions align="end">
        {props.more && (
          <Button variant="quiet" type="button" onClick={props.onSkip}>
            {t("queue.terms.skip")}
          </Button>
        )}
        <Button
          variant="quiet"
          type="button"
          onClick={() =>
            void act(
              () => api.dropQuestion(q.id, t("queue.terms.not_a_term_reason")),
              (done) => ({ message: t("toast.question_dropped"), undo: () => api.undo(done.changeset) }),
            )
          }
        >
          {t("queue.terms.not_a_term")}
        </Button>
        <Button variant="primary" type="submit" data-key="primary" disabled={!answer.trim()}>
          {t("followups.answer")}
        </Button>
      </Actions>
    </form>
  );
}
