// Pointing at a row on another part of the same screen: a Today line asks for the assistant's answer to be looked at,
// or a question to be answered, or a person's group in Follow-ups, or a line of Today's queue (by its key), or a new source's intake (the list narrows to what it found), and the list that holds it opens that row. The list says it handled the request; when
// none does (its row isn't on this screen), the caller does something else.
import { useEffect, useRef } from "react";

export type Revealable = "changeset" | "question" | "person" | "intake" | "line" | "act";
const EVENT = "reveal-row";

/** Ask whichever list holds this item to open it. True when one did. */
export function reveal(type: Revealable, id: string): boolean {
  const event = new CustomEvent(EVENT, { detail: { type, id }, cancelable: true });
  window.dispatchEvent(event);
  return event.defaultPrevented;
}

let waiting: { type: Revealable; id: string } | null = null;

/** How long a request kept for a screen that was still loading waits for its list to hold the row. */
const KEPT_FOR_MS = 5000;

/** Like `reveal`, for a caller that can take the person to the screen that holds the item: when no list on this screen
 * does, the request is kept for the list that mounts next, which opens the row. True when one did at once. */
export function revealOrKeep(type: Revealable, id: string): boolean {
  if (reveal(type, id)) return true;
  waiting = { type, id };
  return false;
}

/** Answer requests for one kind of item: `handle` opens the row and returns true, or returns false when it has no such row. */
export function useReveal(type: Revealable, handle: (id: string) => boolean): void {
  const latest = useRef(handle);
  latest.current = handle;
  // A request kept for this screen that its list could not answer yet (the rows were still loading) is tried again as the
  // screen changes, for a short time.
  const retry = useRef<{ id: string; until: number } | null>(null);
  useEffect(() => {
    const kept = retry.current;
    if (kept && (Date.now() > kept.until || latest.current(kept.id))) retry.current = null;
  });
  useEffect(() => {
    const onReveal = (event: Event) => {
      const detail = (event as CustomEvent<{ type: Revealable; id: string }>).detail;
      if (detail?.type === type && !event.defaultPrevented && latest.current(detail.id)) event.preventDefault();
    };
    window.addEventListener(EVENT, onReveal);
    if (waiting?.type === type) {
      const kept = waiting;
      waiting = null;
      if (!latest.current(kept.id)) retry.current = { id: kept.id, until: Date.now() + KEPT_FOR_MS };
    }
    return () => window.removeEventListener(EVENT, onReveal);
  }, [type]);
}

/** Bring a row into view and give it focus. */
export function showRow(row: HTMLElement | null, focusInside = false): void {
  if (!row) return;
  row.scrollIntoView?.({ block: "nearest" });
  // The cursor goes to the row's first field; a row with none gives it to its first button.
  const inner = focusInside ? (row.querySelector<HTMLElement>("textarea, input, select") ?? row.querySelector<HTMLElement>("button")) : null;
  (inner ?? row).focus();
}
