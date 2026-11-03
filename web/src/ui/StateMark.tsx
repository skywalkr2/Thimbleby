// A thing's state, said the same way everywhere (design 7.12): a dot and a word in a row's meta. A state that needs the person
// (a warning or a danger) swaps the dot for an icon and is bold in its colour, and the row it sits in takes the matching edge
// and tint (`Row state=`), so the state is never told by colour alone: the word says it, the icon and the edge back it up. The
// side and calendar dots (`--side-*`, `--cal-*`) are a different thing and are never used for state.
import type { ReactNode } from "react";
import { Icon } from "./Icon";
import styles from "./StateMark.module.css";

export type StateTone = "ok" | "warn" | "danger" | "neutral";

/** Whether a tone asks something of the person: the row it is in takes an edge and a tint. */
export const needsYou = (tone: StateTone): tone is "warn" | "danger" => tone === "warn" || tone === "danger";

/** `quiet` keeps the dot for a state that is one of several in a list under a heading that already needs the person (a connection
 * in an account's card): the word says it, and the dot takes the tone's color. */
export function StateMark(props: { tone: StateTone; children: ReactNode; className?: string; title?: string; id?: string; quiet?: boolean }) {
  const { tone, children, className, title, id, quiet } = props;
  return (
    <span id={id} className={[styles.mark, className ?? ""].filter(Boolean).join(" ")} data-state-mark="" data-tone={tone} data-quiet={quiet ? "" : undefined} title={title}>
      {needsYou(tone) && !quiet ? <Icon name="alert" size={16} /> : <span className={styles.dot} aria-hidden="true" />}
      <span className={styles.word}>{children}</span>
    </span>
  );
}
