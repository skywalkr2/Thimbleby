// Knowledge, Glossary (design 7.18): the person's own words, which the assistant never asks the meaning of, added to the
// words it already knows. An editable list: a word is added from the box and removed from its own button, each saved at
// once with the same read-back and Undo as on Settings. Case is ignored.
import { useId, useState } from "react";
import { useSettingEdits } from "../lib/use-setting-edits";
import { useWords } from "../lib/wording";

const KEY = "language.known_terms";

export function Glossary() {
  const { t } = useWords();
  const edit = useSettingEdits();
  const [typed, setTyped] = useState("");
  const id = useId();
  const item = edit.item(KEY);
  if (!edit.ready || !item) return null;
  const words = Array.isArray(item.value) ? item.value.map(String) : [];
  const word = typed.split(/\s+/).filter(Boolean).join(" ");
  const known = words.some((w) => w.toLowerCase() === word.toLowerCase());
  const save = (next: string[], message: string) => edit.save(KEY, { changes: { [KEY]: next } }, message);
  const add = async () => {
    if (!word || known) return;
    if (await save([...words, word], t("knowledge.glossary.added", { word }))) setTyped("");
  };
  const problem = edit.problems[KEY];
  return (
    <section className="glossary" aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`}>{t("knowledge.glossary.title")}</h2>
      <p className="hint">{t("knowledge.glossary.intro")}</p>
      {words.length === 0 ? (
        <p className="hint">{t("knowledge.glossary.none")}</p>
      ) : (
        <ul className="plain-list" aria-labelledby={`${id}-title`}>
          {words.map((w) => (
            <li key={w} className="inline-field">
              <span>{w}</span>
              <button
                type="button"
                className="btn quiet small"
                disabled={item.locked || !item.editable}
                aria-label={t("knowledge.glossary.remove_named", { word: w })}
                onClick={() =>
                  void save(
                    words.filter((x) => x !== w),
                    t("knowledge.glossary.removed", { word: w }),
                  )
                }
              >
                {t("knowledge.glossary.remove")}
              </button>
            </li>
          ))}
        </ul>
      )}
      <form
        className="inline-field"
        onSubmit={(e) => {
          e.preventDefault();
          void add();
        }}
      >
        <label htmlFor={`${id}-word`}>{t("knowledge.glossary.word")}</label>
        <input id={`${id}-word`} type="text" value={typed} autoComplete="off" disabled={item.locked || !item.editable} onChange={(e) => setTyped(e.target.value)} />
        <button type="submit" className="btn" disabled={!word || known || item.locked || !item.editable}>
          {t("knowledge.glossary.add")}
        </button>
      </form>
      {known && word && <p className="hint">{t("knowledge.glossary.known", { word })}</p>}
      {problem && (
        <p className="problem-note" role="alert">
          {problem}
        </p>
      )}
    </section>
  );
}
