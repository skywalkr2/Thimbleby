// The question about a kind of suggestion the person keeps putting off (design 6.32): quiet it into the morning brief, stop
// offering it, or keep showing it. Each answer acts at once with Undo on the toast; only the person's yes changes what shows.
import { api } from "./api";
import { useAct } from "./act";
import { useWords } from "./wording";

export function useAttention(): {
  kindWords: (kind: string) => string;
  quiet: (kind: string) => Promise<unknown>;
  stop: (kind: string) => Promise<unknown>;
  keep: (kind: string) => Promise<unknown>;
} {
  const { t } = useWords();
  const act = useAct();
  const kindWords = (kind: string) => t(`queue.attention.kind.${kind}`);
  const chosen = (kind: string, how: "quiet" | "stop", message: string) =>
    act(
      () => api.chooseAttention(kind, how),
      () => ({ message: t(message, { kind: kindWords(kind) }), undo: () => api.chooseAttention(kind, "show") }),
    );
  return {
    kindWords,
    quiet: (kind) => chosen(kind, "quiet", "queue.attention.quiet_done"),
    stop: (kind) => chosen(kind, "stop", "queue.attention.stop_done"),
    keep: (kind) =>
      act(
        () => api.keepShowing(kind),
        (put) => ({ message: t("queue.attention.keep_done", { kind: kindWords(kind) }), undo: () => api.undoNotNowSuggestion(put.signal) }),
      ),
  };
}
