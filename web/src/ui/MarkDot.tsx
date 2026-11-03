// The small round mark that says which side or which calendar something belongs to (design 7.12): 8px, in the row's 24px
// leading slot or beside a name. It is drawn for the eye only; the name stands beside it, so a color is never the only sign.
// A side takes a slot of --side-1 to --side-5 by its place in the person's list; a calendar takes the named color its
// settings gave it (--cal-1 to --cal-8).
import styles from "./MarkDot.module.css";

export type CalendarColor = "blue" | "teal" | "green" | "orange" | "red" | "pink" | "purple" | "gray";

export type MarkDotProps =
  | { kind: "side"; /** 1 to 5 */ slot: number; className?: string }
  | { kind: "calendar"; color: CalendarColor | null | undefined; className?: string };

/** The slot (1 to 5) of the nth side in the person's order, wrapping round when there are more than five. */
export const sideSlot = (index: number): number => (((index % 5) + 5) % 5) + 1;

export function MarkDot(props: MarkDotProps) {
  const color = props.kind === "calendar" ? (props.color ?? "gray") : String(props.slot);
  return <span className={[styles.dot, props.className ?? ""].filter(Boolean).join(" ")} data-mark={props.kind} data-color={color} aria-hidden="true" />;
}
