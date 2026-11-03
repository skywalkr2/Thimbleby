// The fields of a core record that are the app's own bookkeeping, never something a person reads or types: where an input was
// kept, how it arrived, which run made a record, the ids a record is tied to. A record's page leaves them out of its details,
// and its "Edit details" form leaves them out of what it offers. A plugin's own kinds say for themselves what a person sees.

const set = (...names: string[]): ReadonlySet<string> => new Set(names);

/** What a page never lists as a detail, by kind of record. */
export const HIDDEN_DETAILS: Record<string, ReadonlySet<string>> = {
  source: set("content_hash", "kind", "watched", "trust", "reported", "audience"),
};

/** What the "Edit details" form never offers, by kind of record. */
export const HIDDEN_IN_FORM: Record<string, ReadonlySet<string>> = {
  question: set("filed_by", "batch", "held_for", "sent_at", "followed_up", "answer", "source", "options", "resolves", "raised_by", "matters_for", "dropped_reason", "asker", "event", "series", "projects", "kind", "links", "status"),
  fact: set("evidence", "filed_by", "trust", "key", "basis", "said_by", "event", "series", "supersedes", "source", "on_kind", "reaches_children", "about", "on", "remind_at"),
  event: set("key", "source", "evidence", "trust", "exceptions", "delivery", "plain", "people", "proposed_guests", "reminder", "alarm_minutes", "captured_at", "prep", "series", "response", "invitation", "organizer", "attendees", "cancelled"),
  note: set("question", "source", "filed_by", "trust"),
  rule: set("origin", "trust", "check", "applies_to", "constrains", "source", "evidence", "learned_at", "kept_by", "kept_at", "reviewed_at", "more_evidence", "discard_reason", "status"),
  series: set("source", "agenda", "evidence", "trust", "repeats"),
  team: set("members", "days_off"),
};

/** Whether a page lists a field of a record as a detail. */
export const shownAsDetail = (kind: string, field: string): boolean => !HIDDEN_DETAILS[kind]?.has(field);

/** Whether the form for a record's details offers a field. */
export const offeredInForm = (kind: string, field: string): boolean => !HIDDEN_IN_FORM[kind]?.has(field);
