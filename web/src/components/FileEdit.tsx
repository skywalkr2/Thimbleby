// What the person can do to a file from its row (design 5.3, 7.15): rename it, change its description, or remove it. Each acts
// at once as the person's own change, with Undo in a toast; the stored bytes are never touched, so Undo has them. Rename and
// the description open a small form under the row with the cursor in its field; one editor is open at a time. A removal the
// server refuses (the file changed, or something still uses it) says so in the toast, in words.
import { useId, useState, type ReactNode } from "react";
import { api, type S } from "../lib/api";
import { useAct } from "../lib/act";
import { useOneEditor } from "../lib/one-editor";
import { useWords } from "../lib/wording";
import type { MenuAction } from "./RowMenu";
import { Actions } from "../ui/Actions";
import { Button } from "../ui/Button";
import { FormField } from "../ui/FormField";

type Target = Pick<S["FileView"], "id" | "version" | "name" | "description">;

export function useFileEdits(file: Target): { entries: MenuAction[]; form: ReactNode } {
  const { t } = useWords();
  const act = useAct();
  const base = useId();
  const [renaming, setRenaming] = useOneEditor(`${file.id}:rename`);
  const [describing, setDescribing] = useOneEditor(`${file.id}:describe`);
  const [name, setName] = useState(file.name);
  const [description, setDescription] = useState(file.description ?? "");
  const hasDescription = file.description !== null && file.description !== undefined;

  const said = (done: S["FileChanged"], message: string) =>
    done.refused || !done.changeset
      ? { message: t(`files.refused.${done.refused ?? "changed"}`, { name: file.name }), tone: "warn" as const }
      : { message, undo: () => api.undo(done.changeset ?? "") };

  const save = async (body: { name?: string; description?: string }, message: string, close: () => void) => {
    const done = await act(() => api.editFile(file.id, { read_version: file.version, ...body }), (result) => said(result, message));
    if (done) close();
  };

  const entries: MenuAction[] = [
    {
      id: "file-rename",
      label: t("files.rename"),
      run: () => {
        setName(file.name);
        setRenaming(true);
      },
    },
    ...(hasDescription
      ? [
          {
            id: "file-describe",
            label: t("files.describe"),
            run: () => {
              setDescription(file.description ?? "");
              setDescribing(true);
            },
          },
        ]
      : []),
    {
      id: "file-remove",
      label: t("files.remove"),
      run: () => void act(() => api.removeFile(file.id, { read_version: file.version }), (done) => said(done, t("files.removed", { name: file.name }))),
    },
  ];

  const trimmed = name.trim();
  const form = renaming ? (
    <form
      className="answer-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (trimmed && trimmed !== file.name) void save({ name: trimmed }, t("files.rename.saved", { name: trimmed }), () => setRenaming(false));
      }}
      onKeyDown={(e) => e.key === "Escape" && setRenaming(false)}
    >
      <FormField id={`${base}-name`} label={t("files.rename.label")}>
        <input id={`${base}-name`} type="text" autoFocus value={name} onChange={(e) => setName(e.target.value)} />
      </FormField>
      <Actions align="end">
        <Button variant="quiet" onClick={() => setRenaming(false)}>
          {t("action.cancel")}
        </Button>
        <Button variant="primary" type="submit" disabled={!trimmed || trimmed === file.name}>
          {t("files.rename.save")}
        </Button>
      </Actions>
    </form>
  ) : describing ? (
    <form
      className="answer-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (description.trim() !== (file.description ?? "")) void save({ description }, t("files.describe.saved", { name: file.name }), () => setDescribing(false));
      }}
      onKeyDown={(e) => e.key === "Escape" && setDescribing(false)}
    >
      <FormField id={`${base}-description`} label={t("files.describe.label")}>
        <input id={`${base}-description`} type="text" autoFocus value={description} onChange={(e) => setDescription(e.target.value)} />
      </FormField>
      <Actions align="end">
        <Button variant="quiet" onClick={() => setDescribing(false)}>
          {t("action.cancel")}
        </Button>
        <Button variant="primary" type="submit" disabled={description.trim() === (file.description ?? "")}>
          {t("files.describe.save")}
        </Button>
      </Actions>
    </form>
  ) : null;
  return { entries, form };
}
