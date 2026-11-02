// A calendar entry proposed for a to-do (design 6.32): the person ties the to-do to it, so its date follows the entry, or says
// it isn't the one. Both answer at once with Undo on the toast. Today's line and the to-do's page use the same two answers.
import { api } from "./api";
import { useAct } from "./act";
import { useWords } from "./wording";

export function useTie(): {
  tie: (action: string, text: string, other: string) => Promise<unknown>;
  notThis: (action: string, text: string, other: string) => Promise<unknown>;
} {
  const { t } = useWords();
  const act = useAct();
  return {
    tie: (action, text, other) =>
      act(
        () => api.tieTodo(action),
        (done) => ({ message: t("queue.tie.done", { text, other }), undo: () => api.undo(done.changeset) }),
      ),
    notThis: (action, text, other) =>
      act(
        () => api.notThisEntry(action),
        (put) => ({ message: t("queue.tie.no_done", { text, other }), undo: () => api.undoNotNowSuggestion(put.signal) }),
      ),
  };
}
