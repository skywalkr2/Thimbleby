// One inline editor open at a time on a list of rows (design 7.5): opening a row's editor (its words, a note, a reminder, a hold, a
// drop) closes whichever other one is open, on that row or any other, and Escape closes the one that is open. An editor is named
// by the record it is for and what it edits ("ACT-3:edit"); a screen that opens one asks for the slot of that name.
import { useCallback, useEffect, useSyncExternalStore } from "react";

let active: string | null = null;
const listeners = new Set<() => void>();

function set(next: string | null): void {
  if (active === next) return;
  active = next;
  for (const listener of listeners) listener();
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** Whether the editor of this name is the open one, and the way to open or close it; opening it closes any other. */
export function useOneEditor(name: string): [boolean, (open: boolean) => void] {
  const current = useSyncExternalStore(subscribe, () => active);
  // An editor whose screen goes away goes with it, so it is not open again when the screen comes back.
  useEffect(
    () => () => {
      if (active === name) set(null);
    },
    [name],
  );
  const toggle = useCallback(
    (open: boolean) => {
      if (open) set(name);
      else if (active === name) set(null);
    },
    [name],
  );
  return [current === name, toggle];
}

/** Closes the open editor when it is one of this record's; true when one was closed. */
export function closeEditorOf(record: string): boolean {
  if (active?.startsWith(`${record}:`)) {
    set(null);
    return true;
  }
  return false;
}

/** Whether an editor of this record is open. */
export function editorOpenOf(record: string): boolean {
  return !!active?.startsWith(`${record}:`);
}

/** Closes whichever editor is open (a new page or test starts with none). */
export function closeEveryEditor(): void {
  set(null);
}
