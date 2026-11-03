// How one connection (a part of an account's card) says it stands (design 7.9): "Read 2 min ago", or "Not read since 10:51 AM",
// with a tone so the state is never told by color alone (the words say it). Told from the connection's own state and its account's.
import type { S } from "./api";
import { signInNeed, sourceState } from "./connections";
import { whenWords } from "./coverage";
import type { StateTone } from "../ui/StateMark";

type Source = S["WatchSourceView"];
type T = (key: string, vars?: Record<string, string | number>) => string;
type Tn = (key: string, n: number, vars?: Record<string, string | number>) => string;

/** How long ago a time was, in the person's words: just now, minutes, hours; older than a day by its day and clock. */
export function agoWords(iso: string, now: Date, t: T, tn: Tn): string {
  const then = new Date(iso.replace(" ", "T"));
  if (Number.isNaN(then.getTime())) return "";
  const minutes = Math.max(0, Math.floor((now.getTime() - then.getTime()) / 60_000));
  if (minutes < 1) return t("connection.ago.now");
  if (minutes < 60) return t("connection.ago.minutes", { n: minutes });
  if (minutes < 60 * 12) return tn("connection.ago.hours", Math.floor(minutes / 60));
  return whenWords(iso, now, t);
}

export function partStatus(source: Source, t: T, tn: Tn, now: Date = new Date()): { text: string; tone: StateTone } {
  const state = sourceState(source);
  const since = source.read_at ? t("connection.part.not_read_since", { when: whenWords(source.read_at, now, t) }) : t("connection.part.not_read");
  switch (state) {
    case "off":
      return { text: t("sources.off"), tone: "neutral" };
    case "sign_in":
      return { text: since, tone: signInNeed(source) === "signed_out" ? "warn" : "danger" };
    case "failed":
      return { text: since, tone: "danger" };
    case "offline":
      return { text: t("sources.status.offline"), tone: "warn" };
    case "waiting":
      return { text: t("sources.status.waiting"), tone: "warn" };
    case "read":
      return { text: t("connection.part.read", { ago: source.read_at ? agoWords(source.read_at, now, t, tn) : "" }).trim(), tone: "ok" };
    default:
      return { text: t("sources.never"), tone: "neutral" };
  }
}
