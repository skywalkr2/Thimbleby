// Several saved messages at once (design 6.12, S1b-2): the person selects messages from a list of saved mail and drafts one change
// for all of them. Each message is its own act, drafted in one change; the panel shows each one, and the person's one yes approves
// and sends every one. A sent act is taken back on its own where its channel can; one Undo in the toast takes back all of those.
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { api, type S } from "./api";
import { useAct } from "./act";
import { useWords } from "./wording";

export type BatchAction = S["ActBatchIn"]["action"];
export type Drafted = S["ActBatchView"];

/** The messages the person has ticked in a list, by the id of the saved message. */
export function useSelection() {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const toggle = useCallback(
    (id: string) =>
      setSelected((now) => {
        const next = new Set(now);
        if (!next.delete(id)) next.add(id);
        return next;
      }),
    [],
  );
  const clear = useCallback(() => setSelected(new Set()), []);
  return { selected, toggle, clear };
}

/** Draft a change for the selection, take the drafts back, or give the one yes. Nothing goes out before `approve`. */
export function useActBatch() {
  const { t, tn } = useWords();
  const run = useAct();
  const client = useQueryClient();

  /** Draft one act for each selected message; the answer says which could not be drafted and why. */
  const draft = useCallback((body: S["ActBatchIn"]) => run(() => api.draftActBatch(body)), [run]);

  /** Take every draft back at once. */
  const cancel = useCallback(
    (drafted: Drafted) => (drafted.changeset ? run(() => api.undo(drafted.changeset ?? ""), () => ({ message: t("batch.cancelled") })) : Promise.resolve(undefined)),
    [run, t],
  );

  /** The one yes: each act approved and sent on the fingerprint the panel showed. The toast says how many went and why the rest
   * didn't; Undo takes back each sent act its channel can take back. */
  const approve = useCallback(
    (drafted: Drafted) =>
      run(
        async () => {
          const done = await api.sendActBatch({ acts: drafted.acts.map((a) => ({ id: a.id, fingerprint: a.fingerprint, acknowledged: [] })) });
          const sent = done.results.filter((r) => r.status === "sent");
          const fresh = await Promise.all(sent.map((r) => api.readAct(r.id).catch(() => null)));
          return { done, undoable: sent.filter((_, i) => fresh[i]?.undoable).map((r) => r.id) };
        },
        ({ done, undoable }) => {
          const sent = done.results.filter((r) => r.status === "sent").length;
          const failed = done.results.filter((r) => r.status !== "sent");
          const said = [
            sent > 0 ? tn("batch.result.done", sent) : "",
            failed.length > 0 ? tn("batch.result.failed", failed.length, { reason: failed[0].reason ?? t("batch.result.no_reason") }) : "",
          ].filter(Boolean);
          return {
            key: `batch:${drafted.changeset ?? drafted.acts[0]?.id ?? ""}`,
            message: said.join(" "),
            undo:
              undoable.length > 0
                ? async () => {
                    await Promise.all(undoable.map((id) => api.takeBackAct(id).catch(() => null)));
                    await client.invalidateQueries();
                  }
                : undefined,
          };
        },
      ),
    [run, t, tn, client],
  );

  return { draft, cancel, approve };
}
