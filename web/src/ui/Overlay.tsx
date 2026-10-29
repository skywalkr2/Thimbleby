// The frame of everything that opens over the page and takes the cursor (design 7.12): a drawer from the right edge, a dialog in
// the middle, and, below the phone width, the same two as a sheet from the bottom edge with a handle (a `sheet` is that form at
// every width: the phone's menus). One component draws the
// backdrop, the raised surface and the sheet form, so a drawer and a dialog lift off the page the same way, by day and by night.
// What goes inside (the heading, the body, the footer) is the caller's: `Drawer` and `ModalPanel` are the two callers.
import type { ReactNode } from "react";
import { Modal, ModalOverlay } from "react-aria-components";
import styles from "./Overlay.module.css";

export type OverlayKind = "drawer" | "dialog" | "sheet";

/** The sheet from the bottom edge, at every width: a list of choices on a phone (the bottom bar's menus). */
export function BottomSheet(props: { onClose: () => void; className?: string; children: ReactNode }) {
  return (
    <Overlay kind="sheet" onOpenChange={(open) => !open && props.onClose()} dismissable className={props.className}>
      {props.children}
    </Overlay>
  );
}

export function Overlay(props: {
  kind: OverlayKind;
  open?: boolean;
  onOpenChange: (open: boolean) => void;
  /** A click outside closes it too. */
  dismissable?: boolean;
  /** More room: a drawer of 640px instead of 480px, a dialog of 780px instead of 560px (a review with two views side by side). */
  wide?: boolean;
  /** A mark on the frame for the styles and tests that name a kind of dialog. */
  className?: string;
  children: ReactNode;
}) {
  return (
    <ModalOverlay
      isOpen={props.open ?? true}
      onOpenChange={props.onOpenChange}
      isDismissable={props.dismissable}
      className={[styles.overlay, styles[props.kind]].join(" ")}
    >
      <Modal
        className={[styles.modal, styles[props.kind], props.wide ? styles.wide : "", props.className ?? ""].filter(Boolean).join(" ")}
        data-modal-open=""
        data-overlay={props.kind}
      >
        <span className={styles.handle} aria-hidden="true" />
        {props.children}
      </Modal>
    </ModalOverlay>
  );
}
