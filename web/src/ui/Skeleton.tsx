// Skeleton rows (design 7.12): the shape of the rows that are coming, with `aria-busy` on the region, in place of any
// "Loading…" text. `shape="form"` is the shape of a page of fields. The shimmer is off under reduced motion.
import type { CSSProperties, ReactNode } from "react";
import { useWords } from "../lib/wording";
import styles from "./Skeleton.module.css";

export function Skeleton(props: { rows?: number; className?: string; shape?: "rows" | "form" | "frame"; style?: CSSProperties; children?: ReactNode; kind?: string }) {
  const { t } = useWords();
  if (props.shape === "frame") {
    // A frame the caller fills with its own shapes (a time grid): the region and its accessible name are the same.
    return (
      <div role="status" aria-busy="true" aria-label={t("loading")} className={props.className} data-skeleton={props.kind ?? "frame"} style={props.style}>
        {props.children}
      </div>
    );
  }
  const rows = Math.max(1, props.rows ?? 3);
  if (props.shape === "form") {
    // A page of fields: a label and a box each, the shape of a form rather than of a list.
    return (
      <div role="status" aria-busy="true" aria-label={t("loading")} className={[styles.region, props.className ?? ""].filter(Boolean).join(" ")} data-skeleton="form">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className={styles.field} aria-hidden="true">
            <span className={`${styles.bar} ${styles.label}`} />
            <span className={styles.input} />
          </div>
        ))}
      </div>
    );
  }
  return (
    <div role="status" aria-busy="true" aria-label={t("loading")} className={[styles.region, props.className ?? ""].filter(Boolean).join(" ")} data-skeleton="">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className={styles.row} aria-hidden="true">
          <span className={styles.lead} />
          <span className={styles.lines}>
            <span className={styles.bar} />
            <span className={`${styles.bar} ${styles.short}`} />
          </span>
          <span className={styles.btn} />
        </div>
      ))}
    </div>
  );
}
