import type { S } from "../lib/api";
import { aliveState, connectionState, initials, isWarn, toneOf, worstState } from "./status";

const status = (over: Partial<S["Status"]> = {}, backup: Partial<S["BackupStatus"]> = {}, spend: Partial<S["SpendStatus"]> = {}): S["Status"] => ({
  backup: { configured: true, last_success: null, age_hours: 1, needs_attention: false, last_error: null, encrypted: false, ...backup },
  ai: { state: "ok", detail: null },
  assistant: { last_run_at: null, last_run_failed: false, runs_today: [], queued: 0, oldest_queued_since: null, chains: [], paused: [] },
  spend: { today_usd: 0, month_usd: 0, per_day_usd: 2, per_month_usd: 30, warn: false, warn_today: false, warn_month: false, ...spend },
  requests: { queued: 0, running: 0, review: 0, needs_you: 0 },
  version: 1,
  restart_needed: null,
  can_restart: true,
  ...over,
});

test("all good is live", () => {
  expect(worstState({ live: "live", status: status(), restartPhase: "idle" })).toBe("live");
  expect(worstState({ live: "live", status: undefined, restartPhase: "idle" })).toBe("live");
  expect(isWarn("live")).toBe(false);
});

test("the worst state wins: offline, then restart, then backup, then spend", () => {
  const all = status({ restart_needed: "settings" }, { needs_attention: true }, { warn: true });
  expect(worstState({ live: "offline", status: all, restartPhase: "idle" })).toBe("offline");
  expect(worstState({ live: "live", status: all, restartPhase: "idle" })).toBe("restart");
  expect(worstState({ live: "live", status: status({}, { needs_attention: true }, { warn: true }), restartPhase: "idle" })).toBe("backup");
  expect(worstState({ live: "live", status: status({}, {}, { warn: true }), restartPhase: "idle" })).toBe("spend");
  expect(isWarn("offline") && isWarn("restart") && isWarn("backup") && isWarn("spend")).toBe(true);
});

test("a restart being asked about is a restart to finish (a warning), one under way says so, and only one that failed is a danger", () => {
  expect(worstState({ live: "live", status: status(), restartPhase: "asking" })).toBe("restart");
  expect(toneOf("restart")).toBe("warn");
  for (const phase of ["stuck", "refused"]) expect(worstState({ live: "live", status: status(), restartPhase: phase })).toBe("restart_failed");
  expect(toneOf("restart_failed")).toBe("danger");
  expect(alive({}, "asking")).toEqual({ kind: "restart", tone: "warn" });
  expect(alive({}, "stuck")).toEqual({ kind: "restart_failed", tone: "bad" });
  expect(alive({}, "refused")).toEqual({ kind: "restart_failed", tone: "bad" });
  expect(worstState({ live: "live", status: status(), restartPhase: "waiting" })).toBe("restarting");
  // Done is over: back to what is true now.
  expect(worstState({ live: "live", status: status(), restartPhase: "done" })).toBe("live");
});

test("before the stream connects the chip says it is connecting, not live", () => {
  expect(worstState({ live: "connecting", status: status(), restartPhase: "idle" })).toBe("connecting");
});

test("initials are up to two letters of the name", () => {
  expect(initials("Example Workspace")).toBe("EW");
  expect(initials("Casey Example")).toBe("CE");
  expect(initials("Casey Jordan Example")).toBe("CE");
  expect(initials("Cockpit")).toBe("C");
  expect(initials("  ")).toBe("");
  expect(initials("émile zola")).toBe("ÉZ");
});

test("work waiting for an internet connection is its own state: after offline, before a restart or a backup", () => {
  const waiting = { count: 2, since: "2026-10-13T14:05:00+00:00" };
  const all = status({ restart_needed: "settings", network_wait: waiting }, { needs_attention: true }, { warn: true });
  expect(worstState({ live: "live", status: all, restartPhase: "idle" })).toBe("network");
  expect(worstState({ live: "offline", status: all, restartPhase: "idle" })).toBe("offline");
  expect(worstState({ live: "live", status: status({ network_wait: null }), restartPhase: "idle" })).toBe("live");
  expect(isWarn("network")).toBe(true);
});

const alive = (over: Partial<S["Status"]> = {}, restartPhase = "idle", assistant: Partial<S["AssistantStatus"]> = {}) => {
  const base = status(over);
  return aliveState({ status: { ...base, assistant: { ...base.assistant, ...assistant } }, restartPhase });
};

