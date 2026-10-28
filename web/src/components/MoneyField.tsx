// A box for an amount of money (design 7.9): shown as currency with two decimals in the person's number format, typed with
// or without the sign and in that number format ("1.5", "$1.50" and "1,50" where a comma is the decimal mark are the same
// amount). While the cursor is in the box what was typed stays as it was typed; leaving it writes the amount out. The draft
// the form keeps is the amount as plain digits, or the text typed when it is not an amount yet.
import { useState } from "react";
import { parseAmount, useWriteAmount } from "../lib/money";
import { useWords } from "../lib/wording";

export function MoneyField(props: {
  id: string;
  /** The draft: the amount as plain digits ("0.1"), or what was typed when it isn't an amount. */
  value: string;
  disabled: boolean;
  invalid?: boolean;
  describedBy?: string;
  onChange: (draft: string) => void;
  /** The cursor left the box or Enter was pressed: the draft to save. */
  onCommit?: (draft: string) => void;
}) {
  const { locale } = useWords();
  const write = useWriteAmount();
  // What is typed while the cursor is in the box; none the rest of the time, when the amount is written out.
  const [typed, setTyped] = useState<string | null>(null);
  const draftOf = (text: string) => {
    const n = parseAmount(text, locale);
    return n === null ? text : String(n);
  };
  const written = (draft: string) => {
    const n = draft.trim() === "" ? null : parseAmount(draft, locale);
    return n === null ? draft : write(n);
  };
  return (
    <input
      id={props.id}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      value={typed ?? written(props.value)}
      disabled={props.disabled}
      aria-invalid={props.invalid ? true : undefined}
      aria-describedby={props.describedBy}
      onFocus={(e) => {
        setTyped(typed ?? written(props.value));
        e.currentTarget.select();
      }}
      onChange={(e) => {
        setTyped(e.target.value);
        props.onChange(draftOf(e.target.value));
      }}
      onBlur={(e) => {
        const draft = draftOf(e.target.value);
        setTyped(null);
        props.onChange(draft);
        props.onCommit?.(draft);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          const draft = draftOf(e.currentTarget.value);
          props.onChange(draft);
          props.onCommit?.(draft);
        }
      }}
    />
  );
}
