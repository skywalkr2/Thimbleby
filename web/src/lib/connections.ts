// How each connection stands, told from its own state and its account's (design 7.9): a source is read only when it is on and
// the account it reads as is signed in, so a row that is not being read never says it was, whatever its last read said.
// One account that needs signing in is one thing to tell, however many sources it has.
import type { S } from "./api";

type Source = S["WatchSourceView"];

/** What a source says about itself: off, read at its last try, not read yet, waiting (the service asked to wait),
 * offline, failed, or needing the person to sign in (its account is signed out, can't be renewed or was refused). */
export type SourceState = "off" | "read" | "never" | "waiting" | "offline" | "failed" | "sign_in";

/** Whether the person has to sign in for a source to be read, and why: the account was signed out (`signed_out`), or it
 * expired or was refused by the service (`again`). None for a source that needs nothing from the person. */
export function signInNeed(source: Source): "signed_out" | "again" | null {
  if (!source.enabled) return null;
  if (source.account_state === "signed_out") return "signed_out";
  if (source.account_state === "expired") return "again";
  return source.last?.outcome === "failed" && source.last.error_kind === "auth" ? "again" : null;
}

export function sourceState(source: Source): SourceState {
  if (!source.enabled) return "off";
  if (signInNeed(source)) return "sign_in";
  switch (source.last?.outcome) {
    case undefined:
      return "never";
    case "failed":
      return "failed";
    case "offline":
      return "offline";
    case "throttled":
      return "waiting";
    default:
      return "read";
  }
}

/** One account that has to sign in: the address (none for a source that signs in with no named account) and the sources it
 * holds, so the sign-in is told once and not once for each of them. */
export interface SignInGroup {
  account: string | null;
  need: "signed_out" | "again";
  sources: Source[];
}

/** The sources that need a sign-in, grouped by the account they read as, the accounts in the order their sources are
 * listed. Within one account an expired sign-in outranks a signed-out one (it is the one to act on). */
export function signInGroups(sources: Source[]): SignInGroup[] {
  const groups = new Map<string, SignInGroup>();
  for (const source of sources) {
    const need = signInNeed(source);
    if (!need) continue;
    const key = source.account ?? `connector:${source.connector}`;
    const held = groups.get(key);
    if (!held) groups.set(key, { account: source.account ?? null, need, sources: [source] });
    else {
      held.sources.push(source);
      if (need === "again") held.need = "again";
    }
  }
  return [...groups.values()];
}

/** How one account stands, told once for the whole account however many connections it holds (design 7.1, 7.9): the header's
 * status and the Connections screen both read this, so they never say different things. */
export interface AccountState {
  /** The account's address, or the label of a connection that signs in with no named account. */
  key: string;
  name: string;
  /** The connector of its first connection (to find the sign-in that renews it). */
  connector: string;
  sources: Source[];
  /** What the account needs of the person, if anything: to sign in (the person signed out, or the sign-in ran out or was refused). */
  need: "signed_out" | "again" | null;
  /** Otherwise how its connections fared at their latest try: read, not read yet, couldn't be read, or no network. */
  fare: "read" | "never" | "failed" | "offline";
  /** The earliest time one of its connections that is not being read was last read, an ISO time, or null when none ever was. */
  since: string | null;
  /** The latest time one of its connections was read, an ISO time, or null. */
  latest: string | null;
  tone: "ok" | "warn" | "danger" | "neutral";
}

/** Every account that has a connection switched on, in the order its connections are listed. */
export function accountStates(sources: Source[]): AccountState[] {
  const held = new Map<string, Source[]>();
  for (const source of sources) {
    if (!source.enabled) continue;
    const key = source.account ?? source.label;
    held.set(key, [...(held.get(key) ?? []), source]);
  }
  return [...held.entries()].map(([key, mine]) => {
    const needs = mine.map(signInNeed);
    const need = needs.includes("again") ? "again" : needs.includes("signed_out") ? "signed_out" : null;
    const states = mine.map(sourceState);
    const fare = states.includes("failed") ? "failed" : states.includes("offline") ? "offline" : states.every((s) => s === "never") ? "never" : "read";
    const reads = mine.filter((s) => s.read_at).map((s) => s.read_at as string);
    const stopped = mine.filter((s) => signInNeed(s) || sourceState(s) === "failed" || sourceState(s) === "offline");
    const stoppedReads = stopped.flatMap((s) => (s.read_at ? [s.read_at] : []));
    const since = stopped.length > 0 && stoppedReads.length === stopped.length ? [...stoppedReads].sort()[0] : null;
    const tone = need === "again" || fare === "failed" ? "danger" : need === "signed_out" || fare === "offline" ? "warn" : fare === "never" ? "neutral" : "ok";
    return { key, name: key, connector: mine[0].connector, sources: mine, need, fare, since, latest: reads.length > 0 ? [...reads].sort().at(-1)! : null, tone };
  });
}

/** The accounts that need the person to sign in. */
export const accountsNeedingYou = (all: AccountState[]): AccountState[] => all.filter((a) => a.need !== null);
