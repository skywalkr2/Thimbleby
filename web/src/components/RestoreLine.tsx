// Today's lines for restoring a backup copy over the workspace (design 5.0, 7.7): one while a restore waits for the restart
// that swaps it in (Restart now, and Cancel in its menu), one for the first look after it was swapped in (what was kept aside,
// Dismiss, and Put back what was there before), and one when the swap didn't happen and why. Nothing here restarts the app
// but the person's own click.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api, type S } from "../lib/api";
import { useAct } from "../lib/act";
import { dayAndTime } from "../lib/dates";
import { problemText } from "../lib/problem";
import { useRestart, useRestartText } from "../lib/restart";
import { useWords } from "../lib/wording";
import { Button } from "../ui/Button";
import { IconButton } from "../ui/IconButton";
import { MenuButton } from "../ui/MenuButton";
import { Pill } from "../ui/Pill";
import { Row } from "../ui/Row";
import { restoreFocus } from "./ModalPanel";
import { RestoreDialog } from "./RestoreDialog";

type Line = S["QueueLineView"];

export const isRestoreLine = (line: Line): boolean => line.kind === "restore";

export function RestoreLine(props: { line: Line }) {
  const { t } = useWords();
  const { line } = props;
  const when = line.at ? dayAndTime(line.at) : t("backups.restore.when_unknown");
  if (line.state === "pending") return <PendingLine line={line} when={when} />;
  if (line.state === "restored") return <RestoredLine line={line} when={when} />;
  return <NotRestoredLine line={line} />;
}

function PendingLine(props: { line: Line; when: string }) {
  const { t } = useWords();
  const act = useAct();
  const status = useQuery({ queryKey: ["status"], queryFn: api.status });
  const restart = useRestart();
  const progress = useRestartText();
  const canRestart = !!status.data?.can_restart;
  const app = t("app.name");
  const sub = progress && restart.phase !== "asking" ? progress : t(status.data && !canRestart ? "queue.restore.pending.manual" : "queue.restore.pending.sub", { app });
  return (
    <Row
      as="section"
      aria-label={t("queue.restore.label")}
      data-queue-line="restore"
      pill={<Pill tone="warn">{t("queue.restore.label")}</Pill>}
      title={t("queue.restore.pending", { when: props.when })}
      meta={sub}
      primary={
        <>
          {canRestart && (
            <Button size="sm" variant="primary" data-key="primary" disabled={restart.busy || restart.waiting} onClick={() => void restart.now()}>
              {t("restart.now")}
            </Button>
          )}
          <MenuButton
            groups={[{ id: "restore", entries: [{ id: "cancel", label: t("queue.restore.cancel"), run: () => void act(() => api.cancelRestore(), () => ({ message: t("backups.restore.cancelled") })) }] }]}
            trigger={<IconButton icon="more" size="sm" label={t("menu.more", { what: t("queue.restore.label") })} tooltip={false} />}
          />
        </>
      }
    />
  );
}

function RestoredLine(props: { line: Line; when: string }) {
  const { t } = useWords();
  const act = useAct();
  const client = useQueryClient();
  const restart = useRestart();
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
  const [opener, setOpener] = useState<HTMLElement | null>(null);
  const putBack = async () => {
    setBusy(true);
    setProblem("");
    try {
      await api.putBackRestore();
      setAsking(false);
      await client.invalidateQueries();
      restart.offer();
      restoreFocus(() => opener);
    } catch (err) {
      setProblem(problemText(err, t));
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <Row
        as="section"
        aria-label={t("queue.restore.label")}
        data-queue-line="restore"
        pill={<Pill tone="neutral">{t("queue.restore.label")}</Pill>}
        title={t("queue.restore.restored", { when: props.when })}
        meta={t("queue.restore.restored.sub", { folder: props.line.text ?? "" })}
        primary={
          <>
            <Button size="sm" variant="primary" data-key="primary" onClick={() => void act(() => api.dismissRestore())}>
              {t("queue.restore.dismiss")}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={(e) => {
                setOpener(e.currentTarget);
                setProblem("");
                setAsking(true);
              }}
            >
              {t("queue.restore.put_back")}
            </Button>
          </>
        }
      />
      {asking && <RestoreDialog when={props.when} needsKey={false} putBack busy={busy} problem={problem} onGo={() => void putBack()} onCancel={() => { setAsking(false); restoreFocus(() => opener); }} />}
    </>
  );
}

function NotRestoredLine(props: { line: Line }) {
  const { t } = useWords();
  const act = useAct();
  return (
    <Row
      as="section"
      aria-label={t("queue.restore.label")}
      data-queue-line="restore"
      pill={<Pill tone="danger">{t("queue.restore.label")}</Pill>}
      title={t("queue.restore.not_restored")}
      meta={t("queue.restore.not_restored.sub", { reason: props.line.text ?? "" })}
      primary={
        <Button size="sm" variant="primary" data-key="primary" onClick={() => void act(() => api.dismissRestore())}>
          {t("queue.restore.dismiss")}
        </Button>
      }
    />
  );
}
