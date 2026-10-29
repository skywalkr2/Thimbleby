// Editing a to-do from its row (design 7.5): "Edit…" is the one place to change it. It opens its words (as the list shows
// them), its due date, how long it takes, who does it, the project it is filed under and how it repeats (the cursor in the
// words) and saves only what changed, as the person's own edit with Undo. A new date drops the words the old one was read
// from, as correcting a promise's date does. The repeat is typed in words and said back under the field before it is kept
// (design 6.32); words that aren't clear keep nothing. One editor is open at a time (`useOneEditor`).
import { useOneEditor } from "../lib/one-editor";
import { useQuery } from "@tanstack/react-query";
import { useId, useState, type ReactNode } from "react";
import { api, type S } from "../lib/api";
import { useAct } from "../lib/act";
import { day } from "../lib/dates";
import { ownersAfter } from "../lib/open-items";
import { saidRepeat, useRepeatCheck } from "../lib/repeat";
import { plainTitle } from "../lib/title-dates";
import { useWords } from "../lib/wording";
import { EffortField } from "./EffortField";
import { PersonPicker } from "./PersonPicker";
import { ProjectPicker } from "./ProjectPicker";
import { useSides } from "../lib/sides";
import type { MenuAction } from "./RowMenu";
import { Button } from "../ui/Button";
import { DateField } from "../ui/DateField";
import { Actions } from "../ui/Actions";
import { FormField } from "../ui/FormField";
import { Select } from "../ui/Select";
type Target = Pick<S["OpenActionView"], "id" | "version" | "text" | "due" | "repeat" | "effort_minutes" | "owners" | "project">;

