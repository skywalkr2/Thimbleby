// A popover (design 7.12): a small raised panel that opens from a button and shows what the button's words don't have room for
// (the status chip's states, why a promise stands as it does). It is a React Aria popover holding a dialog, so it is keyboard and
// screen-reader complete, closes with Escape and gives focus back to its button. `columns={2}` sets its parts in two columns,
// which fall to one below the width two need: the parts are the items of one list (`ul` or `ol`) and the popover lays that list in
// the columns. The popover draws the surface, the shadow by day and the edge by night, the width and the columns, and the caller
// draws what is inside.
// It is used inside a React Aria `DialogTrigger` with the trigger button beside it.
import type { ReactNode } from "react";
import { Dialog, Popover as AriaPopover } from "react-aria-components";
import styles from "./Popover.module.css";

export interface PopoverProps {
  /** What a screen reader calls the popover. */
  label: string;
  placement?: "bottom end" | "bottom start" | "top end" | "top start";
  /** The width: 320px (`sm`) or 420px (`md`, the default), or 640px with two columns. */
  size?: "sm" | "md";
  /** Set the items of the list inside in two columns (they fall to one when the window is narrow). */
  columns?: 1 | 2;
  /** Added to the dialog inside, for the caller's own layout of its content. */
  className?: string;
  children: ReactNode | ((close: () => void) => ReactNode);
}

export function Popover(props: PopoverProps) {
  const { size = "md", columns = 1 } = props;
  return (
    <AriaPopover placement={props.placement ?? "bottom end"} offset={6} className={styles.popover} data-size={size} data-columns={columns}>
      <Dialog aria-label={props.label} className={[styles.dialog, props.className ?? ""].filter(Boolean).join(" ")}>
        {({ close }) => (typeof props.children === "function" ? props.children(close) : props.children)}
      </Dialog>
    </AriaPopover>
  );
}
