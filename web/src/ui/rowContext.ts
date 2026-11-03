// Whether a button is drawn among a row's actions (ui/Row). A row's actions are never solid, so a primary button there is
// drawn as an outline; the button reads this to say so in its weight (`data-weight`), which the browser tests count.
import { createContext } from "react";

export const InRowActions = createContext(false);
