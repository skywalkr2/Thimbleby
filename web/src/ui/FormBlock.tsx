// The spacing around one part of a form that is not a labelled control: a checkbox with its note, a sentence with its
// buttons, a question that holds its own choices. It keeps the same even gap as FormField, so a form reads as one rhythm.
// `as="section"` for a part that is named by a heading of its own.
import type { HTMLAttributes } from "react";
import styles from "./FormField.module.css";

export function FormBlock(props: HTMLAttributes<HTMLElement> & { as?: "div" | "section" | "form" }) {
  const { className, as: Tag = "div", ...rest } = props;
  return <Tag {...rest} className={[styles.field, className ?? ""].filter(Boolean).join(" ")} data-field="" />;
}
