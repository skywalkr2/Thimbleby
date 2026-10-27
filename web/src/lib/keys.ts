// Keyboard shortcuts for the review loop. Keys come from config/ui.yaml; they never fire while typing.
//
// Rows are elements marked data-row. The current row is the one holding focus; j/k move it. Regions marked data-region (a list,
// the details beside it, the rail) are walked with the pane keys, "]" and "[". Other keys are sent to
// the current row as a "rowkey" event, which the row (or the row around it) handles.
import { useEffect } from "react";

export type RowKey = "primary" | "send_back" | "copy" | "edit" | "move" | "toggle";
export const ROW_EVENT = "rowkey";

export function typing(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

function rows(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>("[data-row]"));
}

function currentRow(): HTMLElement | null {
  const active = document.activeElement;
  return active instanceof HTMLElement ? active.closest<HTMLElement>("[data-row]") : null;
}

function move(step: number): void {
  const all = rows();
  if (!all.length) return;
  const here = currentRow();
  const index = here ? all.indexOf(here) : -1;
  const target = all[Math.max(0, Math.min(all.length - 1, index + step))];
  target.focus();
}

/** What can take the cursor in a pane: a row first, then anything a person can press or type in. */
const ENTRY = '[data-row], a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';

/** The regions of a screen the cursor can move between (marked `data-region`): a list, the details beside it, the rail. A region
 * that isn't shown is not one. */
function panes(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>("[data-region]")).filter((pane) => !pane.closest("[hidden]") && getComputedStyle(pane).display !== "none");
}

/** Moves the cursor into the next (or previous) pane, wrapping round: onto the pane's first row, or its first control. From no
 * pane it enters the first one (or the last, going back). */
function movePane(step: 1 | -1): void {
  const all = panes();
  if (!all.length) return;
  const active = document.activeElement;
  const here = active instanceof HTMLElement ? all.findIndex((pane) => pane.contains(active)) : -1;
  const to = here === -1 ? (step === 1 ? 0 : all.length - 1) : (here + step + all.length) % all.length;
  const target = all[to].querySelector<HTMLElement>(ENTRY) ?? all[to];
  if (!target.hasAttribute("tabindex") && target === all[to]) target.tabIndex = -1;
  target.focus();
}

export function sendRowKey(key: RowKey): boolean {
  const row = currentRow();
  if (!row) return false;
  sendKeyTo(row, key);
  return true;
}

/** Send a key to one row, as if it had the cursor: its own handler takes it, else the row's marked button for the key. A
 * screen that has buttons of its own for a row's actions (the phone review bar) sends them this way. */
export function sendKeyTo(row: HTMLElement, key: RowKey): void {
  const unhandled = row.dispatchEvent(new CustomEvent(ROW_EVENT, { detail: key, bubbles: true, cancelable: true }));
  if (unhandled) {
    // A row without its own handler: press its marked button for this key, if it has one.
    row.querySelector<HTMLButtonElement>(`[data-key="${key}"]:not(:disabled)`)?.click();
  }
}

export interface GlobalHandlers {
  undo: () => void;
  hand_in: () => void;
  ask: () => void;
  help: () => void;
  /** Shows the lines Today is holding back (Shift+N). */
  show_new?: () => void;
}

export function useShortcuts(keys: Record<string, string>, handlers: GlobalHandlers): void {
  useEffect(() => {
    const byKey = new Map(Object.entries(keys).map(([action, key]) => [key, action]));
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey || typing(event.target)) return;
      if (document.querySelector("[data-modal-open]")) return;
      if (event.key === "Enter" && event.target instanceof HTMLElement && event.target.hasAttribute("data-row")) {
        event.preventDefault();
        sendRowKey("toggle");
        return;
      }
      // On a row, the arrow keys walk the list as j and k do; in a field or a menu they are the field's and the menu's own.
      if ((event.key === "ArrowDown" || event.key === "ArrowUp") && event.target instanceof HTMLElement && event.target.hasAttribute("data-row")) {
        event.preventDefault();
        move(event.key === "ArrowDown" ? 1 : -1);
        return;
      }
      const action = byKey.get(event.key);
      if (!action) return;
      switch (action) {
        case "next":
          move(1);
          break;
        case "previous":
          move(-1);
          break;
        case "next_pane":
          movePane(1);
          break;
        case "previous_pane":
          movePane(-1);
          break;
        case "primary":
        case "send_back":
        case "copy":
        case "edit":
        case "move":
          sendRowKey(action);
          break;
        case "undo":
          handlers.undo();
          break;
        case "hand_in":
          handlers.hand_in();
          break;
        case "ask":
          handlers.ask();
          break;
        case "help":
          handlers.help();
          break;
        case "show_new":
          handlers.show_new?.();
          break;
        default:
          return;
      }
      event.preventDefault();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [keys, handlers]);
}

/** Let a row element handle keys sent to it. Return true from a handler when it handled the key. */
export function useRowKeys(
  ref: React.RefObject<HTMLElement | null>,
  handlers: Partial<Record<RowKey, () => void>>,
): void {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onRowKey = (event: Event) => {
      const key = (event as CustomEvent<RowKey>).detail;
      const handler = handlers[key];
      if (handler) {
        event.preventDefault();
        event.stopPropagation();
        handler();
      }
    };
    el.addEventListener(ROW_EVENT, onRowKey);
    return () => el.removeEventListener(ROW_EVENT, onRowKey);
  }, [ref, handlers]);
}
