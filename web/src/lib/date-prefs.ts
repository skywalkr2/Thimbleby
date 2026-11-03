// What a date box needs to know about the person's week (design 7.12): the day their week starts on and the weekdays they work,
// read from the schedule's own settings the first time a calendar opens and kept; until they are known (or where the schedule
// can't be read) the week starts where the locale's does and no weekday is marked as a day off.
import { useQuery } from "@tanstack/react-query";
import { api } from "./api";
import { localeWeekStart } from "./date-input";

export interface DatePrefs {
  /** Monday as 0 through Sunday as 6. */
  weekStartsOn: number;
  /** The weekdays the person works, Monday as 0; none known means no weekday is marked. */
  workDays: number[] | null;
}

export function useDatePrefs(enabled: boolean, locale?: string): DatePrefs {
  const found = useQuery({ queryKey: ["date-prefs"], queryFn: () => api.schedule(null, 1), enabled, staleTime: 300_000, retry: false });
  return { weekStartsOn: found.data?.week_starts_on ?? localeWeekStart(locale), workDays: found.data?.work_days ?? null };
}
