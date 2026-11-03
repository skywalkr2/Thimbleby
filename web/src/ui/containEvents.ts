// The panels the date, time and list controls open are drawn in a layer of their own, but React still passes their clicks and
// keys up to the row or form the control sits in (an event follows the component tree, not the page). So a click on a choice
// would also be a click on the row behind it, and Enter on a day would also be Enter on the row. A panel wraps its content with
// these, so what happens inside it stays inside. Escape is let through for the panel's own overlay, which closes on it.
import type { KeyboardEvent, MouseEvent } from "react";

export const contained = {
  onClick: (e: MouseEvent) => e.stopPropagation(),
  onKeyDown: (e: KeyboardEvent) => {
    if (e.key !== "Escape") e.stopPropagation();
  },
};
