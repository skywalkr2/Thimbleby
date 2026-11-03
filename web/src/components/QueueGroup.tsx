// A group of the Today queue (design 7.7): a small heading and its rows, in a list. The groups come in rank order and
// nothing nests inside a row beyond its items.
import type { ReactNode } from "react";
import { GroupLabel } from "../ui/GroupLabel";
import styles from "./Today.module.css";

/** One group of the queue: its label (the shared group label, with how many lines it holds in a pill) and its lines. The count is drawn for the eye; the list itself tells a screen reader how many there are. */
export function QueueGroup(props: { id: string; title: string; count?: number; tone?: "plain" | "danger"; children: ReactNode }) {
  return (
    <section className={styles.group} aria-labelledby={props.id}>
      <GroupLabel id={props.id} count={props.count} tone={props.tone} className={styles.groupHead}>
        {props.title}
      </GroupLabel>
      <ul className={styles.list}>{props.children}</ul>
    </section>
  );
}
