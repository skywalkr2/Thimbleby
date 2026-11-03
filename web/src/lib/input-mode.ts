// How the person is working right now: with the keyboard, or with a pointer. A row's cursor ring and its cursor fill are for the
// keyboard only, so a row that took the cursor by itself as a screen opened (the first line of Today, where the keys begin)
// shows neither until a key is pressed. The mode is written on the page's root (`data-input`) for the styles, and read in code
// through `useKeyboardInput`. Nothing is set until the first key or press, so a page that has had neither shows no ring.
import { useSyncExternalStore } from "react";

export type InputMode = "keyboard" | "pointer" | null;

let mode: InputMode = null;
let installed = false;
const listeners = new Set<() => void>();

function set(next: InputMode): void {
  if (next === mode) return;
  mode = next;
  if (next) document.documentElement.setAttribute("data-input", next);
  else document.documentElement.removeAttribute("data-input");
  listeners.forEach((fn) => fn());
}

/** Starts watching keys and presses. Safe to call more than once. */
export function installInputMode(): void {
  if (installed || typeof document === "undefined") return;
  installed = true;
  // Capture phase: the mode is known before a key moves the cursor or a press opens anything.
  document.addEventListener("keydown", (e) => { if (!["Shift", "Control", "Alt", "Meta"].includes(e.key)) set("keyboard"); }, true);
  document.addEventListener("pointerdown", () => set("pointer"), true);
}

/** Forgets what was seen (for tests, and for a page that is built again). */
export function resetInputMode(): void {
  set(null);
}

/** True once a key has been pressed and no press has followed it. */
export function useKeyboardInput(): boolean {
  installInputMode();
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => mode === "keyboard",
    () => false,
  );
}
