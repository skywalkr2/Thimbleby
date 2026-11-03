// A list filtered to nothing (design 7.12, "States"): it says which filter is on and what is hidden by it, and the one button is
// Clear filter, which puts the screen back to everything. It is the empty state of every screen that has a filter, so "nothing
// here" and "nothing matching" are never the same sentence.
import type { HTMLAttributes, ReactNode } from "react";
import { useWords } from "../lib/wording";
import { EmptyState } from "./EmptyState";

export function FilteredEmpty(
  props: Omit<HTMLAttributes<HTMLDivElement>, "title"> & {
    /** The sentence that names the filter ("Nothing for Lantern Row Studio today."). */
    text: ReactNode;
    /** Puts the filter back to everything. */
    onClear: () => void;
    /** The button's words when they are not "Clear filter" (the filter's own word: "Show all sides"). */
    label?: string;
  },
) {
  const { t } = useWords();
  const { text, onClear, label, ...rest } = props;
  return <EmptyState {...rest} icon="search" text={text} action={{ label: label ?? t("state.filtered.clear"), onClick: onClear }} data-filtered-empty="" />;
}
