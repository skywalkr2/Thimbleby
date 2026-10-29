// The dialog (design 7.12): a modal labelled by its heading, focus kept inside, the cursor starting in its first field (or on
// its heading), Escape closes. Its actions are a `DialogFooter`, which sticks to the bottom edge while the rest scrolls; below the
// phone width it is a sheet from the bottom edge (see Overlay). The marker attribute pauses the row shortcuts while it is
// open. Where focus goes on close is up to the caller (see restoreFocus).
import type { ComponentProps, ReactNode } from "react";
import { Dialog } from "react-aria-components";
import { useCursorRef } from "../lib/cursor";
import { Actions } from "../ui/Actions";
import { Overlay } from "../ui/Overlay";
import styles from "./ModalPanel.module.css";

export function ModalPanel(props: {
  titleId: string;
  onClose: () => void;
  /** A click outside closes it too. */
  dismissable?: boolean;
  /** A review that needs more room than the usual 560px. */
  roomy?: boolean;
  children: ReactNode;
}) {
  // The cursor starts in the dialog's first field, or on its heading when it has none (design 7.0).
  const cursor = useCursorRef(props.titleId);
  return (
    <Overlay
      kind="dialog"
      onOpenChange={(open) => !open && props.onClose()}
      dismissable={props.dismissable}
      wide={props.roomy}
      className="dialog-panel"
    >
      <Dialog ref={cursor} aria-labelledby={props.titleId} className={`${styles.dialog} help-dialog`}>
        {props.children}
      </Dialog>
    </Overlay>
  );
}

/** A dialog's actions, at the right edge, kept in view at the bottom of the dialog while its content scrolls. */
export function DialogFooter(props: ComponentProps<typeof Actions>) {
  const { className, ...rest } = props;
  return <Actions align="end" {...rest} className={[styles.footer, className ?? ""].filter(Boolean).join(" ")} />;
}

/** Put focus back on the control that opened a dialog, once the dialog has gone. While a dialog is open the rest of the
 * page is inert, and that is lifted a moment after the dialog leaves, so this waits (a frame at a time, about a second
 * at most) until the control can take focus, and never takes it from a dialog that has opened since. */
export function restoreFocus(target: () => HTMLElement | null | undefined, frames = 60): void {
  const attempt = (left: number) => {
    const el = target();
    const blocked = !el || !!document.querySelector("[data-modal-open]") || !!el.closest("[inert], [aria-hidden=true]");
    if (blocked && left > 0) {
      window.requestAnimationFrame(() => attempt(left - 1));
      return;
    }
    // Out of frames with another dialog open (one opened after this one closed): the cursor is that dialog's now.
    if (document.querySelector("[data-modal-open]")) return;
    el?.focus();
  };
  window.requestAnimationFrame(() => attempt(frames));
}
