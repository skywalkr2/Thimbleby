// One form field (design 7.12): the label above in 14/600, the control, then the help line below in 13/400, with even gaps.
// "Optional" is a small tag after the label, never part of its words. The label is tied to the control by `id`, and the help
// line is wired to it for screen readers when the control names it (`aria-describedby={`${id}-hint`}`) or `describes` is set.
// A field that has a known set of values uses `Select`, a date `DateField`, a file `FileDrop`, a group of ticks `CheckboxGroup`.
import { useId, type HTMLAttributes, type ReactNode } from "react";
import { useWords } from "../lib/wording";
import styles from "./FormField.module.css";

export function FormField(
  props: Omit<HTMLAttributes<HTMLDivElement>, "id" | "children" | "className"> & {
  /** The control's id: the label's `for`. Left out, one is made and handed to `children` when that is a function. */
  id?: string;
  label: ReactNode;
  /** The help line below the control. Its id is `${id}-hint`. */
  hint?: ReactNode;
  /** Shows the "Optional" tag after the label. */
  optional?: boolean;
  /** Keep the label for screen readers only (a search box has its icon and placeholder). */
  labelHidden?: boolean;
  className?: string;
  children: ReactNode | ((id: string) => ReactNode);
},
) {
  const { t } = useWords();
  const { id: given, label, hint, optional, labelHidden, className, children, ...rest } = props;
  const own = useId();
  const id = given ?? own;
  return (
    <div {...rest} className={[styles.field, className ?? ""].filter(Boolean).join(" ")} data-field="">
      <label htmlFor={id} className={labelHidden ? "sr" : styles.label}>
        {label}
        {optional && (
          <span className={styles.optional} data-tag="">
            {t("form.optional")}
          </span>
        )}
      </label>
      {typeof children === "function" ? children(id) : children}
      {hint && (
        <p id={`${id}-hint`} className={styles.hint}>
          {hint}
        </p>
      )}
    </div>
  );
}
