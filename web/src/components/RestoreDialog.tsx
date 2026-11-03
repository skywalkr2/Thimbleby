// Restoring a copy asks first (UI rules: replacing the workspace confirms). The dialog says plainly what happens: the workspace
// goes back to how it was on the copy's date, what changed since is set aside and not deleted, and the app restarts when the
// person chooses. A copy that is encrypted asks for its key here, with the cursor in that field; a refusal (a wrong key, a damaged
// copy) is said in the dialog and nothing was changed. The same dialog puts back what an earlier restore set aside.
import { useId, useState } from "react";
import { Heading } from "react-aria-components";
import { useWords } from "../lib/wording";
import { Button } from "../ui/Button";
import { FormField } from "../ui/FormField";
import { DialogFooter, ModalPanel } from "./ModalPanel";

export function RestoreDialog(props: {
  /** The copy's date and time, in words ("Wed, Oct 28, 7:37 AM"). */
  when: string;
  /** The copy is encrypted: its key is asked for here. */
  needsKey: boolean;
  /** Putting back what an earlier restore set aside, not restoring a copy. */
  putBack?: boolean;
  busy: boolean;
  /** Why the last try was refused, in plain words. */
  problem: string;
  onGo: (key: string | null) => void;
  onCancel: () => void;
}) {
  const { t } = useWords();
  const titleId = useId();
  const [key, setKey] = useState("");
  const app = t("app.name");
  const suffix = props.putBack ? "_put_back" : "";
  const ready = !props.needsKey || key.trim() !== "";
  const go = () => {
    if (ready && !props.busy) props.onGo(props.needsKey ? key : null);
  };
  return (
    <ModalPanel titleId={titleId} onClose={props.onCancel}>
      <Heading slot="title" id={titleId} level={2}>
        {t(`backups.restore.dialog.title${suffix}`, { when: props.when })}
      </Heading>
      <form
        data-restore-dialog=""
        onSubmit={(e) => {
          e.preventDefault();
          go();
        }}
      >
        <p>{t(`backups.restore.dialog.back${suffix}`, { when: props.when })}</p>
        <p>{t(`backups.restore.dialog.aside${suffix}`)}</p>
        <p>{t("backups.restore.dialog.restart", { app })}</p>
        {props.needsKey && (
          <FormField label={t("backups.restore.dialog.key")} hint={t("backups.restore.dialog.key_hint")}>
            {(id) => (
              <input
                id={id}
                type="password"
                value={key}
                autoComplete="off"
                aria-describedby={`${id}-hint`}
                aria-invalid={props.problem ? true : undefined}
                onChange={(e) => setKey(e.target.value)}
              />
            )}
          </FormField>
        )}
        <div role="status">
          {props.problem && (
            <p className="problem-note" role="alert">
              {t("backups.restore.dialog.failed", { problem: props.problem })}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button type="button" onClick={props.onCancel}>
            {t("action.cancel")}
          </Button>
          <Button type="submit" variant="danger" loading={props.busy} disabled={!ready}>
            {t(`backups.restore.dialog.go${suffix}`)}
          </Button>
        </DialogFooter>
      </form>
    </ModalPanel>
  );
}
