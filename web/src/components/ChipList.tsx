// A list of words as chips (design 7.9): type a word and press Enter to add it, each word is a chip with its own Remove
// button. The words are saved as they are made, like every other setting. The list is a labelled group, every chip is a
// list item, and each addition or removal is said aloud in a polite status line, so the keyboard and a screen reader work
// the same as the mouse. A word already in the list is not added twice; a pasted block of lines adds one word a line.
import { useState } from "react";
import { useWords } from "../lib/wording";

export const wordsOf = (draft: string): string[] => draft.split("\n").filter(Boolean);

export function ChipList(props: {
  /** The id of the box the words are typed in. */
  id: string;
  /** What names the list for a screen reader (the setting's own label), beside the box's own label. */
  label?: string;
  /** The words, one a line. */
  value: string;
  disabled: boolean;
  describedBy?: string;
  /** The words changed: the draft to keep and, when the caller saves as it goes, to save. */
  onChange: (draft: string) => void;
}) {
  const { t } = useWords();
  const [typed, setTyped] = useState("");
  const [said, setSaid] = useState("");
  const words = wordsOf(props.value);

  const write = (next: string[]) => props.onChange(next.join("\n"));
  /** Adds what is typed (a block of lines is one word a line). Returns whether anything was added. */
  const add = (text: string): boolean => {
    const fresh = text
      .split("\n")
      .map((w) => w.trim())
      .filter((w, i, all) => w && all.indexOf(w) === i);
    const added = fresh.filter((w) => !words.includes(w));
    if (fresh.length > 0 && added.length === 0) {
      setSaid(t("settings.chips.already", { word: fresh[0] }));
      setTyped("");
      return false;
    }
    if (added.length === 0) return false;
    write([...words, ...added]);
    setSaid(t("settings.chips.added", { word: added.join(", ") }));
    setTyped("");
    return true;
  };
  const remove = (word: string) => {
    write(words.filter((w) => w !== word));
    setSaid(t("settings.chips.removed", { word }));
    document.getElementById(props.id)?.focus();
  };

  return (
    <div className="chip-list">
      {words.length > 0 && (
        <ul className="chips" aria-label={props.label ? t("settings.chips.words_of", { label: props.label }) : t("settings.chips.words")}>
          {words.map((word) => (
            <li key={word} className="chip">
              <span>{word}</span>
              <button
                type="button"
                className="chip-remove"
                disabled={props.disabled}
                aria-label={t("settings.chips.remove", { word })}
                onClick={() => remove(word)}
              >
                <span aria-hidden="true">×</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <input
        id={props.id}
        type="text"
        value={typed}
        disabled={props.disabled}
        autoComplete="off"
        aria-describedby={props.describedBy}
        onChange={(e) => {
          // A pasted block of lines becomes words at once; a word typed waits for Enter or for the cursor to leave.
          if (e.target.value.includes("\n")) add(e.target.value);
          else setTyped(e.target.value);
        }}
        onPaste={(e) => {
          const text = e.clipboardData.getData("text");
          if (text.includes("\n")) {
            e.preventDefault();
            add(text);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            // Enter adds the word and never submits a form around the list.
            e.preventDefault();
            add(typed);
          }
        }}
        onBlur={() => {
          if (typed.trim()) add(typed);
        }}
      />
      <p className="sr" role="status">
        {said}
      </p>
    </div>
  );
}
