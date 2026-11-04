// Skeleton rows (design 7.12): the shape of the rows that are coming, with `aria-busy` on the region, in place of any
// "Loading…" text. `shape="form"` is the shape of a page of fields. The shimmer is off under reduced motion.
import { useWords } from "../lib/wording";
import styles from "./Skeleton.module.css";

export function Skeleton(props: { rows?: number; className?: string; shape?: "rows" | "form" }) {
  const { t } = useWords();
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
