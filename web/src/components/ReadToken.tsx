// Giving the key for an add-on's private download (design 7.8, "Add-ons"): typed here on a local app, where the app keeps it
// on this computer, or as where it is kept. It is saved for that release's own host, exactly as the developer settings'
// "Access keys for private downloads" keeps one, and goes only there.
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, ApiError } from "../lib/api";
import { problemText } from "../lib/problem";
import { asReference } from "../lib/secret-ref";
import { useAfterSave, useFreshFingerprint } from "../lib/settings-save";
import { useWords } from "../lib/wording";
import { SecretField } from "./SecretField";
import { Button } from "../ui/Button";
import { FormBlock } from "../ui/FormBlock";
import { Actions } from "../ui/Actions";
/** The row's way to give the read token for the place an add-on's files are kept: typed here on a local app, where the
 * app keeps it on this computer, or as where it is kept. It goes only to that host. Saved, Install can be pressed again. */
export function ReadToken(props: {
  pack: { id: string; name: string };
  base: string;
  host: string;
  onSaved: () => void;
  /** Shown open, in the words of a setup step: the box asks for "the access key you were given", with no place named. */
  plain?: boolean;
}) {
  const { t } = useWords();
  const afterSave = useAfterSave();
  const fingerprint = useFreshFingerprint();
  const setup = useQuery({ queryKey: ["setup"], queryFn: api.setup });
  const local = setup.data?.local ?? true;
  const [open, setOpen] = useState(!!props.plain);
  const [typed, setTyped] = useState("");
  const [reference, setReference] = useState("");
  const [how, setHow] = useState<"type" | "where" | "held">("type");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
  const { base, host } = props;
  const byReference = !local || how === "where";
  const ready = byReference ? reference.trim() !== "" : typed.trim() !== "";
  const save = async () => {
    setBusy(true);
    setProblem("");
    try {
      const fp = await fingerprint();
      const saved = await api.giveReadToken(props.pack.id, byReference ? { reference: asReference(reference), fingerprint: fp } : { token: typed.trim(), fingerprint: fp });
      await afterSave(saved, { message: t("addons.token.saved", { host }) });
      props.onSaved();
    } catch (err) {
      setProblem(err instanceof ApiError && err.detail ? err.detail : problemText(err, t));
      setBusy(false);
    }
  };
  if (!open) {
    return (
      <div>
        <Button size="sm" aria-label={t("addons.token.add_named", { name: props.pack.name })} onClick={() => setOpen(true)}>
          {t("addons.token.add")}
        </Button>
      </div>
    );
  }
  return (
    <form
      className="token-prompt"
      aria-labelledby={`${base}-token-title`}
      onSubmit={(e) => {
        e.preventDefault();
        if (ready && !busy) void save();
      }}
    >
      <p className="what" id={`${base}-token-title`}>
        {t(props.plain ? "addons.token.plain_title" : "addons.token.title", { host })}
      </p>
      {!props.plain && (
        <p className="hint" id={`${base}-token-hint`}>
          {t("addons.token.intro", { host })}
        </p>
      )}
      <FormBlock>
        <span className="setting-label" id={`${base}-token-label`}>
          {t(props.plain ? "addons.token.plain_label" : "addons.token.label")}
        </span>
        <SecretField
          id={`${base}-token`}
          labelId={`${base}-token-label`}
          label={t(props.plain ? "addons.token.plain_label" : "addons.token.label")}
          local={local}
          held={null}
          reference={reference}
          onReference={setReference}
          pasted={typed}
          onPaste={setTyped}
          disabled={busy}
          describedBy={props.plain ? undefined : `${base}-token-hint`}
          autoFocus
          onMode={setHow}
        />
      </FormBlock>
      {problem && (
        <p className="problem-note" role="alert">
          {problem}
        </p>
      )}
      <Actions align="end">
        {!props.plain && (
          <Button variant="quiet" disabled={busy} onClick={() => setOpen(false)}>
            {t("action.cancel")}
          </Button>
        )}
        <Button variant="primary" type="submit" disabled={!ready || busy}>
          {t(busy ? "addons.token.saving" : "addons.token.save")}
        </Button>
      </Actions>
    </form>
  );
}
