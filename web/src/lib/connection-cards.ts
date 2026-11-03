// What the Connections screen draws as cards (design 7.9): one card for each account (a signed-in add-on's address, or the
// mailbox or calendar the app reads itself), holding that account's connections as its parts; the places that are no account
// (folders, feeds) share one card. The header's account states and the cards are built from the same sources, so they never
// say different things about one account.
import type { S } from "./api";
import { accountStates, signInNeed, type AccountState } from "./connections";

type Source = S["WatchSourceView"];
type SignIn = S["SignInView"];
type SignInAccount = S["SignInAccount"];

export interface ConnectionCard {
  /** The account's address (or, for a connection with no named account, its name); "other" for the shared card of places. */
  key: string;
  kind: "account" | "other";
  name: string;
  /** What kind of service it is, in words (the first of its connections that says), empty when none does. */
  service: string;
  /** The address to sign in again as, when the add-on names its accounts. */
  address: string | null;
  sources: Source[];
  /** How the account stands, from the connections that are on; none when all are off, or for the shared card. */
  state: AccountState | null;
  /** The sides its connections serve, in the order they are kept, each once. */
  sides: string[];
  /** The sign-in it belongs to and its entry there, when an add-on signs in for it. */
  signIn: SignIn | null;
  signedIn: SignInAccount | null;
}

/** Whether a source is a mailbox or a calendar (so it belongs to an account), as opposed to a folder or a feed. */
const isAccountSource = (s: Source): boolean => Boolean(s.account) || (s.reads ?? []).length > 0;

/** The order of an account's parts: mail, mail the person sent, calendars, anything else; each group in the order listed. */
export function partRank(s: Source): number {
  const reads = s.reads ?? [];
  if (reads.includes("mail")) return s.author ? 1 : 0;
  if (reads.includes("calendar")) return 2;
  return 3;
}

const same = (a: string | null | undefined, b: string | null | undefined) => (a ?? "").trim().toLowerCase() === (b ?? "").trim().toLowerCase() && !!a && !!b;

/** The cards for a list of connections and sign-ins: the accounts that need the person first, then the rest in the order
 * their connections are listed, then the shared card of places. A signed-in account that reads nothing yet is a card of its own. */
export function connectionCards(sources: Source[], signIns: SignIn[] = []): ConnectionCard[] {
  const groups = new Map<string, Source[]>();
  const others: Source[] = [];
  for (const source of sources) {
    if (!isAccountSource(source)) {
      others.push(source);
      continue;
    }
    const key = source.account ?? source.label;
    groups.set(key, [...(groups.get(key) ?? []), source]);
  }
  const findSignIn = (address: string | null, connector: string): { signIn: SignIn | null; signedIn: SignInAccount | null } => {
    for (const signIn of signIns) {
      const found = (signIn.accounts ?? []).find((a) => same(a.address, address));
      if (found) return { signIn, signedIn: found };
    }
    const addon = connector.includes("/") ? connector.split("/", 1)[0] : null;
    const byAddon = addon ? signIns.find((s) => s.name.split("/", 1)[0] === addon) : null;
    return { signIn: byAddon ?? null, signedIn: null };
  };
  const states = new Map(accountStates(sources).map((a) => [a.key, a]));
  const cards: ConnectionCard[] = [...groups.entries()].map(([key, mine]) => {
    const parts = [...mine].sort((a, b) => partRank(a) - partRank(b));
    const address = mine.find((s) => s.account)?.account ?? null;
    return {
      key,
      kind: "account" as const,
      name: key,
      service: mine.find((s) => s.connector_label)?.connector_label ?? "",
      address,
      sources: parts,
      state: states.get(key) ?? null,
      sides: [...new Set(mine.flatMap((s) => s.sides ?? []))],
      ...findSignIn(address, mine[0].connector),
    };
  });
  // A signed-in account none of the connections read: its own card, so it can be signed out and its sources chosen.
  for (const signIn of signIns) {
    for (const account of signIn.accounts ?? []) {
      if (!account.address || cards.some((c) => same(c.address, account.address))) continue;
      cards.push({ key: account.address, kind: "account", name: account.address, service: signIn.label, address: account.address, sources: [], state: null, sides: [], signIn, signedIn: account });
    }
  }
  const needs = (c: ConnectionCard) => (c.state?.need ? 0 : 1);
  const ordered = [...cards].sort((a, b) => needs(a) - needs(b));
  if (others.length > 0) {
    ordered.push({ key: "other", kind: "other", name: "", service: "", address: null, sources: others, state: null, sides: [], signIn: null, signedIn: null });
  }
  return ordered;
}

/** Whether any of a card's connections needs the person to sign in. */
export const cardNeedsSignIn = (card: ConnectionCard): boolean => card.sources.some((s) => signInNeed(s) !== null);
