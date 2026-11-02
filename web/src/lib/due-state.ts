// How a to-do's date is said where it matters: past, today or ahead, always in words (never by color alone).
import { day } from "./dates";

type T = (key: string, vars?: Record<string, string | number>) => string;

/** "overdue since Fri, Oct 30", "due today" or "due Tue, Nov 3". A date still to be checked says so and is never a deadline.
 * `today` is the day on the person's own clock. Empty for a to-do with no date. */
export function dueState(due: string | null | undefined, check: boolean | null | undefined, today: string, t: T): string {
  if (!due) return "";
  if (check) return t("op.meta.due_check", { date: day(due) });
  const on = due.slice(0, 10);
  if (on < today) return t("followups.due_overdue", { date: day(on) });
  if (on === today) return t("followups.due_today");
  return t("op.meta.due", { date: day(on) });
}
