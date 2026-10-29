// What a batch to look over opens (design 7.7, 6.32): the things in it that need a look, each on one line with "Not right"
// (the correction that sends it back with a note, which the assistant learns from), what waits for the person's yes answered
// where it is, and "All looks good" at the end, which marks the batch reviewed with an Undo. Opening it marks nothing as seen,
// goes nowhere and splits nothing: the batch stays one line on Today until it is confirmed. Batches left unopened that were
// folded into one line are drawn one after another, oldest first, each with its own "All looks good".
import { useState } from "react";
import { useAct } from "../lib/act";
import { api } from "../lib/api";
import { useReviewTime } from "../lib/review-time";
import { plainTitle } from "../lib/title-dates";
import type { QueueLine } from "../lib/today";
import { titleWords } from "../lib/queue-words";
import { useWords } from "../lib/wording";
import { Button } from "../ui/Button";
import { HeldDetail } from "./HeldDetail";
import { ProjectTag } from "./ProjectTag";
import { useLineTitle } from "./TodayQueue";
import { useEstimate } from "../lib/money";
import { SendBackForm } from "./WhatChanged";
import styles from "./BatchDetail.module.css";

export function BatchDetail(props: { line: QueueLine; sendBack?: boolean }) {
  const { line } = props;
  // The time the pane is open and in view is the time spent looking over the assistant's work (design 6.32, "Measures").
  useReviewTime("today");
  const folded = line.kind === "batches";
  const parts = folded ? (line.parts ?? []) : [line];
  // Send back with a note, from the line's menu, is for the whole of one change: its note opens above the batch.
  const [sending, setSending] = useState(!!props.sendBack);
  return (
    <div className={styles.batches} data-batch-detail="">
      {sending && line.changeset && <SendBackForm cs={line.changeset} onDone={() => setSending(false)} />}
      {parts.map((part) => (
        <Batch key={part.key} part={part} named={folded} />
      ))}
    </div>
  );
}

function Batch(props: { part: QueueLine; named: boolean }) {
  const { part } = props;
  const { t, tn, has } = useWords();
  const act = useAct();
  const title = useLineTitle();
  const estimate = useEstimate();
  // The row whose "Not right" is open: one at a time, with the cursor in its note.
  const [open, setOpen] = useState<string | null>(null);
  // Items sent back leave the list at once, before the next read of Today says so.
  const [sentBack, setSentBack] = useState<ReadonlySet<string>>(new Set());
  const heading = props.named ? title(part) : null;
  const refused = (part.outcome ?? {}).refused ?? 0;
  const items = (part.items ?? []).filter((item) => !sentBack.has(item.key));
  const changesets = part.changesets ?? [];
  const confirm = () =>
    void act(
      () => api.confirmBatch(changesets),
      (done) => ({ message: t("toast.looks_good"), many: (n) => tn("toast.looks_good_many", n), undo: () => api.unconfirmBatch(done) }),
    );
  const hasHeld = items.some((item) => item.kind === "held");
  return (
    <section className={styles.batch} aria-label={heading ?? undefined} data-batch={part.key}>
      {heading && <h4 className={styles.heading}>{heading}</h4>}
      {items.length > 0 ? (
        <ul className={styles.items}>
          {items.map((item) =>
            item.kind === "held" ? (
              <li key={item.key} className={styles.held}>
                <HeldDetail line={item} />
              </li>
            ) : (
              <li key={item.key} className={styles.item} data-batch-item={item.what ?? ""}>
                <span className={styles.what}>{whatWord(item.what, t)}</span>
                <span className={styles.text}>{plainTitle(item.text ?? "")}</span>
                <Button variant="quiet" size="sm" className={styles.notRight} aria-expanded={open === item.key} aria-label={t("queue.batch.not_right_named", { item: plainTitle(item.text ?? "") })} onClick={() => setOpen(open === item.key ? null : item.key)}>
                  {t("queue.batch.not_right")}
                </Button>
                <span className={styles.meta}>
                  {titleWords(item.title, t, has)}
                  {(item.project_name || item.side_name) && <ProjectTag name={item.project_name} parent={item.parent_name} side={item.side_name} className={styles.tag} />}
                  {item.person_name && <span>{t("queue.batch.owner", { name: item.person_name })}</span>}
                </span>
                {item.draft && (
                  <figure className={styles.draft}>
                    <figcaption>{t("queue.batch.draft")}</figcaption>
                    <p>{item.draft}</p>
                  </figure>
                )}
                {open === item.key && item.changeset && (
                  <div className={styles.form}>
                    <SendBackForm
                      cs={item.changeset}
                      op={item.op ?? undefined}
                      item={plainTitle(item.text ?? "")}
                      estimate={estimate(item.estimate_usd ?? part.estimate_usd)}
                      onDone={(sent) => {
                        setOpen(null);
                        if (sent) setSentBack((was) => new Set(was).add(item.key));
                      }}
                    />
                  </div>
                )}
              </li>
            ),
          )}
        </ul>
      ) : (
        <p className="hint">{t("queue.batch.none_left")}</p>
      )}
      {refused > 0 && <p className="hint">{tn("queue.batch.refused", refused)}</p>}
      {changesets.length > 0 ? (
        <div className={styles.end}>
          <Button variant="primary" onClick={confirm}>
            {t("queue.act.all_good")}
          </Button>
        </div>
      ) : (
        hasHeld && <p className="hint">{t("queue.batch.waiting_only")}</p>
      )}
    </section>
  );
}

function whatWord(what: QueueLine["what"], t: (key: string) => string): string {
  switch (what) {
    case "question":
      return t("queue.batch.item.question");
    case "draft":
      return t("queue.batch.item.draft");
    default:
      return t("queue.batch.item.action");
  }
}
