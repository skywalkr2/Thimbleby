// What was read, and what couldn't be: the sources that are on, sorted by how their latest try went, and the words for a
// time ("7:40 AM", "yesterday 6:00 PM"). "Couldn't read" and "read, nothing new" are different things and are kept apart
// here, so no screen shows one as the other.
import { useQuery } from "@tanstack/react-query";
import { api, type S } from "./api";
import { addDays, day, dayAndTime, todayOn, time, wallTime } from "./dates";
import { signInNeed } from "./connections";
import { latestRead } from "./sources";

type Source = S["WatchSourceView"];
type T = (key: string, vars?: Record<string, string | number>) => string;

export interface Unread {
  source: Source;
  /** failed: the service refused or failed; offline: there was no network; signed_out: the account it reads as is signed out
   * or needs signing in again, so it is not being read whatever its last try said. */
  kind: "failed" | "offline" | "signed_out";
}

export interface Coverage {
  /** How many sources are on. */
  enabled: number;
  /** On, and the latest try read them. */
  read: Source[];
  /** The latest actual read across `read`, an ISO time, or null. */
  last: string | null;
  /** On, and the latest try didn't read them. */
  unread: Unread[];
  /** On, never read and with no failure to report: not tried yet. */
  pending: Source[];
  /** On, read before, the latest try didn't fail, and not read successfully within the configured hours. */
  stale: Source[];
  /** Every source that is on was read at its latest try, and recently. */
  complete: boolean;
}

export function coverage(sources: Source[]): Coverage {
  const on = sources.filter((s) => s.enabled);
  const unread: Unread[] = [];
  const read: Source[] = [];
  const pending: Source[] = [];
  const stale: Source[] = [];
  for (const source of on) {
    const outcome = source.last?.outcome;
    const need = signInNeed(source);
    // The person's own sign-out is its own kind (a warning); a sign-in the service refused or let run out is a failure.
    if (need === "signed_out") unread.push({ source, kind: "signed_out" });
    else if (need === "again" || outcome === "failed") unread.push({ source, kind: "failed" });
    else if (outcome === "offline") unread.push({ source, kind: "offline" });
    else if (source.read_at && source.stale) stale.push(source);
    else if (source.read_at) read.push(source);
    else pending.push(source);
  }
  return { enabled: on.length, read, last: latestRead(read), unread, pending, stale, complete: on.length > 0 && unread.length === 0 && pending.length === 0 && stale.length === 0 };
}

/** The coverage of the sources the app reads; null until they are known, and when there is none on. */
export function useCoverage(): Coverage | null {
  const watch = useQuery({ queryKey: ["watch"], queryFn: api.watchSources });
  if (!watch.data) return null;
  const found = coverage(watch.data);
  return found.enabled > 0 ? found : null;
}

/** A time in words: the clock alone today, "yesterday" and the clock the day before, otherwise the day and the clock.
 * `wall` is for a time the server wrote on the person's own clock; otherwise it is an instant, shown on this computer's. */
export function whenWords(iso: string, now: Date, t: T, wall = false): string {
  const parsed = new Date(iso.replace(" ", "T"));
  if (!wall && Number.isNaN(parsed.getTime())) return "";
  const date = wall ? iso.slice(0, 10) : todayOn(parsed);
  const clock = wall ? wallTime(iso) : time(parsed);
  const today = todayOn(now);
  if (date === today) return clock;
  if (date === addDays(today, -1)) return t("coverage.yesterday", { time: clock });
  return wall ? `${day(iso)}, ${clock}` : dayAndTime(parsed.toISOString());
}
