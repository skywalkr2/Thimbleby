// Settings > Backups (design 5.0, 7.9): where backups go (the same chooser the setup step uses, a list to pick from, with a
// check and a folder picker, never a path to type blind), whether backups run on their own, the last one made, Back up now
// with its result said on the page, and how to restore from a copy. Restoring is a new workspace made from one dated copy; it
// never changes this one, so no backup is needed first. Going back to a chosen moment isn't available yet, and the page says so.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api, type S } from "../lib/api";
import { backupText } from "../lib/backup";
import { dayAndTime } from "../lib/dates";
import { problemText } from "../lib/problem";
import { useWords } from "../lib/wording";
import { Button } from "../ui/Button";
import { Skeleton } from "../ui/Skeleton";
import { WelcomeBackup } from "./WelcomeBackup";

import { EmptyState } from "../ui/EmptyState";
import { Actions } from "../ui/Actions";
export function BackupsPanel(props: { local: boolean }) {
  const { t, tn } = useWords();
  const client = useQueryClient();
  const found = useQuery({ queryKey: ["backups"], queryFn: api.backups });
  const [busy, setBusy] = useState(false);
  // What Back up now did, said on the page: the places it reached, or why it didn't.
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  const backUp = async () => {
    setBusy(true);
    setResult(null);
    try {
      await api.backup();
      const fresh = await client.fetchQuery({ queryKey: ["backups"], queryFn: api.backups, staleTime: 0 });
      void client.invalidateQueries({ queryKey: ["status"] });
      const bad = fresh.targets.filter((x) => x.last_error);
      const good = fresh.targets.filter((x) => !x.last_error);
      setResult(
        good.length > 0 && bad.length === 0
          ? { ok: true, text: t("backups.now.done", { places: good.map((x) => x.label || x.path).join(", ") }) }
          : { ok: false, text: t("backups.now.failed", { problem: bad[0]?.last_error ?? "" }) },
      );
    } catch (err) {
      setResult({ ok: false, text: t("backups.now.failed", { problem: problemText(err, t) }) });
    } finally {
      setBusy(false);
    }
  };

  if (!found.data) return found.isError ? <EmptyState text={t("settings.failed")} /> : <Skeleton rows={2} />;
  const view: S["BackupsView"] = found.data;
  const there = view.targets.length > 0;
  const newest = view.copies[0];
  const restoreFrom = newest?.path ?? t("backups.restore.folder_placeholder");
  return (
    <section className="panel-section" aria-labelledby="backups-where-title" data-backups="">
      <div className="heading">
        <h3 id="backups-where-title">{t("backups.where.title")}</h3>
      </div>
      <WelcomeBackup local={props.local} saveLabel={t("welcome.backup.save")} />
      {!there && <p className="hint">{t("settings.backups.automatic_needs_folder")}</p>}
      {view.targets.some((x) => !x.reachable) && (
        <p className="problem-note" role="note">
          {t("backups.unreachable", { places: view.targets.filter((x) => !x.reachable).map((x) => x.label || x.path).join(", ") })}
        </p>
      )}

      <h3 id="backups-last-title">{t("backups.last.title")}</h3>
      <p aria-labelledby="backups-last-title" data-last-backup="">
        {backupText(view.state, t)}
        {view.state.last_success ? ` · ${dayAndTime(view.state.last_success)}` : ""}
      </p>
      <Actions align="end">
        <Button loading={busy} disabled={!there} reason={t("backups.now.needs_folder")} onClick={() => void backUp()}>
          {t("backups.now")}
        </Button>
      </Actions>
      <div role="status">
        {result && <p className={result.ok ? "hint" : "problem-note"}>{result.text}</p>}
      </div>

      <h3 id="backups-copies-title">{t("backups.copies.title")}</h3>
      {view.copies.length === 0 ? (
        <p className="hint">{t("backups.copies.none")}</p>
      ) : (
        <ul className="plain-list" aria-labelledby="backups-copies-title">
          {view.copies.map((copy) => (
            <li key={copy.path}>
              <span>{copy.made_at ? dayAndTime(copy.made_at) : copy.name}</span>
              <span className="hint">
                {" · "}
                {copy.target}
                {copy.encrypted ? ` · ${t("backup.encrypted")}` : ""}
              </span>
            </li>
          ))}
        </ul>
      )}

      <h3 id="backups-restore-title">{t("backups.restore.title")}</h3>
      <div aria-labelledby="backups-restore-title" role="group" data-restore="">
        <p>{t("backups.restore.how")}</p>
        <p className="hint">{t("backups.restore.safe")}</p>
        <details className="more-options" data-restore-steps="">
          <summary>{t("backups.restore.developers")}</summary>
          <p>{t("backups.restore.steps")}</p>
          <p>
            <code className="path">{t("backups.restore.command", { backup: restoreFrom, folder: t("backups.restore.new_folder_placeholder") })}</code>
          </p>
        </details>
        {view.copies.some((c) => c.encrypted) && <p className="hint">{t("backups.restore.key")}</p>}
        <p className="hint">{tn("backups.restore.not_built", 1)}</p>
      </div>
    </section>
  );
}
