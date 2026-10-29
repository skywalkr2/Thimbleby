// What the line that asks which side some items belong to opens (design 6.32, 7.7): the items the assistant couldn't place
// and left under Personal, each in one question ("These 4 items might be Hale Upholstery's. Move them there?"). When they
// could be on several sides the question says so and has a list of those sides, starting on the first (the side the
// calendar or mailbox they came from serves, when it serves one). Move says what it changes first (the items will be
// visible with that side's work), is the person's own change and has Undo; Keep leaves them under Personal and they are not
// asked about again. Items filed under no project at all (a workspace with no Personal) are still sorted by choosing a side,
// one change with Undo. The person can also sort them one at a time from the list of unfiled items.
import { useQuery } from "@tanstack/react-query";
import { useId, useState } from "react";
import { api, type S } from "../lib/api";
import { useAct } from "../lib/act";
import { plainTitle } from "../lib/title-dates";
import { useSides } from "../lib/sides";
import { viewHref } from "../lib/views";
import { useWords } from "../lib/wording";
import { Button } from "../ui/Button";
import { Skeleton } from "../ui/Skeleton";
import { useFile } from "./Unfiled";
import { Actions } from "../ui/Actions";
import { FormField } from "../ui/FormField";
import { Select } from "../ui/Select";
import { ItemList } from "../ui/ItemList";

type Question = S["FilingQuestion"];

/** One question: what it asks, the side to pick when the items could be on several, what Move changes, and Move and Keep. */
function SideQuestion(props: { question: Question }) {
  const { t, tn } = useWords();
  const act = useAct();
  const id = useId();
  const q = props.question;
  const [picked, setPicked] = useState(q.side);
  const to = q.sides.find((s) => s.side === picked) ?? q.sides[0] ?? { side: q.side, name: q.name };
  const several = q.sides.length > 1;
  const refs = q.items.map((i) => ({ kind: i.kind, id: i.id, read_version: i.version }));
  const n = q.items.length;
  const asked = several ? tn("filing.question.pick", n) : tn("filing.question", n, { side: q.name });
  const move = () =>
    act(
      () => api.filingMove({ side: to.side, items: refs }),
      (done) => ({
        message: tn("filing.moved", done.count, { side: to.name }) + (done.rule ? ` ${t("filing.rule_proposed")}` : ""),
        undo: async () => {
          const report = await api.undo(done.changeset);
          if (!report.restored.length) throw new Error("not undone");
        },
      }),
    );
  const keep = () => act(() => api.filingKeep({ side: q.side, items: refs }), () => ({ message: t("filing.kept") }));
  return (
    <section className="filing-question" data-filing-question={q.side} aria-label={asked}>
      <p>{asked}</p>
      <ul className="plain-list" aria-label={several ? t("filing.items_label.pick") : t("filing.items_label", { side: q.name })}>
        {q.items.map((i) => (
          <li key={`${i.kind}:${i.id}`}>{plainTitle(i.text)}</li>
        ))}
      </ul>
      {several && (
        <FormField id={`${id}-side`} label={t("filing.pick_label")}>
          <Select id={`${id}-side`} value={to.side} onChange={(e) => setPicked(e.target.value)}>
            {q.sides.map((s) => (
              <option key={s.side} value={s.side}>
                {s.name}
              </option>
            ))}
          </Select>
        </FormField>
      )}
      <p className="hint">{tn("filing.visible", n, { side: to.name })}</p>
      <Actions align="end">
        <Button variant="primary" onClick={() => void move()}>
          {t("filing.move")}
        </Button>
        <Button onClick={() => void keep()}>{t("filing.keep")}</Button>
      </Actions>
    </section>
  );
}

export function SideChoose() {
  const { t, tn } = useWords();
  const unfiled = useQuery({ queryKey: ["unfiled"], queryFn: api.unfiled });
  const asked = useQuery({ queryKey: ["filing"], queryFn: api.filingQuestions });
  const { personal, sides } = useSides();
  const file = useFile();
  if (unfiled.isPending || asked.isPending) return <Skeleton />;
  const items = unfiled.data?.items ?? [];
  const questions = asked.data?.questions ?? [];
  if (items.length === 0 && questions.length === 0) return <p className="hint">{t("queue.detail.gone")}</p>;
  const choices = [...(personal ? [{ id: personal, name: t("nav.personal") }] : []), ...sides.map((s) => ({ id: s.project, name: s.name }))];
  return (
    <div data-side-choose="">
      {questions.map((q) => (
        <SideQuestion key={q.side} question={q} />
      ))}
      {items.length > 0 && (
        <>
          <p className="hint">{tn("sides.choose.intro", items.length)}</p>
          <ItemList aria-label={t("sides.choose.label")}>
            {choices.map((c) => (
              <li key={c.id}>
                <Button onClick={() => void file(items, c.id)}>{c.name}</Button>
              </li>
            ))}
          </ItemList>
          <p className="hint">
            <a href={viewHref("records/projects")}>{t("sides.choose.one_by_one")}</a>
          </p>
        </>
      )}
    </div>
  );
}
