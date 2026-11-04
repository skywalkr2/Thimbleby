// How a to-do repeats (design 6.32): a list of the usual ways, "Doesn't repeat" first, and "Something else" for any other way
// said in words (which the server reads and the screen says back before it is kept). The list never needs typing; the words box
// appears only for the way that isn't in it. What a choice stands for is the phrase the server reads.
import { useState, type ReactNode } from "react";
import { useWords } from "../lib/wording";
import { FormField } from "../ui/FormField";
import { Select } from "../ui/Select";

/** The usual ways to repeat, in the order the list shows them: the key of the wording and the phrase it stands for. */
export const REPEAT_CHOICES: ReadonlyArray<{ key: string; phrase: string }> = [
  { key: "daily", phrase: "every day" },
  { key: "weekdays", phrase: "every weekday" },
  { key: "weekly", phrase: "every week" },
  { key: "biweekly", phrase: "every other week" },
  { key: "monthly", phrase: "every month" },
];

const OTHER = "other";

/** `value` is the phrase ("" for none); `children` is the line that says it back, under the field. */
export function RepeatField(props: { id: string; value: string; onChange: (phrase: string) => void; children?: ReactNode }) {
  const { t } = useWords();
  const typed = props.value.trim();
  const known = REPEAT_CHOICES.find((c) => c.phrase === typed.toLowerCase());
  const [other, setOther] = useState(typed !== "" && !known);
  const picked = other ? OTHER : (known?.phrase ?? "");
  return (
    <FormField id={`${props.id}-repeat`} label={t("repeat.label")}>
      <Select
        id={`${props.id}-repeat`}
        value={picked}
        aria-describedby={`${props.id}-said`}
        onChange={(e) => {
          const next = e.target.value;
          if (next === OTHER) {
            setOther(true);
            return;
          }
          setOther(false);
          props.onChange(next);
        }}
      >
        <option value="">{t("repeat.choice.none")}</option>
        {REPEAT_CHOICES.map((c) => (
          <option key={c.key} value={c.phrase}>
            {t(`repeat.choice.${c.key}`)}
          </option>
        ))}
        <option value={OTHER}>{t("repeat.choice.other")}</option>
      </Select>
      {picked === OTHER && (
        <input
          type="text"
          autoFocus
          value={props.value}
          placeholder={t("repeat.placeholder")}
          aria-label={t("repeat.choice.other_words")}
          aria-describedby={`${props.id}-said`}
          onChange={(e) => props.onChange(e.target.value)}
        />
      )}
      <p className="hint" id={`${props.id}-said`} aria-live="polite">
        {props.children}
      </p>
    </FormField>
  );
}
