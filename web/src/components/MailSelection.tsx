// What the person can do to the saved messages they ticked in a list (design 6.12): archive, move to a folder, label, mark as
// read. Each choice drafts one act per message in one change and shows them in a panel for the person's one yes, which approves
// and sends each; nothing is done before it, and "Take them back" undoes the drafts. A message that can't be acted on is named with
// the reason, never silently left out. Move to asks for one account: a folder belongs to one account.
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api, type S } from "../lib/api";
import { messageLine } from "../lib/acts";
import { useActBatch, type BatchAction, type Drafted } from "../lib/act-batch";
import { useWords } from "../lib/wording";
import { Skeleton } from "../ui/Skeleton";
import { LabelForm, MoveForm } from "./MessageActs";
import styles from "./MailSelection.module.css";

type Asking = "move" | "label";
const ACTIONS: { id: BatchAction; label: string }[] = [
  { id: "archive", label: "acts.archive" },
  { id: "mark_read", label: "acts.mark_read" },
  { id: "move", label: "acts.move" },
  { id: "label", label: "acts.label" },
];

export function MailSelectionBar(props: { records: string[]; onClear: () => void }) {
  const { t, tn } = useWords();
  const batch = useActBatch();
  const [asking, setAsking] = useState<Asking | null>(null);
  const [plan, setPlan] = useState<{ drafted: Drafted; what: BatchAction; folder?: string; label?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const n = props.records.length;

  const draft = async (what: BatchAction, more: { folder?: string; label?: string } = {}) => {
    setBusy(true);
    const drafted = await batch.draft({ action: what, about: props.records, ...more });
    setBusy(false);
    if (!drafted) return;
    setAsking(null);
    setPlan({ drafted, what, ...more });
  };
  const choose = (what: BatchAction) => {
    if (what === "move" || what === "label") setAsking(what);
    else void draft(what);
  };
  const cancel = async () => {
    if (plan) await batch.cancel(plan.drafted);
    setPlan(null);
  };
  const approve = async () => {
    if (!plan) return;
    setBusy(true);
    const done = await batch.approve(plan.drafted);
    setBusy(false);
    if (done) {
      setPlan(null);
      props.onClear();
    }
  };

  return (
    <section className={styles.bar} aria-label={t("batch.bar")} data-selection="">
      <p role="status" className={styles.count}>
        {tn("batch.selected", n)}
      </p>
      <div className={styles.buttons}>
        {ACTIONS.map((a) => (
          <button key={a.id} type="button" className="btn" disabled={busy || !!plan} aria-pressed={asking === a.id ? true : undefined} onClick={() => choose(a.id)}>
            {t(a.label)}
          </button>
        ))}
        <button type="button" className="btn quiet" disabled={busy} onClick={props.onClear}>
          {t("batch.clear")}
        </button>
      </div>
      {asking === "move" && <MoveBatch records={props.records} onCancel={() => setAsking(null)} onSubmit={(folder) => draft("move", { folder })} />}
      {asking === "label" && <LabelBatch records={props.records} onCancel={() => setAsking(null)} onSubmit={(label) => draft("label", { label })} />}
      {plan && <BatchConfirm plan={plan} busy={busy} onApprove={() => void approve()} onCancel={() => void cancel()} />}
    </section>
  );
}

/** The folder to move the selection to: from the one account's own list when it has one, else named by the person. */
function MoveBatch(props: { records: string[]; onCancel: () => void; onSubmit: (folder: string) => Promise<void> }) {
  const { t } = useWords();
  const found = useQuery({ queryKey: ["act-batch-options", props.records], queryFn: () => api.actBatchOptions(props.records), staleTime: 30_000 });
  if (!found.data) return null;
  if (found.data.several_accounts || !found.data.account) {
    return (
      <div role="note" className="hint">
        <p>{t(found.data.several_accounts ? "batch.move.several" : "batch.move.no_account")}</p>
        <button type="button" className="btn quiet" onClick={props.onCancel}>
          {t("acts.cancel")}
        </button>
      </div>
    );
  }
  return <MoveForm source={found.data.folder_source ?? null} listAccount={found.data.folders_account ?? null} account={found.data.account_label ?? null} onCancel={props.onCancel} onSubmit={props.onSubmit} />;
}

/** The label to put on the selection: from the one account's own labels when its channel lists them, else typed. Messages from
 * several accounts, or from none, take it typed; the drafts say which can't be labeled. */
function LabelBatch(props: { records: string[]; onCancel: () => void; onSubmit: (label: string) => Promise<void> }) {
  const found = useQuery({ queryKey: ["act-batch-options", props.records], queryFn: () => api.actBatchOptions(props.records), staleTime: 30_000 });
  if (found.isPending) return <Skeleton rows={1} />;
  const listed = !found.data?.several_accounts && found.data?.account ? (found.data.folders_account ?? null) : null;
  return <LabelForm listAccount={listed} account={found.data?.account_label ?? null} onCancel={props.onCancel} onSubmit={props.onSubmit} />;
}

function skippedWords(s: S["ActBatchSkipped"], t: (k: string, v?: Record<string, string | number>) => string): string {
  return t(`batch.skipped.${s.why}`, { title: s.title || t("batch.skipped.untitled"), account: s.account_label ?? "" });
}

/** Each drafted act as the message it is about and what it will do, with the one yes. */
function BatchConfirm(props: { plan: { drafted: Drafted; what: BatchAction; folder?: string; label?: string }; busy: boolean; onApprove: () => void; onCancel: () => void }) {
  const { t, tn } = useWords();
  const { drafted, what, folder, label } = props.plan;
  const n = drafted.acts.length;
  return (
    <div className={styles.confirm} role="group" aria-label={t("batch.confirm.title")} data-batch-confirm="">
      <h3>{n > 0 ? tn(`batch.title.${what}`, n, { folder: drafted.acts[0]?.folder_name ?? folder ?? "", label: drafted.acts[0]?.label_name ?? label ?? "" }) : t("batch.none_drafted")}</h3>
      {n > 0 && <p className="hint">{t("batch.confirm.intro")}</p>}
      <ul className={styles.list}>
        {drafted.acts.map((a) => (
          <li key={a.id} data-act={a.id}>
            {(a.about ?? []).map((m) => messageLine(m, t)).join(" · ")}
          </li>
        ))}
      </ul>
      {(drafted.skipped ?? []).length > 0 && (
        <div role="note" data-skipped="">
          <p className="hint">{t("batch.skipped.title")}</p>
          <ul className={styles.list}>
            {(drafted.skipped ?? []).map((s) => (
              <li key={s.record}>{skippedWords(s, t)}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="row-end">
        <button type="button" className="btn quiet" disabled={props.busy} onClick={props.onCancel}>
          {n > 0 ? t("batch.confirm.cancel") : t("acts.cancel")}
        </button>
        {n > 0 && (
          <button type="button" className="btn primary" disabled={props.busy} onClick={props.onApprove}>
            {tn("batch.confirm.go", n)}
          </button>
        )}
      </div>
    </div>
  );
}
