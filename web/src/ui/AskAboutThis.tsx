// The composer on a record's page (design 7.14): one line, with a send button inside it at the right. The label is for screen
// readers; the words in the box say what to ask. Enter sends and Shift+Enter starts another line, so the box grows with what is
// typed and stays one line until then. The help line, when there is one, sits under it.
import { useId, type Ref } from "react";
import { useWords } from "../lib/wording";
import { IconButton } from "./IconButton";
import styles from "./AskAboutThis.module.css";

export function AskAboutThis(props: {
  /** What the box is for, said to a screen reader. */
  label: string;
  placeholder?: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  busy?: boolean;
  /** The send button's name. */
  sendLabel: string;
  inputRef?: Ref<HTMLTextAreaElement>;
}) {
  const id = useId();
  const { t } = useWords();
  const empty = !props.value.trim();
  return (
    <form
      className={styles.composer}
      data-composer=""
      onSubmit={(e) => {
        e.preventDefault();
        props.onSend();
      }}
    >
      <label htmlFor={id} className="sr">
        {props.label}
      </label>
      <div className={styles.box}>
        <textarea
          id={id}
          ref={props.inputRef}
          rows={1}
          className={styles.input}
          value={props.value}
          aria-describedby={props.hint ? `${id}-hint` : undefined}
          placeholder={props.placeholder}
          onChange={(e) => props.onChange(e.target.value)}
          onKeyDown={(e) => {
            // Enter sends; Shift+Enter starts a new line.
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              props.onSend();
            }
          }}
        />
        <IconButton icon="send" label={props.busy ? t("conversation.sending") : props.sendLabel} type="submit" isDisabled={props.busy || empty} variant="secondary" size="sm" tooltip={false} />
      </div>
      {props.hint && (
        <p id={`${id}-hint`} className={styles.hint}>
          {props.hint}
        </p>
      )}
    </form>
  );
}
