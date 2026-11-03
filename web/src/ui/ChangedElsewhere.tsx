// A save refused because the thing changed somewhere else (design 7.12, "States"): what is saved now and what it was, one line
// for each field that moved under the person's edit, "old → new". The person's own edit is kept, and they choose: keep theirs
// (the next Save replaces what is there) or take the new value. Nothing is applied until they choose.
import { useWords } from "../lib/wording";
import { Button } from "./Button";
import { Icon } from "./Icon";
import { StateMark } from "./StateMark";
import styles from "./ChangedElsewhere.module.css";

export interface ElsewhereChange {
  /** What the field is called. */
  label: string;
  /** What it said when the person opened it. */
  was: string;
  /** What it says now. */
  now: string;
  /** What the person has typed there. */
  mine: string;
}

export function ChangedElsewhere(props: {
  changes: ElsewhereChange[];
  /** When the other change was made, as a time of day; left out when it is not known. */
  time?: string;
  /** Keep what the person typed: the next Save replaces the new value. */
  onKeep: () => void;
  /** Take the new values in place of what the person typed. */
  onTake: () => void;
}) {
  const { t } = useWords();
  if (props.changes.length === 0) return null;
  return (
    <div className={styles.box} role="alert" data-changed-elsewhere="">
      <StateMark tone="warn">{t("state.changed.title")}</StateMark>
      <p className={styles.text}>{props.time ? t("state.changed.text_at", { time: props.time }) : t("state.changed.text")}</p>
      <ul className={styles.list}>
        {props.changes.map((c) => (
          <li key={c.label}>
            <span className={styles.label}>{c.label}</span> <span data-was="">{c.was}</span>
            <span className={styles.arrow} aria-hidden="true">
              <Icon name="arrow-right" size={14} />
            </span>
            <span className="sr">{t("state.changed.now")}</span> <strong data-now="">{c.now}</strong>
            <span className={styles.mine}>{t("state.changed.yours", { mine: c.mine })}</span>
          </li>
        ))}
      </ul>
      <div className={styles.actions}>
        <Button size="sm" onClick={props.onKeep}>
          {t("state.changed.keep")}
        </Button>
        <Button size="sm" onClick={props.onTake}>
          {t("state.changed.take")}
        </Button>
      </div>
    </div>
  );
}
