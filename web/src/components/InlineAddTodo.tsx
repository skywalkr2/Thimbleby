// The add row at the top of the to-dos (design 7.5): type a title and press Enter and the to-do is added, as the person's own,
// with Undo on the toast; the cursor stays in the row for the next one. A date said at the end of the title ("by Friday",
// "tomorrow", "on the 12th", "next week") is found by rules, never by the assistant: the day it means is shown beside the row
// before Enter, with a way to drop it, and the to-do is added with that day and the title without it. A title with no date still
// goes to "Needs a date". What needs more than a title (who does it, how it repeats) is the Add form, reached from the header's
// button. With several sides and none picked, the to-do cannot be filed from here (the form asks where it belongs), so Enter
// opens the form with the words already in it. A save that fails keeps the words in the row and says "Not saved", with Try again.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useId, useMemo, useRef, useState } from "react";
import { api } from "../lib/api";
import { useAct } from "../lib/act";
import { useConnection } from "../lib/connection";
import { day } from "../lib/dates";
import { useSideFilter } from "../lib/sides";
import { TODO_TEXT_MAX } from "../lib/todo-limits";
import { useDayCheck } from "../lib/todo-day";
import { splitDatePhrase, usePhraseWords } from "../lib/todo-phrase";
import { useWords } from "../lib/wording";
import { Button } from "../ui/Button";
import { Icon } from "../ui/Icon";
import { NotSaved, reasonOf } from "../ui/NotSaved";
import styles from "./OpenItems.module.css";

export function InlineAddTodo(props: { onDetails: (words: string) => void }) {
  const { t, locale } = useWords();
  const act = useAct();
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const people = useQuery({ queryKey: ["people"], queryFn: api.people });
  const filter = useSideFilter();
  const connection = useConnection();
  const phraseWords = usePhraseWords();
  const [text, setText] = useState("");
  const [dropped, setDropped] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const words = text.trim();
  // The date at the end of the title, unless the person dropped that very phrase.
  const split = useMemo(() => splitDatePhrase(words, phraseWords, locale), [words, phraseWords.lead.join("|"), locale]); // eslint-disable-line react-hooks/exhaustive-deps
  const phrase = split && split.phrase !== dropped ? split.phrase : "";
  const read = useDayCheck(phrase);
  const found = split && read?.status === "ok" && read.day ? read.day : null;
  const title = found && split ? split.title : words;
  const over = title.length - TODO_TEXT_MAX;
  const queries = useQueryClient();
  const who = (people.data ?? []).find((p) => p.is_pm)?.id ?? "";
  const place = filter.offered && filter.choice !== "all" ? filter.choice : "";
  const add = async () => {
    if (!words || over > 0) return;
    if (filter.offered && !place) {
      props.onDetails(words);
      setText("");
      return;
    }
    // The person is the owner. When the list of people hasn't come back yet (a busy server), it is waited for rather than
    // the Enter being dropped; with no person of their own at all, the row says it wasn't saved.
    const owner = who || ((await queries.fetchQuery({ queryKey: ["people"], queryFn: api.people }).catch(() => [])) ?? []).find((p) => p.is_pm)?.id || "";
    if (!owner) {
      setFailed(t("state.not_saved.unreachable"));
      return;
    }
    setFailed(null);
    setSaving(true);
    // The day is the server's reading of the phrase; asked again here when the preview has not come back yet.
    let when = "";
    let sent = words;
    if (split && phrase) {
      const reading = read ?? (await api.checkTodoDay({ words: phrase }).catch(() => null));
      if (reading?.status === "ok") {
        when = phrase;
        sent = split.title;
      }
    }
    const made = await act(
      () => api.addTodo({ text: sent, owners: [owner], ...(when ? { when } : {}), ...(place ? { project: place } : {}) }),
      (result) => ({
        message: t("addtodo.saved", { text: sent }),
        undo: async () => {
          for (const changeset of [...result.changesets].reverse()) await api.undo(changeset);
        },
      }),
      (err) => setFailed(reasonOf(err) || (connection.offline || !(err as { status?: number }).status ? t("state.not_saved.unreachable") : "")),
    );
    setSaving(false);
    if (made) {
      setText("");
      setDropped(null);
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
        onChange={(e) => {
          setText(e.target.value);
          setFailed(null);
        }}
        onKeyDown={(e) => {
          if (e.key !== "Enter" || e.nativeEvent.isComposing) return;
          e.preventDefault();
          void add();
        }}
      />
      {found && split && (
        <span className={styles.found} role="status" data-date-found="">
          <Icon name="calendar" size={16} />
          <span>{t("open.inline_add.date_found", { date: day(found) })}</span>
          <Button variant="quiet" size="sm" aria-label={t("open.inline_add.date_drop_named", { phrase: split.phrase })} onClick={() => {
              setDropped(split.phrase);
              input.current?.focus();
            }}>
            {t("open.inline_add.date_drop")}
          </Button>
        </span>
      )}
      {words && (
        <Button
          variant="quiet"
          size="sm"
          onClick={() => {
            props.onDetails(words);
            setText("");
          }}
        >
          {t("open.inline_add.details")}
        </Button>
      )}
      {over > 0 && (
        <span id={`${id}-over`} className={styles.over} role="status">
          {t("addtodo.too_long", { n: over, max: TODO_TEXT_MAX })}
        </span>
      )}
      {failed !== null && <NotSaved className={styles.inlineFailed} what={title} reason={failed} busy={saving} onRetry={() => void add()} />}
    </li>
  );
}
