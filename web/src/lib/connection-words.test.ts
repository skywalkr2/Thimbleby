import type { S } from "./api";
import { agoWords, partStatus } from "./connection-words";

type Source = S["WatchSourceView"];
const words: Record<string, string> = {
  "connection.ago.now": "just now",
  "connection.ago.minutes": "{n} min ago",
  "connection.ago.hours.one": "{n} hour ago",
  "connection.ago.hours.other": "{n} hours ago",
  "connection.part.read": "Read {ago}",
  "connection.part.not_read_since": "Not read since {when}",
  "connection.part.not_read": "Not read yet",
  "sources.off": "Off",
  "sources.never": "Not read yet",
  "sources.status.offline": "Offline",
  "sources.status.waiting": "Waiting",
  "coverage.yesterday": "yesterday {time}",
};
const t = (key: string, vars: Record<string, string | number> = {}) => (words[key] ?? key).replace(/\{(\w+)\}/g, (_, n: string) => String(vars[n] ?? ""));
const tn = (key: string, n: number, vars: Record<string, string | number> = {}) => t(`${key}.${n === 1 ? "one" : "other"}`, { n, ...vars });
const NOW = new Date("2026-11-03T12:00:00Z");
const source = (over: Partial<Source> = {}): Source =>
  ({ id: "a", label: "A", connector: "k", connector_label: "K", enabled: true, every_minutes: 15, items: 0, last: { outcome: "ok", started_at: "2026-11-03T11:58:00Z", new: 0, changed: 0, removed: 0 }, read_at: "2026-11-03T11:58:00Z", failures: 0, problem: null, ...over }) as Source;

test("how long ago is minutes, then hours, and a day and clock beyond that", () => {
  expect(agoWords("2026-11-03T11:59:40Z", NOW, t, tn)).toBe("just now");
  expect(agoWords("2026-11-03T11:58:00Z", NOW, t, tn)).toBe("2 min ago");
  expect(agoWords("2026-11-03T11:00:00Z", NOW, t, tn)).toBe("1 hour ago");
  expect(agoWords("2026-11-03T08:00:00Z", NOW, t, tn)).toBe("4 hours ago");
  expect(agoWords("not a time", NOW, t, tn)).toBe("");
});

test("a connection that is being read says Read and how long ago", () => {
  expect(partStatus(source(), t, tn, NOW)).toEqual({ text: "Read 2 min ago", tone: "ok" });
});

test("a connection that is not being read says Not read since, never Read, whatever its last read said", () => {
  const read = "2026-11-03T10:51:00Z";
  const refused = partStatus(source({ account_state: "expired", read_at: read }), t, tn, NOW);
  expect(refused.tone).toBe("danger");
  expect(refused.text).toMatch(/^Not read since /);
  expect(partStatus(source({ account_state: "signed_out", read_at: read }), t, tn, NOW).tone).toBe("warn");
  expect(partStatus(source({ account_state: "expired", read_at: null }), t, tn, NOW).text).toBe("Not read yet");
  expect(partStatus(source({ last: { outcome: "failed", started_at: read, new: 0, changed: 0, removed: 0 }, read_at: read }), t, tn, NOW).text).toMatch(/^Not read since /);
});

test("off, never read, offline and waiting each have words of their own", () => {
  expect(partStatus(source({ enabled: false }), t, tn, NOW)).toEqual({ text: "Off", tone: "neutral" });
  expect(partStatus(source({ last: null, read_at: null }), t, tn, NOW)).toEqual({ text: "Not read yet", tone: "neutral" });
  expect(partStatus(source({ last: { outcome: "offline", started_at: "2026-11-03T11:00:00Z", new: 0, changed: 0, removed: 0 } }), t, tn, NOW)).toEqual({ text: "Offline", tone: "warn" });
  expect(partStatus(source({ last: { outcome: "throttled", started_at: "2026-11-03T11:00:00Z", new: 0, changed: 0, removed: 0 } }), t, tn, NOW)).toEqual({ text: "Waiting", tone: "warn" });
});
