// What a person typed on a setup screen and has not saved yet, kept in this browser tab so a reload does not lose it. One entry
// per field and screen; a field back at its starting value keeps nothing. A draft is the person's convenience only: nothing
// is sent anywhere, a blocked or full store just means the field starts empty, and a secret (a pasted key) is never kept here.
import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";

const PREFIX = "setup-draft:";
/** The screens that opened with something restored, for the note that says so. */
const restored = new Set<string>();

function read<T>(screen: string, name: string): T | undefined {
  try {
    const text = window.sessionStorage.getItem(`${PREFIX}${screen}:${name}`);
    return text === null ? undefined : (JSON.parse(text) as T);
  } catch {
    return undefined;
  }
}

function write(screen: string, name: string, value: unknown, initial: unknown) {
  try {
    if (JSON.stringify(value) === JSON.stringify(initial)) window.sessionStorage.removeItem(`${PREFIX}${screen}:${name}`);
    else window.sessionStorage.setItem(`${PREFIX}${screen}:${name}`, JSON.stringify(value));
  } catch {
    // Storage can be blocked or full; the field then simply isn't kept.
  }
}

/** State that survives a reload of the page: it starts from what was typed before when there is something, and keeps every
 * change. `screen` and `name` say where it belongs; with `keep` false it is plain state. */
export function useDraftState<T>(screen: string, name: string, initial: T, keep = true): [T, Dispatch<SetStateAction<T>>] {
  const first = useRef(initial);
  const [value, setValue] = useState<T>(() => {
    const kept = keep ? read<T>(screen, name) : undefined;
    if (kept === undefined || JSON.stringify(kept) === JSON.stringify(initial)) return initial;
    restored.add(screen);
    return kept;
  });
  useEffect(() => {
    if (keep) write(screen, name, value, first.current);
  }, [keep, screen, name, value]);
  return [value, setValue];
}

/** Whether this screen opened with what the person had typed before: asked once, when the screen opens, after its drafts.
 * The note is said once: opening the screen again later says nothing more. */
export function useRestored(screen: string): boolean {
  const [was] = useState(() => restored.has(screen));
  useEffect(() => {
    restored.delete(screen);
  }, [screen]);
  return was;
}

/** Forget the screen's drafts, once what they held is saved. */
export function clearDrafts(screen: string) {
  restored.delete(screen);
  try {
    const mine = `${PREFIX}${screen}:`;
    for (let i = window.sessionStorage.length - 1; i >= 0; i--) {
      const key = window.sessionStorage.key(i);
      if (key?.startsWith(mine)) window.sessionStorage.removeItem(key);
    }
  } catch {
    // Nothing to forget when storage is blocked.
  }
}
