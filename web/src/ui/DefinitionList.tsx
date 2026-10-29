// A list of what a record is (design 7.12, 7.14): a muted label of one fixed width, its value, and rows 36px high, with no field
// shown twice. A `Definition` holds one `dt` and its `dd`. `inline` is the compact form for a card, "label: value" side by side,
// that wraps. Below 640px the label goes above its value.
import type { HTMLAttributes } from "react";
import styles from "./DefinitionList.module.css";

export function DefinitionList(props: HTMLAttributes<HTMLDListElement> & { inline?: boolean }) {
  const { inline, className, ...rest } = props;
  return <dl {...rest} data-definition-list="" className={[styles.list, inline ? styles.inline : "", className ?? ""].filter(Boolean).join(" ")} />;
}

export function Definition(props: HTMLAttributes<HTMLDivElement>) {
  const { className, ...rest } = props;
  return <div {...rest} data-definition="" className={[styles.item, className ?? ""].filter(Boolean).join(" ")} />;
}
