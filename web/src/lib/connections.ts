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
