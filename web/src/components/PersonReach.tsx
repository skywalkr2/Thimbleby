// One kind of contact detail on a person's page (design 7.14): every address or number they have of it, each with Remove, and an
// Add that opens a small box in place. Both act at once as the person's own change with an Undo toast, through the same edit the
// person's form makes (the whole set of details is sent, so what is not touched stays as it was).
import { useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { api } from "../lib/api";
import { problemText } from "../lib/problem";
import { useFocusAfterRender } from "../lib/focus-after-render";
import { useToasts } from "../lib/toasts";
import { useWords } from "../lib/wording";
import { Button } from "../ui/Button";
import { heldReach } from "./PersonForm";
import styles from "./PersonReach.module.css";

export function PersonReach(props: {
  person: string;
  name: string;
  /** The kind as the workspace spells it ("email"). */
  kind: string;
  /** Everything the person holds, as the record has it. */
  held: unknown;
}) {
  const { t } = useWords();
  const client = useQueryClient();
  const { push } = useToasts();
  const focusAfterRender = useFocusAfterRender();
  const all = heldReach(props.held);
  const own = Object.entries(all).find(([k]) => k.trim().toLocaleLowerCase() === props.kind.trim().toLocaleLowerCase());
  const kindKey = own?.[0] ?? props.kind;
  const values = own?.[1] ?? [];
  const kindWord = props.kind.toLocaleLowerCase();
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState("");
  const [problem, setProblem] = useState("");
  const [busy, setBusy] = useState(false);
  const opener = useRef<HTMLButtonElement>(null);

  const send = async (next: Record<string, string[]>, message: string, back: Record<string, string[]>) => {
    await api.editPerson(props.person, { how_to_reach: next });
    await client.invalidateQueries();
    push({
      message,
      undo: async () => {
        await api.editPerson(props.person, { how_to_reach: back });
        await client.invalidateQueries();
      },
    });
  };

  const add = async () => {
    const value = text.trim();
    if (!value || busy) return;
    setBusy(true);
    setProblem("");
    try {
      await send({ ...all, [kindKey]: [...values, value] }, t("toast.contact_added", { value, name: props.name }), all);
      setText("");
      setAdding(false);
    } catch (err) {
      setProblem(problemText(err, t));
    }
    setBusy(false);
  };

  const remove = async (value: string) => {
    const left = values.filter((v) => v !== value);
    const next = { ...all, [kindKey]: left };
    if (left.length === 0) delete next[kindKey];
    try {
      await send(next, t("toast.contact_removed", { value, name: props.name }), all);
    } catch (err) {
      setProblem(problemText(err, t));
    }
  };

  const id = `reach-add-${props.person}-${kindWord}`;
  return (
    <div className={styles.reach}>
      {values.map((value) => (
        <div key={value} className={styles.value}>
          <span>{value}</span>
          <Button variant="quiet" size="sm" className={styles.remove} aria-label={t("person.remove_value", { value })} onClick={() => void remove(value)}>
            {t("setup.remove")}
          </Button>
        </div>
      ))}
      {adding ? (
        <form
          className={styles.form}
          onSubmit={(e) => {
            e.preventDefault();
            void add();
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.stopPropagation();
              setAdding(false);
              focusAfterRender(() => opener.current);
            }
          }}
        >
          <label htmlFor={id} className="sr">
            {t("person.add_value_label", { kind: kindWord, name: props.name })}
          </label>
          <input id={id} autoFocus autoComplete="off" type={kindWord === "email" ? "email" : "text"} value={text} aria-invalid={problem ? true : undefined} onChange={(e) => setText(e.target.value)} />
          <Button variant="primary" size="sm" type="submit" disabled={!text.trim() || busy}>
            {t("person.add_value")}
          </Button>
          <Button size="sm" onClick={() => setAdding(false)}>
            {t("action.cancel")}
          </Button>
        </form>
      ) : (
        <Button ref={opener} variant="quiet" size="sm" className={styles.add} onClick={() => setAdding(true)}>
          {t(values.length > 0 ? "person.add_another" : "person.add_kind", { kind: kindWord })}
        </Button>
      )}
      {problem && (
        <p className="problem-note" role="alert">
          {problem}
        </p>
      )}
    </div>
  );
}
