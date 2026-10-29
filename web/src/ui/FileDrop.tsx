// A file to choose (design 7.12): a drop zone drawn in the app's look, holding the browser's own file control so the keyboard
// and a screen reader work as they do everywhere. It shows what was chosen, or what to do. Give it an id and a label
// (FormField). A file chooser opened from a button has no zone: use a hidden input there.
import { useRef, useState, type ComponentPropsWithRef } from "react";
import { useWords } from "../lib/wording";
import { Icon } from "./Icon";
import styles from "./FileDrop.module.css";

export function FileDrop(props: Omit<ComponentPropsWithRef<"input">, "type" | "children">) {
  const { t } = useWords();
  const { className, onChange, ...rest } = props;
  const [name, setName] = useState("");
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  return (
    <span className={[styles.zone, className ?? ""].filter(Boolean).join(" ")} data-ui="file" data-over={over ? "" : undefined} data-chosen={name ? "" : undefined}>
      <input
        {...rest}
        ref={(el) => {
          input.current = el;
          const ref = rest.ref;
          if (typeof ref === "function") ref(el);
          else if (ref) (ref as { current: HTMLInputElement | null }).current = el;
        }}
        type="file"
        className={styles.input}
        onChange={(e) => {
          setName(e.target.files?.[0]?.name ?? "");
          onChange?.(e);
        }}
        onDragEnter={() => setOver(true)}
        onDragLeave={() => setOver(false)}
        onDrop={() => setOver(false)}
      />
      <span className={styles.face} aria-hidden="true">
        <Icon name="upload" size={20} />
        <span className={styles.words}>{name || t("form.file_choose")}</span>
        {!name && <span className={styles.sub}>{t("form.file_or_drop")}</span>}
      </span>
    </span>
  );
}
