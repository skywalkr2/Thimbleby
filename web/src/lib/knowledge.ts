// What the Knowledge screen shows of an entry or a rule (design 7.18): one shape for both, and the plain words for where it
// came from, what it reaches and how much it was used. No text is built here that the wording sheet could say.
import type { S } from "./api";
import type { useWords } from "./wording";

type T = ReturnType<typeof useWords>;

export const KINDS = ["rule", "lesson", "glossary_entry", "routing_entry", "style_note"] as const;
export type Kind = (typeof KINDS)[number];
export type Status = S["KnowledgeView"]["status"];

/** The plain-word groups of what is in use. `other` holds what nothing says a group for, so nothing is put in a wrong one. */
export const GROUPS = ["filed", "who", "write", "facts", "other"] as const;
export type Group = (typeof GROUPS)[number];

/** An entry or a rule, in one shape. */
export interface Item {
  id: string;
  kind: Kind;
  version: number;
  text: string;
  status: Status;
  learnedFrom: S["KnowledgeView"]["learned_from"] | S["RuleView"]["learned_from"];
  untrusted: boolean;
  scope: S["Scope"];
  used: number;
  given: number;
  lastUsed: string | null;
  learnedAt: string;
  /** A code check enforces the rule, so it holds whether or not anything triggers it. */
  enforced: boolean;
  origin: S["Origin"] | null;
  /** What a rule is about: op kinds or fields. Empty for an entry. */
  constrains: string[];
  /** A glossary entry's word and what it means; empty for the others. */
  term: string;
  meaning: string;
}

/** Every entry and rule as items, newest first. */
export function itemsOf(entries: S["KnowledgeView"][], rules: S["RuleView"][]): Item[] {
  const found: Item[] = [
    ...entries.map((e) => ({
      id: e.id,
      kind: e.kind,
      version: e.version,
      text: e.text,
      status: e.status,
      learnedFrom: e.learned_from,
      untrusted: e.trust === "untrusted",
      scope: e.applies_to,
      used: e.used ?? 0,
      given: e.given ?? 0,
      lastUsed: e.last_used ?? null,
      learnedAt: e.learned_at,
      enforced: false,
      origin: e.origin ?? null,
      constrains: [],
      term: e.term ?? "",
      meaning: e.meaning ?? "",
    })),
    ...rules.map((r) => ({
      id: r.id,
      kind: "rule" as const,
      version: r.version,
      text: r.text || r.name,
      status: r.status,
      learnedFrom: r.learned_from,
      untrusted: r.trust === "untrusted",
      scope: r.applies_to,
      used: r.used ?? 0,
      given: r.given ?? 0,
      lastUsed: r.last_used ?? null,
      learnedAt: r.learned_at ?? "",
      enforced: r.enforced,
      origin: r.origin ?? null,
      constrains: r.constrains ?? [],
      term: "",
      meaning: "",
    })),
  ];
  return found.sort((a, b) => (a.learnedAt === b.learnedAt ? b.id.localeCompare(a.id) : a.learnedAt < b.learnedAt ? 1 : -1));
}

/** Which kind of work a rule or lesson is limited to decides its group; one place for all of it. */
const GROUP_OF_TASK: Record<string, Group> = {
  notes: "filed",
  "follow-on": "filed",
  transcribe: "filed",
  reply: "write",
  "monday-message": "write",
  ask: "write",
  "meeting-prep": "write",
  "action-work": "write",
};

/**
 * The group an item of what the assistant follows belongs to, in plain words:
 * - who does what: a routing entry; or anything about particular people, or a rule that constrains an owner;
 * - how to write for you: a style note; or anything limited to the work of writing (a reply, the Monday message, an
 *   answer, meeting preparation, work on a to-do); or a rule that constrains wording;
 * - how things are filed: anything limited to filing notes, turning a voice note into text or checking what a move
 *   changes; or any other standing rule;
 * - facts it knows: a lesson that says something about the work and is limited to nothing else;
 * - other: only when nothing above applies.
 */
export function groupOf(item: Pick<Item, "kind" | "scope" | "constrains">): Group {
  if (item.kind === "routing_entry") return "who";
  if (item.kind === "style_note") return "write";
  for (const task of item.scope.task_kinds ?? []) if (task in GROUP_OF_TASK) return GROUP_OF_TASK[task];
  if (item.constrains.some((c) => /owner|assign|\bto\b|person|team/i.test(c))) return "who";
  if (item.constrains.some((c) => /title|text|message|wording|summary|question|reply/i.test(c))) return "write";
  if ((item.scope.people ?? []).length) return "who";
  if (item.kind === "rule") return "filed";
  return item.kind === "lesson" ? "facts" : "other";
}

