// What a project ending that waits for the person opens (design 6.7, 7.7): the open items it would drop, each with a box to
// keep it, and what add-ons leave open whichever way it goes. One button ends the project and drops the items that are not
// ticked, with one Undo; the other keeps the project and every item as they are.
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../lib/api";
import { useAct } from "../lib/act";
import type { QueueLine } from "../lib/today";
import { useWords } from "../lib/wording";
import { Button } from "../ui/Button";
import { Pill } from "../ui/Pill";
import { Skeleton } from "../ui/Skeleton";
import styles from "./ProjectEndingDetail.module.css";
import { plainTitle } from "../lib/title-dates";

export function ProjectEndingDetail(props: { line: QueueLine }) {
  const { t, tn } = useWords();
  const act = useAct();
  const cs = props.line.changeset ?? "";
  const index = props.line.op ?? 0;
  const ending = useQuery({ queryKey: ["project-ending", cs, index], queryFn: () => api.projectEnding(cs, index) });
  const [kept, setKept] = useState<ReadonlySet<number>>(new Set());
  if (ending.isPending) return <Skeleton />;
  if (!ending.data) return <p className="hint">{t("queue.detail.gone")}</p>;
  const view = ending.data;
  const told = view.told_names ?? [];
  const toggle = (i: number, on: boolean) => {
    const next = new Set(kept);
    if (on) next.add(i);
    else next.delete(i);
    setKept(next);
  };
  const all = view.items.length > 0 && kept.size === view.items.length;
  const end = () =>
    void act(
      () => api.chooseProjectEnding(cs, index, { end: true, keep: [...kept] }),
      (done) => ({
        message: done.acts.length > 0 ? t("project_ending.ended_note", { project: view.project_name, names: done.names.join(", ") }) : t("project_ending.ended", { project: view.project_name }),
        undo: () => api.undo(cs),
      }),
    );
  const keepProject = () => {
    const indexes = [index, ...view.items.map((i) => i.index)];
    void act(
      () => api.chooseProjectEnding(cs, index, { end: false, keep: [] }),
      () => ({
        message: t("project_ending.kept_project", { project: view.project_name }),
        undo: async () => {
          for (const i of indexes) await api.undeclineOp(cs, i);
        },
      }),
    );
  };
  return (
    <section className={styles.ending} aria-label={tn("queue.project_ending", view.items.length, { project: view.project_name })}>
      {view.items.length > 0 && (
        <>
          <p className="hint">{t("project_ending.intro")}</p>
          {told.length > 0 && <p className="hint">{t("project_ending.tell", { names: told.join(", ") })}</p>}
          <label className="check-line">
            <input type="checkbox" checked={all} onChange={(e) => setKept(e.target.checked ? new Set(view.items.map((i) => i.index)) : new Set())} />
            <span>{t("project_ending.keep_all")}</span>
          </label>
          <ul className={styles.items} aria-label={t("project_ending.items")}>
            {view.items.map((item) => {
              const id = `ending-${cs}-${item.index}`;
              return (
                <li key={item.index} className={styles.item}>
                  <label className="check-line" htmlFor={id}>
                    <input id={id} type="checkbox" checked={kept.has(item.index)} onChange={(e) => toggle(item.index, e.target.checked)} />
                    <span className={styles.text}>{plainTitle(item.text)}</span>
                  </label>
                  <Pill tone="neutral">{t(`project_ending.kind.${item.kind}`)}</Pill>
                </li>
              );
            })}
          </ul>
        </>
      )}
      {view.left_open.length > 0 && (
        <div>
          <p className="hint">{t("project_ending.left_open")}</p>
          <ul className={styles.items} aria-label={t("project_ending.left_open_list")}>
            {view.left_open.map((each) => (
              <li key={`${each.kind}:${each.id}`} className={styles.item}>
                <span className={styles.text}>{each.title}</span>
                <Pill tone="neutral">{each.kind_label}</Pill>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className={styles.answers}>
        <Button size="sm" variant="secondary" onClick={keepProject}>
          {t("project_ending.keep_project")}
        </Button>
        <Button size="sm" variant="primary" data-key="primary" onClick={end}>
          {kept.size > 0 ? tn("project_ending.end_keeping", kept.size, { project: view.project_name }) : t("project_ending.end", { project: view.project_name })}
        </Button>
      </div>
    </section>
  );
}
