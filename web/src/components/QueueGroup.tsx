// A group of the Today queue (design 7.7): a small heading and its rows, in a list. The groups come in rank order and
// nothing nests inside a row beyond its items.
import type { ReactNode } from "react";
import styles from "./Today.module.css";

/** One group of the queue: its heading (12px, semibold, with how many lines it holds) and its lines. The count is drawn for the eye; the list itself tells a screen reader how many there are. */
export function QueueGroup(props: { id: string; title: string; count?: number; children: ReactNode }) {
  return (
    <section className={styles.group} aria-labelledby={props.id}>
      <h3 id={props.id} className={styles.groupHead}>
        {props.title}
        {props.count ? (
          <span className={styles.groupCount} aria-hidden="true">
            · {props.count}
          </span>
        ) : null}
      </h3>
      <ul className={styles.list}>{props.children}</ul>
    </section>
  );
}