/** What a proposal changes, for its line: its group, or "words" for a glossary entry. */
export function changesOf(item: Item): Group | "words" {
  return item.kind === "glossary_entry" ? "words" : groupOf(item);
}

/** Active and not used for `days` days (never used counts from when it was learned). Words are never stale. */
export function notUsedInAWhile(item: Item, now: Date, days: number | undefined): boolean {
  if (item.status !== "active" || item.kind === "glossary_entry" || days === undefined) return false;
  const since = item.lastUsed ?? item.learnedAt;
  if (!since) return false;
  return now.getTime() - new Date(since).getTime() > days * 86_400_000;
}

export interface Sections {
  /** Proposed, waiting for the person. */
  waiting: Item[];
  /** Active and used lately, by group, in the order of GROUPS; a group with nothing is left out. */
  follows: { group: Group; items: Item[] }[];
  /** The person's words: active glossary entries. */
  words: Item[];
  /** Active but not used in a while. */
  idle: Item[];
  /** Retired. */
  retired: Item[];
}

/** Every item in the one section it belongs to; `items` is newest first and each section keeps that order. */
export function sectionsOf(items: Item[], now: Date, days: number | undefined): Sections {
  const waiting = items.filter((i) => i.status === "proposed");
  const words = items.filter((i) => i.status === "active" && i.kind === "glossary_entry");
  const idle = items.filter((i) => notUsedInAWhile(i, now, days));
  const lately = items.filter((i) => i.status === "active" && i.kind !== "glossary_entry" && !idle.includes(i));
  const follows = GROUPS.map((group) => ({ group, items: lately.filter((i) => groupOf(i) === group) })).filter((g) => g.items.length > 0);
  return { waiting, follows, words, idle, retired: items.filter((i) => i.status === "retired") };
}

/** "today", "yesterday", "3 days ago" or "2 months ago". */
export function agoWords(iso: string, now: Date, { t }: T): string {
  const days = Math.max(0, Math.floor((now.getTime() - new Date(iso).getTime()) / 86_400_000));
  if (days === 0) return t("knowledge.ago.today");
  if (days === 1) return t("knowledge.ago.yesterday");
  if (days < 60) return t("knowledge.ago.days", { n: days });
  return t("knowledge.ago.months", { n: Math.floor(days / 30) });
}

/** "Used 12 times · last 2 days ago", or "Never used". */
export function usedWords(item: Pick<Item, "used" | "lastUsed">, now: Date, words: T): string {
  if (item.used === 0) return words.t("knowledge.never_used");
  return words.tn("knowledge.used", item.used, { when: item.lastUsed ? agoWords(item.lastUsed, now, words) : words.t("knowledge.ago.unknown") });
}

const list = (names: string[]) => names.join(", ");

/** What an item reaches, in words: "All projects except Apollo, Borealis", "Only Apollo", plus the kinds of work and the
 * people it is limited to. */
export function reachWords(
  scope: S["Scope"],
  names: { projects: Map<string, string>; people: Map<string, string> },
  words: T,
): string {
  const { t, has } = words;
  const project = (id: string) => names.projects.get(id) ?? t("knowledge.reach.removed_project");
  const parts: string[] = [];
  if (scope.scope === "projects") parts.push(t("knowledge.reach.only", { names: list((scope.projects ?? []).map(project)) }));
  else if ((scope.except ?? []).length) parts.push(t("knowledge.reach.except", { names: list((scope.except ?? []).map(project)) }));
  else parts.push(t("knowledge.reach.all"));
  if ((scope.task_kinds ?? []).length) {
    const work = (scope.task_kinds ?? []).map((k) => (has(`task.${k}`) ? t(`task.${k}`) : t("task.other")));
    parts.push(t("knowledge.reach.work", { names: list([...new Set(work)]) }));
  }
  if ((scope.people ?? []).length) {
    parts.push(t("knowledge.reach.people", { names: list((scope.people ?? []).map((p) => names.people.get(p) ?? t("knowledge.reach.removed_person"))) }));
  }
  if ((scope.records ?? []).length) parts.push(t("knowledge.reach.records"));
  return parts.join(" · ");
}
