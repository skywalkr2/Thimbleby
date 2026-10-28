// The round tick in a row's leading slot (design 7.12): one press marks the item done, and Undo comes in the toast. It is a button
// with the action's name, never a check box, because it acts at once. The ring is 18px inside a 24px target.
import type { ButtonHTMLAttributes, Ref } from "react";
import styles from "./RoundCheck.module.css";

export interface RoundCheckProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "aria-label"> {
  /** What pressing it does, in words: it is the button's accessible name. */
  label: string;
  ref?: Ref<HTMLButtonElement>;
}

export function RoundCheck(props: RoundCheckProps) {
  const { label, className, ref, ...rest } = props;
  return (
    <button type="button" {...rest} ref={ref} aria-label={label} className={[styles.check, className ?? ""].filter(Boolean).join(" ")}>
      <span className={styles.ring} aria-hidden="true" />
    </button>
  );
}
