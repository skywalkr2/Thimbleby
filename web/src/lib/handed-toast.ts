// Whether what the person just handed in will wait for their Start: Today already has the line asking to start the assistant.
// The toast then says so, with a way to Today, rather than saying the assistant is on it.
import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { api } from "./api";
import type { ToastInput } from "./toasts";
import { toHash } from "./views";
import { useWords } from "./wording";

const WAITING_FOR_START = new Set(["first_go", "catch_up_go"]);

/** Reads Today's queue afresh and says whether a line is waiting for the person to start the assistant. */
export function useWaitsForStart(): () => Promise<boolean> {
  const client = useQueryClient();
  return useCallback(async () => {
    try {
      const lines = await client.fetchQuery({ queryKey: ["today", "queue"], queryFn: api.todayQueue, staleTime: 0 });
      return lines.some((line) => WAITING_FOR_START.has(line.kind));
    } catch {
      return false;
    }
  }, [client]);
}

/** The toast for something handed in: that the assistant is on it, or that it waits for Start on Today (with a link there). */
export function useHandedToast(): (waits: boolean, done: string, waiting: string) => Omit<ToastInput, "undo"> {
  const { t } = useWords();
  return (waits, done, waiting) =>
    waits ? { message: waiting, action: { label: t("toast.go_today"), run: () => void (window.location.hash = toHash("today")) } } : { message: done };
}
