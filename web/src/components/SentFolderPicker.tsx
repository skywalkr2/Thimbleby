// The picker for the folder that holds the mail the person sent, opened right where "Choose the Sent folder" was pressed
// (design 7.8, the reviewer's G4): the likeliest folder first. A mailbox lists its own folders, so the choice is a list;
// an add-on's mail can't be asked for its folders, so the usual names for sent mail come first and the person may name
// another. Adding it reads the folder as a source of its own, credited to the person, and the screen carries on where it
// was. Nothing here keeps anything itself.
import { useQuery } from "@tanstack/react-query";
import { useId, useState } from "react";
import { api, ApiError } from "../lib/api";
import { problemText } from "../lib/problem";
import { useAfterSave, useFreshFingerprint } from "../lib/settings-save";
import { useWords } from "../lib/wording";
import { Button } from "../ui/Button";
import { Skeleton } from "../ui/Skeleton";
import { Select } from "../ui/Select";
import { FormBlock } from "../ui/FormBlock";
import { Actions } from "../ui/Actions";

/** The folders to choose from, the likeliest first: the one the server marks, then any whose name says "sent", then the
 * rest in the order given; folders already read are left out. */
export function likelyFirst(folders: string[], taken: string[], marked: string | null | undefined): string[] {
  const open = folders.filter((f) => !taken.includes(f));
  const rank = (f: string) => (f === marked ? 0 : /sent/i.test(f) ? 1 : 2);
  return open.map((f, i) => ({ f, i })).sort((a, b) => rank(a.f) - rank(b.f) || a.i - b.i).map((x) => x.f);
}

export function SentFolderPicker(props: { source: string; label: string; onClose: () => void }) {
  const { t } = useWords();
  const id = useId();
  const afterSave = useAfterSave();
  const fresh = useFreshFingerprint();
  const found = useQuery({ queryKey: ["watch-folders", props.source], queryFn: () => api.watchFolders(props.source), retry: false, staleTime: 300_000 });
  const [picked, setPicked] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
  const data = found.data;
  const options = data ? likelyFirst(data.folders, data.taken ?? [], data.sent) : [];
  const folder = picked ?? options[0] ?? "";
  const listed = data?.listed !== false;

  const add = async () => {
    setBusy(true);
    setProblem("");
    try {
      const saved = await api.addSentFolder(props.source, { folder, label: t("sources.sent.label", { label: props.label }), fingerprint: await fresh() });
      await afterSave(saved, { quiet: true });
      props.onClose();
    } catch (err) {
      setProblem(err instanceof ApiError && err.detail ? err.detail : problemText(err, t));
    } finally {
      setBusy(false);
    }
  };

  return (
    <FormBlock as="form"
      className="sent-picker"
      data-sent-picker=""
      aria-labelledby={`${id}-title`}
      onSubmit={(e) => {
        e.preventDefault();
        if (folder) void add();
      }}
    >
      <p className="what" id={`${id}-title`}>
        {t("walkthrough.sent.title")}
      </p>
      {found.isPending ? (
        <Skeleton rows={1} />
      ) : found.isError ? (
        <p className="problem-note" role="alert">
          {found.error instanceof ApiError && found.error.detail ? found.error.detail : problemText(found.error, t)}
        </p>
      ) : (
        <>
          <label htmlFor={`${id}-folder`}>{t("walkthrough.sent.label")}</label>
          {listed ? (
            <Select id={`${id}-folder`} value={folder} autoFocus onChange={(e) => setPicked(e.target.value)}>
              {options.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </Select>
          ) : (
            <>
              <input id={`${id}-folder`} type="text" list={`${id}-usual`} value={folder} autoFocus autoComplete="off" aria-describedby={`${id}-hint`} onChange={(e) => setPicked(e.target.value)} />
              <datalist id={`${id}-usual`}>
                {options.map((f) => (
                  <option key={f} value={f} />
                ))}
              </datalist>
              <p className="hint" id={`${id}-hint`}>
                {t("walkthrough.sent.usual")}
              </p>
            </>
          )}
        </>
      )}
      {problem && (
        <p className="problem-note" role="alert">
          {problem}
        </p>
      )}
      <Actions align="end">
        <Button onClick={props.onClose}>{t("walkthrough.sent.cancel")}</Button>
        <Button variant="primary" type="submit" loading={busy} disabled={!data || !folder.trim()}>
          {t("walkthrough.sent.add")}
        </Button>
      </Actions>
    </FormBlock>
  );
}
