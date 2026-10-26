// How often "Missed something?" was used, week by week, from the Quality screen's rows: the people's counts of one week
// added together, oldest week first. Numbers only.
import type { S } from "./api";

export interface MissedWeek {
  week: string;
  end: string;
  count: number;
}

export function missedWeeks(rows: S["QualityMissedWeek"][] | null | undefined): MissedWeek[] {
  const weeks = new Map<string, MissedWeek>();
  for (const row of rows ?? []) {
    const known = weeks.get(row.week);
    weeks.set(row.week, { week: row.week, end: row.week_end, count: (known?.count ?? 0) + row.count });
  }
  return [...weeks.values()].sort((a, b) => a.week.localeCompare(b.week));
}