test("the assistant's line is fine when nothing is wrong, whatever else the chip says", () => {
  expect(alive()).toEqual({ kind: "fine", tone: "ok" });
  expect(alive({}, "idle", { queued: 3 })).toEqual({ kind: "fine", tone: "ok" });
  expect(alive({ backup: { configured: true, last_success: null, age_hours: 100, needs_attention: true, last_error: null, encrypted: false } })).toEqual({ kind: "fine", tone: "ok" });
});

test("the assistant's line is amber for the states that hold its work up", () => {
  expect(alive({ network_wait: { count: 1, since: "2026-10-14T09:00:00" } })).toEqual({ kind: "network", tone: "warn" });
  expect(alive({ restart_needed: "A change needs a restart." })).toEqual({ kind: "restart", tone: "warn" });
  expect(alive({}, "waiting")).toEqual({ kind: "restarting", tone: "warn" });
  expect(alive({}, "idle", { paused: [{ account: "main", until: "2026-10-14T11:00:00+00:00" }] })).toEqual({ kind: "paused", tone: "warn" });
  expect(alive({ ai: { state: "not_set_up", detail: null } })).toEqual({ kind: "not_set_up", tone: "warn" });
});

test("the assistant's line is red when its account or its last run fails, ahead of the amber states", () => {
  expect(alive({ ai: { state: "failing", detail: null } })).toEqual({ kind: "failing", tone: "bad" });
  expect(alive({ network_wait: { count: 1, since: "2026-10-14T09:00:00" } }, "idle", { last_run_failed: true })).toEqual({ kind: "run_failed", tone: "bad" });
});

// A connection the assistant can't read is something to act on, so the header never says all is well while one is failing or
// trying again: it reads the connections' real state, the one the Connections screen and Today's line already show.
test("a connection that failed is a state of its own, a danger; one trying again is a warning; neither is all good", () => {
  const ok = { live: "live" as const, status: status(), restartPhase: "idle" };
  expect(worstState({ ...ok, connections: "failed" })).toBe("connection_failed");
  expect(worstState({ ...ok, connections: "retrying" })).toBe("connection_retrying");
  expect(worstState({ ...ok, connections: "ok" })).toBe("live");
  expect(isWarn("connection_failed") && isWarn("connection_retrying")).toBe(true);
  expect(toneOf("connection_failed")).toBe("danger");
  expect(toneOf("connection_retrying")).toBe("warn");
  expect(toneOf("live")).toBe("ok");
});

test("the connection states come after what holds the app up and before a backup", () => {
  const all = status({ restart_needed: "settings" }, { needs_attention: true }, { warn: true });
  expect(worstState({ live: "live", status: all, restartPhase: "idle", connections: "failed" })).toBe("restart");
  expect(worstState({ live: "live", status: status({}, { needs_attention: true }, { warn: true }), restartPhase: "idle", connections: "retrying" })).toBe("connection_retrying");
  expect(worstState({ live: "offline", status: status(), restartPhase: "idle", connections: "failed" })).toBe("offline");
  expect(toneOf("offline")).toBe("danger");
});

test("the connections' state: a failed read is failed; no network, or too long since a read, is retrying; read and pending are fine", () => {
  const src = (over: object) => ({ id: "a", label: "A", connector: "k", connector_label: "K", enabled: true, every_minutes: 15, items: 0, last: null, read_at: null, failures: 0, problem: null, ...over });
  const at = "2026-10-19T09:00:00Z";
  const outcome = (kind: string) => ({ outcome: kind, started_at: at, new: 0, changed: 0, removed: 0 });
  expect(connectionState(null)).toBe("ok");
  expect(connectionState({ enabled: 1, read: [src({})], last: null, unread: [], pending: [], stale: [], complete: true } as never)).toBe("ok");
  expect(connectionState({ enabled: 1, read: [], last: null, unread: [{ source: src({ last: outcome("failed") }), kind: "failed" }], pending: [], stale: [], complete: false } as never)).toBe("failed");
  expect(connectionState({ enabled: 1, read: [], last: null, unread: [{ source: src({ last: outcome("offline") }), kind: "offline" }], pending: [], stale: [], complete: false } as never)).toBe("retrying");
  expect(connectionState({ enabled: 1, read: [], last: null, unread: [], pending: [], stale: [src({ read_at: at, stale: true })], complete: false } as never)).toBe("retrying");
  expect(connectionState({ enabled: 1, read: [], last: null, unread: [], pending: [src({})], stale: [], complete: false } as never)).toBe("ok");
});
