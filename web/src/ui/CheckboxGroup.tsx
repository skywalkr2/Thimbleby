// A group of ticks or of choices that go together (design 7.12): a real fieldset, so a screen reader says the group's name,
// with its legend above the choices in the label's weight, and no frame drawn through it. Used for checkboxes and for
// radio buttons alike; a field that is one control uses FormField. `legendHidden` keeps the legend for screen readers only.
import type { ComponentPropsWithRef, ReactNode } from "react";
import styles from "./CheckboxGroup.module.css";

export interface CheckboxGroupProps extends Omit<ComponentPropsWithRef<"fieldset">, "title"> {
  legend: ReactNode;
  legendHidden?: boolean;
  /** A help line under the legend. */
  hint?: ReactNode;
  /** Draw the group on a soft sunken panel, for a set of choices inside a longer form. */
  panel?: boolean;
}

export function CheckboxGroup(props: CheckboxGroupProps) {
  const { legend, legendHidden, hint, panel, className, children, ...rest } = props;
  return (
    <fieldset {...rest} data-ui="group" className={[styles.group, panel ? styles.panel : "", className ?? ""].filter(Boolean).join(" ")}>
      <legend className={legendHidden ? "sr" : styles.legend}>{legend}</legend>
      {hint && <p className={styles.hint}>{hint}</p>}
      {children}
    </fieldset>
  );
}
