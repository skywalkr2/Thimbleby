// Saying which files are one document (design 6.2, "Versions of one document"). "Same document as…" picks another file
// of the same folder; "Not the same document" splits a file from the copies its name put it with. Each acts at once with
// Undo and records a correction. The same choices sit on a file's own page and on the "older version" row of Handled for
// you, where a wrong grouping is noticed. Also here: the answer to "Which copy is the current one?", a list of the copies.
import { useQuery } from "@tanstack/react-query";
import { useId, useState, type ReactNode } from "react";
import { api, type S } from "../lib/api";
import { useAct } from "../lib/act";
import { useWords } from "../lib/wording";
import type { MenuAction } from "./RowMenu";

export interface VersionActs {
  /** The choices as menu entries; none when the record isn't a file in a watched folder. */
  entries: MenuAction[];
  /** The form the first one opens, shown beside the file. */
  form: ReactNode;
}

/** The choices about one watched file, from the saved copy `record` of it. `closed` is the change a rule closed as an
 * older version, when the choice is made from its row: Not the same document hands it in after all. */
export function useVersionActs(record: string | null | undefined, closed?: { request: string; readVersion: number }): VersionActs {
  const { t } = useWords();
  const act = useAct();
  const [asking, setAsking] = useState(false);
  const found = useQuery({ queryKey: ["versions", record], queryFn: () => api.versions(record ?? ""), enabled: !!record, retry: false });
  const view = found.data;
  if (!view?.applicable) return { entries: [], form: null };

  const apart = () =>
    act(
      () => api.versionApart(record ?? "", closed),
      (made) => ({ message: t("versions.apart_toast", { title: view.file }), undo: () => api.versionUndo(made) }),
    );
  const same = async (other: S["VersionFile"]) => {
    const made = await act(
      () => api.versionSame(record ?? "", other.key),
      (done) => ({ message: t("versions.same_toast", { title: view.file, other: other.title }), undo: () => api.versionUndo(done) }),
    );
    if (made) setAsking(false);
  };
  const entries: MenuAction[] = [{ id: "same-document", label: t("versions.same"), run: () => setAsking(true) }];
  if (view.can_split) entries.push({ id: "not-same-document", label: t("versions.apart"), run: () => void apart() });
  return {
    entries,
    form: asking ? <SameForm others={view.others ?? []} onCancel={() => setAsking(false)} onSubmit={same} /> : null,
  };
}

/** The file it is the same document as, from the other files of its folder. */
function SameForm(props: { others: S["VersionFile"][]; onCancel: () => void; onSubmit: (other: S["VersionFile"]) => Promise<void> }) {
  const { t } = useWords();
  const id = useId();
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const chosen = props.others.find((o) => o.key === key);
  return (
    <form
      className="answer-form"
      data-act-form="same-document"
      onSubmit={(e) => {
        e.preventDefault();
        if (!chosen || busy) return;
        setBusy(true);
        void props.onSubmit(chosen).finally(() => setBusy(false));
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") props.onCancel();
      }}
    >
      <label className="hint" htmlFor={id}>
        {t("versions.same_label")}
      </label>
      <select id={id} autoFocus value={key} onChange={(e) => setKey(e.target.value)}>
        <option value="">{t("versions.same_choose")}</option>
        {props.others.map((o) => (
          <option key={o.key} value={o.key}>
            {o.key}
          </option>
        ))}
      </select>
      <div className="row-end">
        <button type="button" className="btn quiet" onClick={props.onCancel}>
          {t("versions.cancel")}
        </button>
        <button type="submit" className="btn primary" disabled={!chosen || busy}>
          {t("versions.same_go")}
        </button>
      </div>
    </form>
  );
}

/** The answer to "Which copy is the current one?": the copies the question lists, to pick from. */
export function CurrentCopy(props: { question: string; copies: S["Option"][] }) {
  const { t } = useWords();
  const act = useAct();
  const id = useId();
  const [file, setFile] = useState("");
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true);
    await act(
      () => api.versionAnswer(props.question, file),
      (made) => ({ message: t("versions.current_toast", { file }), undo: () => api.versionUndo(made) }),
    );
    setBusy(false);
  };
  return (
    <form
      className="answer-form"
      data-act-form="current-copy"
      onSubmit={(e) => {
        e.preventDefault();
        if (file && !busy) void go();
      }}
    >
      <label className="hint" htmlFor={id}>
        {t("versions.current_label")}
      </label>
      <select id={id} value={file} onChange={(e) => setFile(e.target.value)}>
        <option value="">{t("versions.current_choose")}</option>
        {props.copies.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <span className="hint">{t("versions.current_note")}</span>
      <div className="row-end">
        <button type="submit" className="btn primary" data-key="primary" disabled={!file || busy}>
          {t("versions.current_go")}
        </button>
      </div>
    </form>
  );
}
