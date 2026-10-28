// The number beside a menu entry when something waits for the person (design 7.1): the figure is drawn only; the entry's own
// name carries what it counts in words ("Follow-ups, 3 follow-ups to send"), so the count is never only a number or a colour.
import type { NavEntry } from "./nav";

/** The name a screen reader gives an entry: its label, and what is waiting in words when something is. */
export function navName(entry: NavEntry): string {
  return entry.count ? `${entry.label}, ${entry.countWords ?? entry.count}` : entry.label;
}

export function NavCount(props: { entry: NavEntry; className: string }) {
  if (!props.entry.count) return null;
  return (
    <span className={props.className} aria-hidden="true">
      {props.entry.count}
    </span>
  );
}
