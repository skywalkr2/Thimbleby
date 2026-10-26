// A name the person can change in place (design 7.8): a sentence that says the name and a Rename button that turns it into
// a name field, saved through the settings the Settings screen saves, with the same read-back and Undo. The assistant's
// name (the You step) and the app's own name (the last screen) both use it.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { api, ApiError } from "../lib/api";
import { problemText } from "../lib/problem";
import { knownFingerprint, useAfterSave } from "../lib/settings-save";
import { useWords } from "../lib/wording";
import { Button } from "../ui/Button";

export function RenameName(props: {
  /** The text setting that holds the name. */
  settingKey: string;
  /** The sentence that says the name now. */
  sentence: (name: string) => string;
  /** The name field's label. */
  label: string;
  rename: string;
  save: string;
  cancel: string;
  /** Said beside a disabled Save when the field is empty. */
  blank: string;
}) {
  const { t } = useWords();
  const client = useQueryClient();
  const afterSave = useAfterSave();
  const settings = useQuery({ queryKey: ["settings"], queryFn: api.settings });
  const [draft, setDraft] = useState<string | null>(null);
  const [problem, setProblem] = useState("");
  const [busy, setBusy] = useState(false);
  const field = useRef<HTMLInputElement>(null);
  const item = settings.data?.items.find((i) => i.key === props.settingKey);
  const editing = draft !== null;

  // The cursor goes to the field when it opens.
  useEffect(() => {
    if (editing) field.current?.focus();
  }, [editing]);

  if (!settings.data || !item) return null;
  const name = String(item.value ?? "");
  const locked = item.locked || !item.editable;
  const text = (draft ?? "").trim();
  const empty = text === "";

  const save = async () => {
    if (empty) return;
    if (text === name) return setDraft(null);
    setBusy(true);
    setProblem("");
    try {
      const fingerprint = knownFingerprint(client, settings.data!.fingerprint) ?? settings.data!.fingerprint;
      const saved = await api.saveSettings({ changes: { [props.settingKey]: text }, reset: [], fingerprint, by_setup: true });
      setDraft(null);
      await afterSave(saved);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) void client.invalidateQueries({ queryKey: ["settings"] });
      setProblem(err instanceof ApiError && err.detail ? err.detail : problemText(err, t));
    } finally {
      setBusy(false);
    }
  };

  if (!editing) {
    return (
      <div className="rename-line">
        <span>{props.sentence(name)}</span>{" "}
        {!locked && (
          <Button size="sm" onClick={() => setDraft(name)}>
            {props.rename}
          </Button>
        )}
      </div>
    );
  }
  const id = `rename-${props.settingKey.replace(/[^a-z0-9]+/gi, "-")}`;
  return (
    <div
      className="field"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          setDraft(null);
        }
      }}
    >
      <label htmlFor={id}>{props.label}</label>
      <input
        id={id}
        ref={field}
        type="text"
        value={draft ?? ""}
        autoComplete="off"
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            void save();
          }
        }}
      />
      <div className="row-end">
        <Button onClick={() => setDraft(null)}>{props.cancel}</Button>
        <Button variant="primary" loading={busy} disabled={empty} reason={empty ? props.blank : undefined} onClick={() => void save()}>
          {props.save}
        </Button>
      </div>
      {problem && (
        <p className="problem-note" role="alert">
          {problem}
        </p>
      )}
    </div>
  );
}
