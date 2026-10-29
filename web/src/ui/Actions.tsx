// A group of buttons that go together (design 7.12): the row's actions, a form's Cancel and Save, a pane's choices. They wrap
// rather than run off a narrow window. `align="end"` puts them at the right edge, as a form's buttons are. `group` names the
// group for a screen reader when the buttons alone don't say what they are about.
import type { HTMLAttributes, Ref } from "react";
import styles from "./Actions.module.css";

export function Actions(props: HTMLAttributes<HTMLDivElement> & { align?: "start" | "end"; as?: "div" | "span" | "p"; ref?: Ref<HTMLDivElement> }) {
  const { align = "start", as: Tag = "div", className, ...rest } = props;
  return (
    <Tag
      {...(rest as HTMLAttributes<HTMLDivElement>)}
      data-actions=""
      className={[styles.actions, align === "end" ? styles.end : "", className ?? ""].filter(Boolean).join(" ")}
    />
  );
}
