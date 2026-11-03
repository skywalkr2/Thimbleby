// Settings the person has typed but that are not yet saved (still being typed, queued behind another save, or on their way to
// the server) are kept for the tab, so a reload at any moment brings them back and saves them. A value leaves the store once
// its save has been answered. Where the browser keeps nothing, the screen works the same and a reload loses what was in flight.
import type { Draft } from "./settings";

const KEY = "settings-unsaved";

export type Unsaved = Record<string, Draft>;

export function readUnsaved(): Unsaved {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    const found: unknown = raw ? JSON.parse(raw) : null;
    return found && typeof found === "object" && !Array.isArray(found) ? (found as Unsaved) : {};
  } catch {
    return {};
  }
}

export function writeUnsaved(edits: Unsaved): void {
  try {
    if (Object.keys(edits).length === 0) window.sessionStorage.removeItem(KEY);
    else window.sessionStorage.setItem(KEY, JSON.stringify(edits));
  } catch {
    // Nothing to keep it in: the screen carries on without it.
  }
}
