// Dropping an action that is no longer needed (design 6.8): the row menu's "Drop" asks why (the first field has the
// cursor) and acts at once with Undo. A dropped action is never done or credited, and it leaves every list. When the
// action reached people, the one button reads "Drop it and tell them": it also drafts a note to each, which waits for
// the person's yes, and Undo takes the notes and the drop back together.
import { useId, useState, type ReactNode } from "react";
import { api } from "../lib/api";
import { useAct } from "../lib/act";
import { useWords } from "../lib/wording";
import type { MenuAction } from "./RowMenu";
import { Button } from "../ui/Button";
import { Actions } from "../ui/Actions";
/** The row menu's "Drop" entry for an action, and the small form it opens. `onClosed` runs when the form goes, so the row
 * can take focus back. */
export function useDropAction(action: { id: string; told_names?: string[] }, onClosed?: () => void): { entry: MenuAction; form: ReactNode } {
  const { t } = useWords();
  const act = useAct();
  const id = useId();
  const [asking, setAsking] = useState(false);
  const [reason, setReason] = useState("");
  const told = action.told_names ?? [];
  const close = () => {
    setAsking(false);
    setReason("");
    onClosed?.();
  };
  const entry: MenuAction = { id: "drop-action", danger: true, label: t("action.drop"), note: t("action.drop_note"), run: () => setAsking(true) };
  const form = asking ? (
    <form
      className="answer-form"
      onSubmit={(e) => {
        e.preventDefault();
        const why = reason.trim();
        if (!why) return;
        void act(
          () => api.dropAction(action.id, why),
          (done) => ({
            message: done.acts.length > 0 ? t("toast.action_dropped_note", { names: told.join(", ") }) : t("toast.action_dropped"),
            undo: () => api.undo(done.changeset),
          }),
        ).then((done) => done && close());
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") close();
      }}
    >
      <label className="hint" htmlFor={id}>
        {t("action.drop_label")}
      </label>
      <input id={id} type="text" autoFocus value={reason} onChange={(e) => setReason(e.target.value)} />
      <Actions align="end">
        <Button variant="quiet" onClick={close}>
          {t("action.cancel")}
        </Button>
        <Button variant="primary" type="submit" disabled={!reason.trim()}>
          {t(told.length > 0 ? "action.drop_go_tell" : "action.drop_go")}
        </Button>
      </Actions>
    </form>
  ) : null;
  return { entry, form };
}
