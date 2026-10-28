// Knowledge, Your words (design 7.18): the person's own words with what each means here, which includes the answers to "What
// does X mean here?". An entry is a row with its meaning and Stop using, like anything else in use. A word is added from the
// two boxes: with a meaning it is a glossary entry in the person's words, active at once; with no meaning it is only added to
// the words the assistant never asks about (`language.known_terms`), saved at once with the same read-back and Undo as on
// Settings. Case is ignored.
import { useId, useState } from "react";
import { useKnowledgeActs } from "../lib/knowledge-acts";
import { usedWords, type Item } from "../lib/knowledge";
import { useSettingEdits } from "../lib/use-setting-edits";
import { useWords } from "../lib/wording";
import { Button } from "../ui/Button";
import { Row } from "../ui/Row";
import styles from "./Knowledge.module.css";

const KEY = "language.known_terms";
const tidy = (text: string) => text.split(/\s+/).filter(Boolean).join(" ");

export function Glossary(props: { entries: Item[]; now: Date; onActed: () => void }) {
  const words = useWords();
  const { t } = words;
  const acts = useKnowledgeActs();
  const edit = useSettingEdits();
  const [typed, setTyped] = useState("");
  const [meant, setMeant] = useState("");
  const id = useId();
  const item = edit.item(KEY);
  const plain = item && Array.isArray(item.value) ? item.value.map(String) : [];
  const locked = !!item && (item.locked || !item.editable);
  const word = tidy(typed);
  const meaning = tidy(meant);
  const lower = word.toLowerCase();
  const known = props.entries.some((e) => e.term.toLowerCase() === lower) || plain.some((w) => w.toLowerCase() === lower);
  // With no meaning a word can only go to the words never asked about, which needs that setting.
  const cannot = !meaning && (!item || locked);
  const saveWords = (next: string[], message: string) => (item ? edit.save(KEY, { changes: { [KEY]: next } }, message) : Promise.resolve(false));
  const add = async () => {
    if (!word || known || cannot) return;
    const saved = meaning ? (await acts.addTerm(word, meaning)) !== undefined : await saveWords([...plain, word], t("knowledge.words.added", { word }));
    if (saved) {
      setTyped("");
      setMeant("");
      props.onActed();
    }
  };
  const problem = edit.problems[KEY];
  return (
    <section className={styles.words} aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`}>{t("knowledge.words.title")}</h2>
      <p className="hint">{t("knowledge.words.intro")}</p>
      {props.entries.length > 0 && (
        <ul className={styles.list} aria-label={t("knowledge.words.list_label")}>
          {props.entries.map((entry) => (
            <Row
              key={entry.id}
              title={entry.term || entry.text}
              meta={[entry.meaning, t(`knowledge.from.${entry.learnedFrom}`), usedWords(entry, props.now, words)].filter(Boolean).join(" · ")}
              primary={
                <Button
                  size="sm"
                  data-key="primary"
                  aria-label={t("knowledge.words.stop_named", { word: entry.term || entry.text })}
                  onClick={() => void acts.retire(entry).then(props.onActed)}
                >
                  {t("knowledge.retire")}
                </Button>
              }
            />
          ))}
        </ul>
      )}
      {plain.length > 0 && (
        <>
          <h3>{t("knowledge.words.plain_title")}</h3>
          <ul className="plain-list" aria-label={t("knowledge.words.plain_title")}>
            {plain.map((w) => (
              <li key={w} className="inline-field">
                <span>{w}</span>
                <Button variant="quiet" size="sm"
                  disabled={locked}
                  aria-label={t("knowledge.words.remove_named", { word: w })}
                  onClick={() =>
                    void saveWords(
                      plain.filter((x) => x !== w),
                      t("knowledge.words.removed", { word: w }),
                    )
                  }
                >
                  {t("knowledge.words.remove")}
                </Button>
              </li>
            ))}
          </ul>
        </>
      )}
      <form
        className={styles.addword}
        onSubmit={(e) => {
          e.preventDefault();
          void add();
        }}
      >
        <label htmlFor={`${id}-word`}>{t("knowledge.words.word")}</label>
        <input id={`${id}-word`} type="text" value={typed} autoComplete="off" onChange={(e) => setTyped(e.target.value)} />
        <label htmlFor={`${id}-meaning`}>{t("knowledge.words.meaning")}</label>
        <input id={`${id}-meaning`} type="text" value={meant} autoComplete="off" aria-describedby={`${id}-hint`} onChange={(e) => setMeant(e.target.value)} />
        <p className="hint" id={`${id}-hint`}>
          {t("knowledge.words.meaning_hint")}
        </p>
        <div>
          <Button type="submit" disabled={!word || known || cannot}>
            {t("knowledge.words.add")}
          </Button>
        </div>
      </form>
      {known && word && <p className="hint">{t("knowledge.words.known", { word })}</p>}
      {problem && (
        <p className="problem-note" role="alert">
          {problem}
        </p>
      )}
    </section>
  );
}
