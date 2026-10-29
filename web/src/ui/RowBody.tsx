// What an expanded row holds under it (design 7.14): a hairline across the row's full width, then its content, one part under
// another. Text from outside breaks anywhere rather than widen the screen. In a pane (`pane`) the row's own frame is the
// pane's, so there is no hairline and no side padding.
import type { HTMLAttributes } from "react";
import styles from "./RowBody.module.css";

export function RowBody(props: HTMLAttributes<HTMLDivElement> & { pane?: boolean }) {
  const { pane, className, ...rest } = props;
  return <div {...rest} data-row-body="" className={[styles.body, pane ? styles.pane : "", className ?? ""].filter(Boolean).join(" ")} />;
}
