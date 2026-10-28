// The area filter on Today (design 6.32): one Today across the areas of life, each line tagged by its area, narrowed to one area
// when the person picks it. It is offered only when Today's lines are in more than one place (two areas, or an area and none),
// and the pick is remembered on this browser. A line in no area shows only under All. A remembered pick for an area no line is in
// today reads as All, so the screen is never empty because of a filter nobody can see.
import { useQuery } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";
import { api, type S } from "./api";

export type AreaChoice = "all" | string;

const KEY = "cockpit:area-filter";
let session: AreaChoice = "all";
const listeners = new Set<() => void>();

function stored(): AreaChoice {
  try {
    const saved = window.localStorage.getItem(KEY);
    if (saved) return saved;
  } catch {
    // Storage can be blocked.
  }
  return session;
}

/** Remembers the pick on this browser and tells every screen that shows it. */
export function setAreaChoice(choice: AreaChoice): void {
  session = choice;
  try {
    window.localStorage.setItem(KEY, choice);
  } catch {
    // Storage can be blocked; the pick then lasts until the page is closed.
  }
  for (const listener of listeners) listener();
}

export function useStoredArea(): AreaChoice {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    stored,
  );
}

type Line = Pick<S["QueueLineView"], "area" | "area_name">;

/** Whether a line shows under a choice: everything under All, and only that area's lines under an area. */
export const inArea = (line: Line, choice: AreaChoice): boolean => choice === "all" || line.area === choice;

/** The areas Today's lines are in, in the order they first appear, once each. */
export function areasOf(lines: readonly Line[]): { id: string; name: string }[] {
  const found = new Map<string, string>();
  for (const l of lines) if (l.area && !found.has(l.area)) found.set(l.area, l.area_name ?? l.area);
  return [...found].map(([id, name]) => ({ id, name }));
}

/** The pick in force for these lines: the remembered area when some line is in it, else All. */
export function chosenArea(lines: readonly Line[], picked: AreaChoice): AreaChoice {
  return picked !== "all" && areasOf(lines).some((a) => a.id === picked) ? picked : "all";
}

/** Whether Today's lines are in more than one place (two areas, or an area and none), which is when each is tagged. */
export function mixesAreas(lines: readonly Line[]): boolean {
  return new Set(lines.map((l) => l.area ?? "")).size > 1 && lines.some((l) => !!l.area);
}

export interface AreaFilter {
  /** Whether the filter is offered: the lines are in more than one place. */
  offered: boolean;
  options: { id: string; name: string }[];
  choice: AreaChoice;
  set: (choice: AreaChoice) => void;
}

/** The filter's state from the queue as the server gave it (before any filter), sharing the queue's own query. */
export function useAreaFilter(): AreaFilter {
  const queue = useQuery({ queryKey: ["today", "queue"], queryFn: api.todayQueue });
  const picked = useStoredArea();
  const lines = queue.data ?? [];
  return { offered: mixesAreas(lines), options: areasOf(lines), choice: chosenArea(lines, picked), set: setAreaChoice };
}
