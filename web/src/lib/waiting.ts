// What waits for the person on each screen that lists it (design 7.1, 7.8): one answer from the server, read by the side
// menu for each entry's count and by each screen's side tabs for how many wait in a side. A thing on no side counts under
// every side, as it shows under every choice of the filter.
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { api, type S } from "./api";
import { type SideChoice } from "./sides";

export type WaitingScreen = keyof S["WaitingCounts"];

/** The counts for every screen; none until the server has answered, so nothing is shown rather than a wrong number. */
export function useWaiting(): S["WaitingCounts"] | null {
  const waiting = useQuery({ queryKey: ["waiting"], queryFn: api.waiting });
  return waiting.data ?? null;
}

/** How many wait on a screen under a side choice: all of them under All, else that side's and those on no side. */
export function waitingUnder(count: S["WaitingCount"] | undefined, choice: SideChoice): number {
  if (!count) return 0;
  if (choice === "all") return count.total;
  return (count.sides ?? []).find((s) => s.side === choice)?.count ?? 0;
}

/** The count to show on a side tab: a number, or none when nothing waits. */
export function useTabCounts(screen: WaitingScreen): (choice: SideChoice) => number {
  const waiting = useWaiting();
  return (choice) => waitingUnder(waiting?.[screen], choice);
}

/** A screen whose count is "new since the person last looked" is marked looked at when the person leaves it (or closes the
 * page), so what it holds is still counted as new while they are there, and starts again from when they left. */
export function useLookedAt(screen: S["LookedAt"]["screen"]): void {
  useEffect(() => {
    const mark = () => void api.looked(screen).catch(() => undefined);
    window.addEventListener("pagehide", mark);
    return () => {
      window.removeEventListener("pagehide", mark);
      mark();
    };
  }, [screen]);
}
