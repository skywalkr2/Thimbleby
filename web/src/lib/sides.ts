// The side filter on Today and Follow-ups (design 6.32): Personal and each side of the person's work, shown only to a
// person who has set one, and remembered on this browser as the theme is. A side is the id of its top project. Lines and
// rows carry the side their project is on; one on neither side (the app's own lines, a row filed under no project) shows
// under every choice.
import { useQuery } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";
import { api } from "./api";
import { useWords } from "./wording";

/** The id of a side's top project. */
export type Side = string;
export type SideChoice = "all" | Side;

const KEY = "cockpit:side-filter";
const isChoice = (v: unknown): v is SideChoice => typeof v === "string" && v !== "";

// What was picked when this browser won't keep it: it then lasts until the page is closed.
let session: SideChoice = "all";
const listeners = new Set<() => void>();

function stored(): SideChoice {
  try {
    const saved = window.localStorage.getItem(KEY);
    if (isChoice(saved)) return saved;
  } catch {
    // Storage can be blocked.
  }
  return session;
}

/** Remembers the pick on this browser and tells every screen that shows it. */
export function setSideChoice(choice: SideChoice): void {
  session = choice;
  try {
    window.localStorage.setItem(KEY, choice);
  } catch {
    // Storage can be blocked; the pick then lasts until the page is closed.
  }
  for (const listener of listeners) listener();
}

function useStoredChoice(): SideChoice {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    stored,
  );
}

/** Whether a line or row shows under a choice: everything under "all", and what is on that side or on none. */
export const onSide = (side: Side | null | undefined, choice: SideChoice): boolean => choice === "all" || !side || side === choice;

export interface SideOption {
  /** The side's id: what the choice holds and what a line's `side` is. */
  id: Side;
  name: string;
  /** Personal, the person's own life, whose name comes from the wording sheet. */
  personal: boolean;
}

export interface SideFilter {
  /** Whether the person has a side beside their own life, so the filter is offered at all. */
  offered: boolean;
  /** Personal, then each side of their work, in order, for the choices. */
  options: SideOption[];
  /** The pick in force: always "all" while there is no other side, whatever was remembered. */
  choice: SideChoice;
  /** The pick in the person's words ("Personal", or the side's name); empty for "all". */
  named: string;
  set: (choice: SideChoice) => void;
}

/** The filter's state: whether it is offered, what is picked and what the pick is called. A pick remembered as the older
 * words "personal" and "business" means the personal project and the first other side. */
export function useSideFilter(): SideFilter {
  const { t } = useWords();
  const state = useQuery({ queryKey: ["business"], queryFn: api.business });
  const picked = useStoredChoice();
  const sides = state.data?.sides ?? [];
  const personal = state.data?.personal ?? null;
  const offered = state.data?.business === true && sides.length > 0;
  const options: SideOption[] = offered
    ? [...(personal ? [{ id: personal, name: t("sides.filter.personal"), personal: true }] : []), ...sides.map((s) => ({ id: s.project, name: s.name, personal: false }))]
    : [];
  const resolved = picked === "personal" ? personal : picked === "business" ? (sides[0]?.project ?? null) : picked;
  const found = options.find((o) => o.id === resolved);
  const choice = found ? found.id : "all";
  return { offered, options, choice, named: found?.name ?? "", set: setSideChoice };
}
