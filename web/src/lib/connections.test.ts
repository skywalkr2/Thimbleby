import type { S } from "./api";
import { connectionState } from "../shell/status";
import { coverage } from "./coverage";
import { accountStates, accountsNeedingYou, signInGroups, signInNeed, sourceState } from "./connections";

type Source = S["WatchSourceView"];

const source = (id: string, extra: Partial<Source> = {}): Source => ({
  id,
  label: id,
  connector: "addon/mail",
  connector_label: "Mail",
  enabled: true,
  every_minutes: 15,
  items: 1,
  last: { outcome: "ok", started_at: "2026-03-04T10:30:00+00:00", new: 0, changed: 0, removed: 0 },
  read_at: "2026-03-04T10:30:00+00:00",
  failures: 0,
  problem: null,
  account_state: "signed_in",
  ...extra,
});
const failed = (error_kind: string): NonNullable<Source["last"]> => ({ outcome: "failed", error_kind, started_at: "2026-03-04T11:00:00+00:00", new: 0, changed: 0, removed: 0 });

test("a source is read only while its own account is signed in: a signed-out one never says read", () => {
  expect(sourceState(source("a"))).toBe("read");
  expect(sourceState(source("a", { account_state: "signed_out" }))).toBe("sign_in");
  expect(signInNeed(source("a", { account_state: "signed_out" }))).toBe("signed_out");
  // The service refusing the sign-in, or its tokens running out, is a sign-in too, though its last read was fine.
  expect(sourceState(source("a", { account_state: "expired" }))).toBe("sign_in");
  expect(signInNeed(source("a", { account_state: "expired" }))).toBe("again");
});

test("a read that failed with its sign-in needs a sign-in, any other failure is only failed, a source that is off needs nothing", () => {
  expect(signInNeed(source("a", { last: failed("auth") }))).toBe("again");
  expect(sourceState(source("a", { last: failed("auth") }))).toBe("sign_in");
  expect(sourceState(source("a", { last: failed("outage") }))).toBe("failed");
  expect(signInNeed(source("a", { last: failed("outage") }))).toBeNull();
  expect(sourceState(source("a", { enabled: false, account_state: "signed_out" }))).toBe("off");
  expect(sourceState(source("a", { last: null, read_at: null }))).toBe("never");
  expect(sourceState(source("a", { last: { ...failed("x"), outcome: "throttled" } }))).toBe("waiting");
});

test("one failing account among three is one group naming its address, however many sources it holds", () => {
  const sources = [
    source("a1", { account: "a@example.com" }),
    source("a2", { account: "a@example.com" }),
    source("b1", { account: "b@example.com", last: failed("auth"), account_state: "signed_in" }),
    source("b2", { account: "b@example.com", account_state: "expired" }),
    source("b3", { account: "b@example.com", last: failed("auth") }),
    source("c1", { account: "c@example.com", account_state: "signed_out" }),
  ];
  const groups = signInGroups(sources);
  expect(groups.map((g) => [g.account, g.need, g.sources.map((s) => s.id)])).toEqual([
    ["b@example.com", "again", ["b1", "b2", "b3"]],
    ["c@example.com", "signed_out", ["c1"]],
  ]);
});

test("a source not being read is never all good: a person's own sign-out is a warning of its own, a refused sign-in is a failure", () => {
  const signedOut = coverage([source("a", { account: "a@example.com" }), source("b", { account: "b@example.com", account_state: "signed_out" })]);
  expect(signedOut.unread.map((u) => [u.source.id, u.kind])).toEqual([["b", "signed_out"]]);
  expect(signedOut.complete).toBe(false);
  expect(connectionState(signedOut)).toBe("signed_out");
  // Every account signed in and read: nothing to say.
  expect(connectionState(coverage([source("a"), source("b")]))).toBe("ok");
  // One account's refusal marks only that account's sources.
  const refused = coverage([source("a", { account: "a@example.com" }), source("b", { account: "b@example.com", last: failed("auth") })]);
  expect(refused.read.map((s) => s.id)).toEqual(["a"]);
  expect(refused.unread.map((u) => u.source.id)).toEqual(["b"]);
  expect(connectionState(refused)).toBe("failed");
});

// One failing account of three: it is one account, however many connections it holds, with the earliest time one of its
// connections that stopped was last read.
const mine = (id: string, account: string, over: Partial<S["WatchSourceView"]> = {}): S["WatchSourceView"] => ({
  id, label: `Inbox, ${account}`, connector: "k/mail", connector_label: "Mail", enabled: true, every_minutes: 15, items: 0, read_at: "2026-10-13T10:00:00Z",
  last: { outcome: "ok", started_at: "2026-10-13T10:00:00Z", new: 0, changed: 0, removed: 0 }, failures: 0, problem: null, account, account_state: "signed_in", ...over,
});

test("one account of three failing is one account that needs the person, with the time its connections were last read", () => {
  const failed = { outcome: "failed" as const, error_kind: "auth", started_at: "2026-10-13T11:00:00Z", new: 0, changed: 0, removed: 0 };
  const all = accountStates([
    mine("a", "alex@example.com"),
    mine("b1", "blake@example.com", { account_state: "expired", last: failed, read_at: "2026-10-13T08:00:00Z" }),
    mine("b2", "blake@example.com", { account_state: "expired", last: failed, read_at: "2026-10-13T07:30:00Z" }),
    mine("c", "casey@example.com"),
  ]);
  expect(all.map((a) => a.name)).toEqual(["alex@example.com", "blake@example.com", "casey@example.com"]);
  const needing = accountsNeedingYou(all);
  expect(needing.map((a) => a.name)).toEqual(["blake@example.com"]);
  expect(needing[0]).toMatchObject({ need: "again", tone: "danger", since: "2026-10-13T07:30:00Z" });
  expect(needing[0].sources).toHaveLength(2);
  expect(all[0]).toMatchObject({ need: null, fare: "read", tone: "ok", latest: "2026-10-13T10:00:00Z" });
});

test("a signed-out account is a warning, a switched-off connection is no account, and one never read is quiet", () => {
  const all = accountStates([
    mine("a", "alex@example.com", { account_state: "signed_out" }),
    mine("b", "blake@example.com", { enabled: false }),
    mine("c", "casey@example.com", { last: null, read_at: null }),
  ]);
  expect(all.map((a) => a.name)).toEqual(["alex@example.com", "casey@example.com"]);
  expect(all[0]).toMatchObject({ need: "signed_out", tone: "warn" });
  expect(all[1]).toMatchObject({ need: null, fare: "never", tone: "neutral" });
});
