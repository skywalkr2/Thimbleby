import type { S } from "./api";
import { connectionCards, partRank } from "./connection-cards";

type Source = S["WatchSourceView"];
const source = (id: string, over: Partial<Source> = {}): Source =>
  ({ id, label: `Source ${id}`, connector: "pack/mail", connector_label: "Example mail", enabled: true, every_minutes: 15, items: 1, last: null, read_at: null, failures: 0, problem: null, reads: ["mail"], ...over }) as Source;
const ALEX = "alex@example.com";
const BLAKE = "blake@example.com";

test("one card for each account, its connections as its parts: mail, then mail the person sent, then calendars", () => {
  const cards = connectionCards([
    source("cal", { account: ALEX, reads: ["calendar"] }),
    source("sent", { account: ALEX, author: "PER-1" }),
    source("in", { account: ALEX }),
    source("other", { account: BLAKE }),
  ]);
  expect(cards.map((c) => c.key)).toEqual([ALEX, BLAKE]);
  expect(cards[0].sources.map((s) => s.id)).toEqual(["in", "sent", "cal"]);
  expect(cards[0].service).toBe("Example mail");
  expect(cards[0].address).toBe(ALEX);
  expect(partRank(source("x", { reads: ["calendar"] }))).toBe(2);
});

test("an account that needs the person is the first card, the others keep their order", () => {
  const cards = connectionCards([
    source("a", { account: ALEX, account_state: "signed_in" }),
    source("b", { account: BLAKE, account_state: "expired" }),
  ]);
  expect(cards.map((c) => c.key)).toEqual([BLAKE, ALEX]);
  expect(cards[0].state?.need).toBe("again");
});

test("a mailbox the app reads itself is its own card by its name; folders and feeds share one card at the end", () => {
  const cards = connectionCards([
    source("folder", { reads: [], connector: "folder", connector_label: "A folder" }),
    source("box", { connector: "mailbox", connector_label: "A mailbox", label: "Work mail" }),
    source("feed", { reads: [], connector: "feed", connector_label: "A feed" }),
  ]);
  expect(cards.map((c) => [c.key, c.kind])).toEqual([["Work mail", "account"], ["other", "other"]]);
  expect(cards[1].sources.map((s) => s.id)).toEqual(["folder", "feed"]);
});

test("the sides of an account are its connections' sides, each once, in the order kept", () => {
  const [card] = connectionCards([source("a", { account: ALEX, sides: ["P1", "P2"] }), source("b", { account: ALEX, sides: ["P2", "P3"], reads: ["calendar"] })]);
  expect(card.sides).toEqual(["P1", "P2", "P3"]);
});

test("a signed-in account that reads nothing yet is a card of its own, found by its address in any case", () => {
  const signIn = { name: "pack/account", label: "Example mail", status: "signed_in", ready: true, several: true, accounts: [{ key: "k1", address: ALEX, status: "signed_in" }, { key: "k2", address: BLAKE.toUpperCase(), status: "signed_in" }] } as unknown as S["SignInView"];
  const cards = connectionCards([source("a", { account: BLAKE })], [signIn]);
  expect(cards.map((c) => c.key)).toEqual([BLAKE, ALEX]);
  expect(cards[0].signedIn?.key).toBe("k2");
  expect(cards[1].sources).toEqual([]);
});
