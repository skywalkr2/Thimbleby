// Where first-run setup stands, for every place on Today that says it: the step to do next, and how many of the counted
// steps are done. One answer (`GET /api/setup`), so the setup line, Today's heading and its empty state never disagree.
import { useQuery } from "@tanstack/react-query";
import { api } from "./api";
import { useWords } from "./wording";

export interface NextSetupStep {
  /** The step's id, which opens the setup guide at it. */
  id: string;
  /** The step in the person's words. */
  label: string;
  done: number;
  total: number;
}

/** The step setup asks for next while any counted step is not done (one not yet passed by first, then one passed by), or
 * nothing once they all are, and until the answer has loaded. */
export function useNextSetupStep(): NextSetupStep | null {
  const { t, has } = useWords();
  const setup = useQuery({ queryKey: ["setup"], queryFn: api.setup });
  if (!setup.data) return null;
  const steps = setup.data.steps.filter((s) => s.counted);
  const next = steps.find((s) => !s.done && !s.skipped) ?? steps.find((s) => !s.done);
  if (!next) return null;
  const label = next.label || (has(`setup_step.${next.id}`) ? t(`setup_step.${next.id}`) : next.id);
  return { id: next.id, label, done: steps.filter((s) => s.done).length, total: steps.length };
}
