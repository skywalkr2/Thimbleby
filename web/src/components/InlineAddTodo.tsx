// The add row at the top of the to-dos (design 7.5): type a title and press Enter and the to-do is added, as the person's own,
// with Undo on the toast; the cursor stays in the row for the next one. What needs more than a title (a day, who does it, how
// it repeats) is the Add form, reached from the header's button. With several sides and none picked, the to-do cannot be
// filed from here (the form asks where it belongs), so Enter opens the form with the words already in it.
import { useQuery } from "@tanstack/react-query";
import { useId, useRef, useState } from "react";
import { api } from "../lib/api";
import { useAct } from "../lib/act";
import { useSideFilter } from "../lib/sides";
import { TODO_TEXT_MAX } from "../lib/todo-limits";
import { useWords } from "../lib/wording";
import { Icon } from "../ui/Icon";
import styles from "./OpenItems.module.css";

export function InlineAddTodo(props: { onDetails: (words: string) => void }) {
  const { t } = useWords();
  const act = useAct();
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const people = useQuery({ queryKey: ["people"], queryFn: api.people });
  const filter = useSideFilter();
  const [text, setText] = useState("");
  const words = text.trim();
  const over = words.length - TODO_TEXT_MAX;
  const who = (people.data ?? []).find((p) => p.is_pm)?.id ?? "";
  const place = filter.offered && filter.choice !== "all" ? filter.choice : "";
  const add = async () => {
    if (!words || over > 0) return;
    if (filter.offered && !place) {
      props.onDetails(words);
      setText("");
      return;
    }
    if (!who) return;
    const made = await act(
      () => api.addTodo({ text: words, owners: [who], ...(place ? { project: place } : {}) }),
      (result) => ({
        message: t("addtodo.saved", { text: words }),
        undo: async () => {
          for (const changeset of [...result.changesets].reverse()) await api.undo(changeset);
        },
      }),
    );
    if (made) {
      setText("");
      input.current?.focus();
    }
  };
  return (
    <li className={styles.inlineAdd} role="presentation" data-inline-add="">
      <span className={styles.inlinePlus} aria-hidden="true">
        <Icon name="plus" />
      </span>
      <label className="sr" htmlFor={`${id}-text`}>
        {t("open.inline_add.label")}
      </label>
      <input
        id={`${id}-text`}
        ref={input}
        type="text"
        value={text}
        autoComplete="off"
        placeholder={t("open.inline_add.placeholder")}
        aria-invalid={over > 0 || undefined}
        aria-describedby={over > 0 ? `${id}-over` : undefined}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== "Enter" || e.nativeEvent.isComposing) return;
          e.preventDefault();
          void add();
        }}
      />
      {over > 0 && (
        <span id={`${id}-over`} className={styles.over} role="status">
          {t("addtodo.too_long", { n: over, max: TODO_TEXT_MAX })}
        </span>
      )}
    </li>
  );
}
