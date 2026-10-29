// The top of an item shown in a detail pane (design 7.13): its state and what the state means, with its actions beside
// them. The words wrap inside their own part, so the menu is never left alone under them.
import type { ReactNode } from "react";
import styles from "./DetailTop.module.css";

export function DetailTop(props: { state: ReactNode; actions?: ReactNode }) {
  return (
    <div className={styles.top} data-detail-top="">
      <div className={styles.state}>{props.state}</div>
      {props.actions && <div className={styles.actions}>{props.actions}</div>}
    </div>
  );
}
