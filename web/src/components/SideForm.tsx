// A side's details, in a small drawer (design 6.32): a side is a group, so it has a name, other names that help filing and a
// description, and nothing a project has (no stage, status, target day, owner or role). Saving acts at once with Undo.
import { useState } from "react";
import { api, type S } from "../lib/api";
import { useAct } from "../lib/act";
import { useFirstField } from "../lib/focus";
import { useWords } from "../lib/wording";
import { Button } from "../ui/Button";
import { Drawer } from "../ui/Drawer";
import { Field, list } from "./PersonForm";

export function SideDrawer(props: { side: S["ProjectView"]; onClose: () => void; onSaved?: (id: string, name: string) => void }) {
  const { t } = useWords();
  const act = useAct();
  const first = useFirstField<HTMLFormElement>();
  const s = props.side;
  const [name, setName] = useState(s.name);
  const [aliases, setAliases] = useState((s.aliases ?? []).join(", "));
  const [summary, setSummary] = useState(s.summary ?? "");
  const formId = `side-form-${s.id}`;
  const dirty = name !== s.name || aliases !== (s.aliases ?? []).join(", ") || summary !== (s.summary ?? "");
  const save = async () => {
    const body = { name: name.trim(), aliases: list(aliases), summary: summary.trim() || null };
    const before = { name: s.name, aliases: s.aliases ?? [], summary: s.summary ?? null };
    const done = await act(
      () => api.editProject(s.id, body),
      () => ({ message: t("toast.saved", { name: body.name }), undo: () => api.editProject(s.id, before) }),
    );
    if (!done) return;
    props.onSaved?.(s.id, body.name);
    props.onClose();
  };
  return (
    <Drawer
      open
      title={t("side.edit_title", { name: s.name })}
      dirty={dirty}
      onClose={props.onClose}
      footer={
        <>
          <Button onClick={props.onClose}>{t("action.cancel")}</Button>
          <Button variant="primary" type="submit" form={formId} disabled={!name.trim()} reason={t("setup.name_missing")}>
            {t("setup.save")}
          </Button>
        </>
      }
    >
      <form
        id={formId}
        ref={first}
        className="setup-form"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <Field id={`sn-${s.id}`} label={t("setup.project_name")} value={name} onChange={setName} required />
        <Field id={`sa-${s.id}`} label={t("setup.aliases")} value={aliases} onChange={setAliases} hint={t("side.aliases_hint")} />
        <div className="field">
          <label htmlFor={`sm-${s.id}`}>{t("side.description")}</label>
          <textarea id={`sm-${s.id}`} className="short" value={summary} onChange={(e) => setSummary(e.target.value)} />
        </div>
      </form>
    </Drawer>
  );
}
