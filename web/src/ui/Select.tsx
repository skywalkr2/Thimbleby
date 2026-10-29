// The one list to pick from (design 7.12): the browser's own select, so the keyboard, a screen reader and a phone's picker
// all work as they should, drawn in the app's look: the control's height and border, a caret that follows the text colour,
// and the sunken fill when it is disabled. A field with a known set of values is always a Select, never a box to type in.
// Give it an id and a label (FormField), or a name of its own (`aria-label`).
import type { ComponentPropsWithRef } from "react";
import styles from "./Select.module.css";

export function Select(props: ComponentPropsWithRef<"select">) {
  const { className, ...rest } = props;
  return <select {...rest} data-ui="select" className={[styles.select, className ?? ""].filter(Boolean).join(" ")} />;
}
