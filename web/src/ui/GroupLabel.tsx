// The label over a group of rows (design 7.12, "Type"): 11px, uppercase, spaced, in the muted color, with the count in a pill.
// It is a heading (`h3` unless the caller says another level), so a screen reader walks the groups. The count is drawn for the
// eye and left out of the heading's name: the list itself says how many rows it holds. `tone="danger"` is for a group of
// things that are late or failing; the word says it too, so the color is never the only sign.
import type { ElementType, HTMLAttributes, ReactNode } from "react";
import styles from "./GroupLabel.module.css";

export interface GroupLabelProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
  /** How many rows the group holds, drawn in a pill after the words. Left out when it is 0 or not given. */
  count?: number;
  tone?: "plain" | "danger";
  /** The element drawn: a heading by default. */
  as?: ElementType;
}

export function GroupLabel(props: GroupLabelProps) {
  const { children, count, tone = "plain", as: Tag = "h3", className, ...rest } = props;
  return (
    <Tag {...rest} data-group-label="" data-tone={tone} className={[styles.label, className ?? ""].filter(Boolean).join(" ")}>
      <span className={styles.words}>{children}</span>
      {count ? (
        <span className={styles.count} aria-hidden="true" data-group-count="">
          {count}
        </span>
      ) : null}
    </Tag>
  );
}
