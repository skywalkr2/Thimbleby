// Whether a button is drawn among a row's actions (ui/Row). A row's actions are never solid, so a primary button there is
// drawn as an outline; the button reads this to say so in its weight (`data-weight`), which the browser tests count.
import { createContext } from "react";

export const InRowActions = createContext(false);

/** The screen's one filled button is in this row: the row's actions keep the filled weight for a primary button, which an
 * action in a row is otherwise never drawn with. Set by the screen around the one row that carries it. */
export const FilledPrimary = createContext(false);
