// The first go (design 7.8): until the person's first go in a workspace, AI runs wait, and Today shows them as one line
// with how many there are and what they would cost together (the engine counts them, with the sorting run the go also makes).
import { useTotal } from "./money";
import { useWords } from "./wording";

export interface FirstGo {
  /** How many runs wait for the first go. */
  count: number;
  /** What the runs that have a price would cost together, or null when none has one. */
  estimate: number | null;
  /** How many of the runs have no price (they use the plan's allowance). */
  unpriced: number;
}

/** The line's words: "Start the assistant: 12 items, about $0.30", or the count and the plan's allowance when there
 * is no price. */
export function useFirstGoText(): (first: FirstGo) => string {
  const { t, tn } = useWords();
  const total = useTotal();
  return (first) => {
    if (first.estimate === null) return tn("first_go.unpriced", first.count);
    const cost = first.estimate < 0.005 ? t("first_go.under_cent") : t("first_go.about", { amount: total(first.estimate) });
    return first.unpriced > 0
      ? tn("first_go.mixed", first.count, { cost })
      : tn("first_go.priced", first.count, { cost });
  };
}