export function useEditAction(action: Target, onClosed?: () => void): { entry: MenuAction; form: ReactNode } {
  const { t } = useWords();
  const act = useAct();
  const id = useId();
  const [open, setOpen] = useOneEditor(`${action.id}:edit`);
  const people = useQuery({ queryKey: ["people"], queryFn: api.people, enabled: open });
  const { justMe } = useSides();
  // The words are as the list shows them; they are sent only when the person changed them.
  const shownText = plainTitle(action.text, action.due);
  const [text, setText] = useState(shownText);
  const [owner, setOwner] = useState(action.owners.length === 1 ? action.owners[0].person : "");
  const [from, setFrom] = useState(action.owners.length === 1 ? action.owners[0].person : "");
  const [project, setProject] = useState(action.project ?? "");
  const [due, setDue] = useState(action.due ?? "");
  const [repeat, setRepeat] = useState(action.repeat?.phrase ?? "");
  const [effort, setEffort] = useState<number | null>(action.effort_minutes ?? null);
  const close = () => {
    setOpen(false);
    onClosed?.();
  };
  const start = () => {
    setText(shownText);
    setOwner(action.owners.length === 1 ? action.owners[0].person : "");
    setFrom(action.owners.length === 1 ? action.owners[0].person : "");
    setProject(action.project ?? "");
    setDue(action.due ?? "");
    setRepeat(action.repeat?.phrase ?? "");
    setEffort(action.effort_minutes ?? null);
    setOpen(true);
  };
  const words = text.trim();
  const fields: Record<string, unknown> = {};
  if (words && words !== shownText) fields.text = words;
  // Who does it: with one owner the new person takes over; with several, the part that changes is picked first.
  let handOver: Array<{ person: string; team?: string }> | null = null;
  if (owner) {
    if (action.owners.length === 0) handOver = [{ person: owner }];
    else if (from && owner !== from) handOver = ownersAfter(action.owners, from, owner);
  }
  if (handOver) fields.owners = handOver;
  if (project !== (action.project ?? "")) fields.project = project || null;
  if (due !== (action.due ?? "")) Object.assign(fields, { due: due || null, due_words: null, due_check: false });
  if (effort !== (action.effort_minutes ?? null)) fields.effort_minutes = effort;
  const typed = repeat.trim();
  const repeatChanged = typed !== (action.repeat?.phrase ?? "");
  const read = useRepeatCheck(repeatChanged ? typed : "", due || null);
  // A new repeat is kept only when its words are read; clearing the field stops it.
  const repeatOk = !repeatChanged || typed === "" || read?.status === "ok";
  const changed = Object.keys(fields).length > 0 || repeatChanged;
  const save = async () => {
    if (!words || !changed || !repeatOk) return;
    const done = await act(
      async () => {
        const made: string[] = [];
        if (Object.keys(fields).length > 0) {
          made.push((await api.editRecord({ kind: "action", id: action.id, fields, read_version: action.version })).changeset);
        }
        if (repeatChanged) {
          const result = typed ? await api.setRepeat(action.id, { phrase: typed, ...(due ? { start: due } : {}) }) : await api.stopRepeat(action.id);
          made.push(result.changeset);
        }
        return made;
      },
      (made) => ({
        message: Object.keys(fields).length === 0 ? t(typed ? "repeat.saved" : "repeat.stopped") : t("open.edit.saved"),
        undo: async () => {
          for (const changeset of [...made].reverse()) await api.undo(changeset);
        },
      }),
    );
    if (done) close();
  };
  const sayBack = !repeatChanged
    ? action.repeat && saidRepeat(t, action.repeat.shape, action.repeat.start)
    : read?.status === "ok" && read.shape && read.start
      ? saidRepeat(t, read.shape, read.start)
      : null;
  const entry: MenuAction = { id: "edit-action", label: t("open.edit"), run: start };
  const form = open ? (
    <form
      className="answer-form"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
      onKeyDown={(e) => e.key === "Escape" && close()}
    >
      <label className="hint" htmlFor={`${id}-text`}>
        {t("open.edit.text")}
      </label>
      <input id={`${id}-text`} type="text" autoFocus value={text} onChange={(e) => setText(e.target.value)} />
      <label className="hint" htmlFor={`${id}-due`}>
        {t("open.edit.due")}
      </label>
      <DateField id={`${id}-due`} value={due} onChange={(e) => setDue(e.target.value)} />
      <EffortField id={id} value={effort} onChange={setEffort} />
      {action.owners.length > 1 && (
        <FormField id={`${id}-from`} label={t("open.reassign.from")}>
          <Select id={`${id}-from`} value={from} onChange={(e) => setFrom(e.target.value)}>
            <option value="">{t("person.choose")}</option>
            {action.owners.map((o) => (
              <option key={o.person} value={o.person}>
                {o.name}
              </option>
            ))}
          </Select>
        </FormField>
      )}
      <PersonPicker
        label={t(action.owners.length > 1 ? "open.reassign.to" : justMe ? "open.edit.owner_just_me" : "open.edit.owner")}
        value={owner}
        suggested={[]}
        people={(people.data ?? []).filter((p) => p.status !== "left" || p.id === owner)}
        onChange={setOwner}
      />
      {handOver && !people.data?.find((p) => p.id === owner)?.is_pm && <p className="hint">{t("open.edit.tell_hint", { name: people.data?.find((p) => p.id === owner)?.name ?? "" })}</p>}
      {!justMe && <ProjectPicker label={t("open.edit.project")} value={project} empty={t("addtodo.no_project")} onChange={setProject} />}
      <label className="hint" htmlFor={`${id}-repeat`}>
        {t("repeat.label")}
      </label>
      <input
        id={`${id}-repeat`}
        type="text"
        value={repeat}
        placeholder={t("repeat.placeholder")}
        aria-describedby={`${id}-said`}
        onChange={(e) => setRepeat(e.target.value)}
      />
      <p className="hint" id={`${id}-said`} aria-live="polite">
        {sayBack}
        {repeatChanged && read?.status === "unclear" && t("repeat.unclear")}
        {repeatChanged && read?.status === "off_start" && read.start && (
          <>
            {t("repeat.off_start", { date: day(due), first: day(read.start) })}{" "}
            <Button variant="quiet" onClick={() => setDue(read.start ?? "")}>
              {t("repeat.use_first", { first: day(read.start) })}
            </Button>
          </>
        )}
      </p>
      <Actions align="end">
        <Button variant="quiet" onClick={close}>
          {t("action.cancel")}
        </Button>
        <Button variant="primary" type="submit" disabled={!words || !changed || !repeatOk}>
          {t("open.edit.save")}
        </Button>
      </Actions>
    </form>
  ) : null;
  return { entry, form };
}
