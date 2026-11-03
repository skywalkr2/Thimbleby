// Settings > Backups (design 5.0, 7.9): where backups go (the same chooser the setup step uses, a list to pick from, with a
// check and a folder picker, never a path to type blind), whether backups run on their own, the last one made, Back up now
// with its result said on the page, and Restore on each copy: a confirmation says what happens (the workspace goes back to how
// it was then, what changed since is set aside and not deleted, the app restarts when the person chooses), an encrypted copy
// asks for its key there, and a restore waiting for the restart shows with Cancel. Nothing is replaced until the restart, so no
// backup is needed first. Going back to a chosen moment isn't available yet, and the page says so.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useRestart } from "../lib/restart";
import { api, type S } from "../lib/api";
import { backupText } from "../lib/backup";
import { dayAndTime } from "../lib/dates";
import { problemText } from "../lib/problem";
import { useWords } from "../lib/wording";
import { Button } from "../ui/Button";
import { Skeleton } from "../ui/Skeleton";
import { restoreFocus } from "./ModalPanel";
import { RestoreDialog } from "./RestoreDialog";
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
  const restart = useRestart();
  const status = useQuery({ queryKey: ["status"], queryFn: api.status });
  // The copy the person asked to restore, while the confirmation is open, and how the try went.
  const [restoring, setRestoring] = useState<{ copy: S["BackupCopyView"]; opener: HTMLElement | null } | null>(null);
  const [restoreBusy, setRestoreBusy] = useState(false);
  const [restoreProblem, setRestoreProblem] = useState("");
  const [restoreNote, setRestoreNote] = useState("");
  const whenOf = (iso: string | null | undefined) => (iso ? dayAndTime(iso) : t("backups.restore.when_unknown"));

  const restore = async (key: string | null) => {
    if (!restoring) return;
    setRestoreBusy(true);
    setRestoreProblem("");
    try {
      await api.restoreCopy({ path: restoring.copy.path, key });
      const opener = restoring.opener;
      setRestoring(null);
      setRestoreNote(t("backups.restore.staged", { app: t("app.name") }));
      await client.invalidateQueries();
      restart.offer();
      restoreFocus(() => opener);
    } catch (err) {
      setRestoreProblem(problemText(err, t));
    } finally {
      setRestoreBusy(false);
    }
  };
  const cancelRestore = async () => {
    try {
      await api.cancelRestore();
      setRestoreNote(t("backups.restore.cancelled"));
    } catch (err) {
      setRestoreNote(problemText(err, t));
    }
    await client.invalidateQueries();
  };

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
              </span>{" "}
              <Button
                size="sm"
                disabled={!!view.restore_blocked}
                reason={view.restore_blocked ?? undefined}
                aria-label={t("backups.restore.copy_named", { when: whenOf(copy.made_at) })}
                onClick={(e) => {
                  setRestoreProblem("");
                  setRestoring({ copy, opener: e.currentTarget });
                }}
              >
                {t("backups.restore.copy")}
              </Button>
            </li>
          ))}
        </ul>
      )}

      <h3 id="backups-restore-title">{t("backups.restore.title")}</h3>
      <div aria-labelledby="backups-restore-title" role="group" data-restore="">
        <p>{t("backups.restore.how")}</p>
        <p className="hint">{t("backups.restore.safe", { app: t("app.name") })}</p>
        {view.copies.some((c) => c.encrypted) && <p className="hint">{t("backups.restore.key")}</p>}
        {view.pending && (
          <div data-restore-pending="">
            <p>{t(view.pending.kind === "put_back" ? "backups.restore.pending_put_back" : "backups.restore.pending", { when: whenOf(view.pending.made_at) })}</p>
            <Actions align="start">
              {status.data?.can_restart && (
                <Button size="sm" variant="primary" disabled={restart.busy || restart.waiting} onClick={() => void restart.now()}>
                  {t("restart.now")}
                </Button>
              )}
              <Button size="sm" onClick={() => void cancelRestore()}>
                {t("backups.restore.cancel")}
              </Button>
            </Actions>
          </div>
        )}
        <div role="status">{restoreNote && <p className="hint">{restoreNote}</p>}</div>
        <p className="hint">{tn("backups.restore.not_built", 1)}</p>
      </div>
      {restoring && (
        <RestoreDialog
          when={whenOf(restoring.copy.made_at)}
          needsKey={restoring.copy.encrypted}
          busy={restoreBusy}
          problem={restoreProblem}
          onGo={(key) => void restore(key)}
          onCancel={() => {
            const opener = restoring.opener;
            setRestoring(null);
            restoreFocus(() => opener);
          }}
        />
      )}
    </section>
  );
}
