// Running an action: call the server, refresh, and say what happened in a toast (with Undo when it can be undone, and with
// Try again, which runs the same call again, when it failed).
import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { ApiError } from "./api";
import { useToasts, type ToastInput } from "./toasts";
import { useWords } from "./wording";

export function useAct() {
  const client = useQueryClient();
  const { push } = useToasts();
  const { t } = useWords();
  return useCallback(
    async function act<T>(run: () => Promise<T>, after?: (result: T) => Omit<ToastInput, "undo"> & { undo?: () => Promise<unknown> }): Promise<T | undefined> {
      try {
        const result = await run();
        await client.invalidateQueries();
        if (after) {
          const toast = after(result);
          const undo = toast.undo;
          push({
            ...toast,
            undo: undo
              ? async () => {
                  await undo();
                  await client.invalidateQueries();
                }
              : undefined,
          });
        }
        return result;
      } catch (err) {
        const detail = err instanceof ApiError ? err.detail : "";
        const signedOut = err instanceof ApiError && err.status === 401;
        // A failure offers to run the same call again, except a signed-out one, which no retry can fix.
        push({
          message: signedOut ? t("error.signed_out") : t("error.failed", { detail }),
          action: signedOut ? undefined : { label: t("action.try_again"), run: () => act(run, after) },
        });
        return undefined;
      }
    },
    [client, push, t],
  );
}
