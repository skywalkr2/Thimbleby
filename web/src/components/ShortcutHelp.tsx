// The list of keyboard shortcuts, from the configured keys, in three groups (move around, act on an item, go to) with the
// most-used first, then the Schedule's own. Each key is a chip in a column of one width, so the words start on one edge.
import { Heading } from "react-aria-components";
import { Button } from "../ui/Button";
import { GroupLabel } from "../ui/GroupLabel";
import { useWords } from "../lib/wording";
import { ModalPanel } from "./ModalPanel";
import styles from "./ShortcutHelp.module.css";

/** The configured actions in each group. Enter and Escape are fixed keys and follow the group's configured ones. */
const MOVE = ["next", "previous", "next_pane", "previous_pane"];
const ACT = ["undo", "primary", "send_back", "copy", "edit", "move"];
const GO = ["hand_in", "ask", "show_new", "help"];

export function ShortcutHelp(props: { open: boolean; onClose: () => void; keys: Record<string, string> }) {
  const { t } = useWords();
  if (!props.open) return null;
  const line = (key: string, words: string) => (
    <div key={`${key}:${words}`} className={styles.row}>
      <dt>
        <kbd>{key}</kbd>
      </dt>
      <dd>{words}</dd>
    </div>
  );
  const configured = (actions: string[]) => actions.filter((a) => props.keys[a]).map((a) => line(props.keys[a], t(`help.${a}`)));
  return (
    <ModalPanel titleId="help-title" onClose={props.onClose} dismissable>
      <Heading slot="title" id="help-title">
        {t("help.title")}
      </Heading>
      <section aria-labelledby="help-move">
        <GroupLabel id="help-move" className={styles.group}>
          {t("help.group.move")}
        </GroupLabel>
        <dl className={styles.list}>
          {configured(MOVE.slice(0, 2))}
          {line(t("help.enter_key"), t("help.toggle"))}
          {configured(MOVE.slice(2))}
        </dl>
      </section>
      <section aria-labelledby="help-act">
        <GroupLabel id="help-act" className={styles.group}>
          {t("help.group.act")}
        </GroupLabel>
        <dl className={styles.list}>{configured(ACT)}</dl>
      </section>
      <section aria-labelledby="help-go">
        <GroupLabel id="help-go" className={styles.group}>
          {t("help.group.go")}
        </GroupLabel>
        <dl className={styles.list}>
          {configured(GO)}
          {line(t("help.escape_key"), t("help.escape"))}
        </dl>
      </section>
      <section aria-labelledby="help-schedule">
        <GroupLabel id="help-schedule" className={styles.group}>
          {t("help.schedule_title")}
        </GroupLabel>
        <dl className={styles.list}>
          {line(t("help.schedule_keys"), t("help.schedule_move"))}
          {line(t("help.schedule_views_keys"), t("help.schedule_views"))}
          {line(t("help.escape_key"), t("help.schedule_escape"))}
        </dl>
      </section>
      <div className={styles.end}>
        <Button variant="primary" onClick={props.onClose} autoFocus>
          {t("action.close")}
        </Button>
      </div>
    </ModalPanel>
  );
}
