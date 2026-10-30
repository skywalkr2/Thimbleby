// The header's status chip (design 7.1, 7.12): a dot and a word for the worst current state. The word always says it;
// the dot only reinforces. It is the trigger of the popover that lists every state.
import type { ReactNode } from "react";
import { Button as AriaButton, type ButtonProps as AriaButtonProps } from "react-aria-components";
import styles from "./StatusChip.module.css";

export interface StatusChipProps extends Omit<AriaButtonProps, "children" | "className"> {
  tone?: "ok" | "warn" | "danger";
  children: ReactNode;
  className?: string;
}

export function StatusChip(props: StatusChipProps) {
  const { tone = "ok", children, className, ...rest } = props;
  return (
    <AriaButton {...rest} className={[styles.chip, tone === "warn" ? styles.warn : "", tone === "danger" ? styles.danger : "", className ?? ""].filter(Boolean).join(" ")} data-tone={tone}>
      <span className={styles.head}>
        <span className={styles.dot} aria-hidden="true" />
        <span className={styles.word}>{children}</span>
      </span>
    </AriaButton>
  );
}
