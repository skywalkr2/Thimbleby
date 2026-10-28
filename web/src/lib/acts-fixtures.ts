// Made-up acts for tests: a message to one person, with each part of the view a screen reads.
import type { Act, ActRecipient } from "./acts";

export function recipient(over: Partial<ActRecipient> = {}): ActRecipient {
  return { key: "PER-2", person: "PER-2", name: "Ana Example", address: "ana@example.com", role: "to", reasons: [], ...over };
}

export function actFixture(over: Partial<Act> = {}): Act {
  return {
    id: "XACT-1",
    version: 1,
    channel: "fake",
    channel_label: "Test channel",
    kind: "message",
    action: "send",
    acting: false,
    undoable: false,
    status: "draft",
    parts: { subject: "The proofs", body: "The proofs ship on Monday.\n\nThanks." },
    recipients: [recipient()],
    fingerprint: "fp-1",
    withheld: null,
    failure: null,
    why: [],
    changes_known: false,
    made_by: "assistant",
    sensitivity: "internal",
    ...over,
  };
}

/** What the server's list of acts answers for a request: only the states asked for (`status`, repeated) and at most `limit`, in the order given. */
export function actsAnswer(acts: Act[], query: URLSearchParams = new URLSearchParams()): { acts: Act[] } {
  const states = query.getAll("status");
  const limit = query.get("limit");
  const found = acts.filter((a) => states.length === 0 || states.includes(a.status));
  return { acts: limit ? found.slice(0, Number(limit)) : found };
}
