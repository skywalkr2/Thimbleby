// A date, a time or a date with a time (design 7.12): the browser's own control, so typing, the keyboard, a screen reader
// and a phone's picker all work, drawn in the app's look and kept to the width a date needs. `kind` is the browser's type.
import type { ComponentPropsWithRef } from "react";
import styles from "./DateField.module.css";

export interface DateFieldProps extends Omit<ComponentPropsWithRef<"input">, "type"> {
  /** A day, a time of day, or a day and a time. */
  kind?: "date" | "time" | "datetime-local";
}

export function DateField(props: DateFieldProps) {
  const { kind = "date", className, ...rest } = props;
  return <input {...rest} type={kind} data-ui="date" className={[styles.date, kind === "datetime-local" ? styles.both : "", className ?? ""].filter(Boolean).join(" ")} />;
}
