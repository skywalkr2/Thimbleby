// Whether a control is drawn inside the phone's Filter sheet (ui/FilterSheet): there a filter is a full row (its name above it, its
// choices listed) instead of a chip or a strip in a row of chips.
import { createContext, useContext } from "react";

export const InFilterSheet = createContext(false);

export function useInFilterSheet(): boolean {
  return useContext(InFilterSheet);
}
