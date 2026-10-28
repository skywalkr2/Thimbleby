import type { S } from "./api";
import { changesOf, groupOf, itemsOf, notUsedInAWhile, sectionsOf, type Item } from "./knowledge";

const DAY = 86_400_000;
const NOW = new Date("2026-10-28T09:00:00Z");
const ago = (days: number) => new Date(NOW.getTime() - days * DAY).toISOString();
const WORKSPACE: S["Scope"] = { scope: "workspace", task_kinds: [], records: [], filter: {}, projects: [], people: [], except: [] };

function item(over: Partial<Item> = {}): Item {
  return {
    id: "LES-1",
    kind: "lesson",
    version: 1,
    text: "A lesson.",
    status: "active",
    learnedFrom: "person",
    untrusted: false,
    scope: WORKSPACE,
    used: 0,
    given: 0,
    lastUsed: null,
    learnedAt: ago(1),
    enforced: false,
    origin: null,
    constrains: [],
    term: "",
    meaning: "",
    ...over,
  };
}
const forTask = (...task_kinds: string[]): S["Scope"] => ({ ...WORKSPACE, task_kinds });

test("each kind and the kind of work it is limited to puts an item in one plain group", () => {
  expect(groupOf(item({ kind: "routing_entry" }))).toBe("who");
  expect(groupOf(item({ kind: "style_note" }))).toBe("write");
  for (const task of ["notes", "follow-on", "transcribe"]) expect(groupOf(item({ scope: forTask(task) })), task).toBe("filed");
  for (const task of ["reply", "monday-message", "ask", "meeting-prep", "action-work"]) expect(groupOf(item({ scope: forTask(task) })), task).toBe("write");
  // A kind of work no group names does not decide it.
  expect(groupOf(item({ scope: forTask("learn-correction") }))).toBe("facts");
});

test("a rule is placed by what it constrains, and a lesson about particular people is about who does what", () => {
  expect(groupOf(item({ kind: "rule", constrains: ["action.close", "owners"] }))).toBe("who");
  expect(groupOf(item({ kind: "rule", constrains: ["question.title"] }))).toBe("write");
  expect(groupOf(item({ kind: "rule", constrains: ["action.close"] }))).toBe("filed");
  expect(groupOf(item({ kind: "rule" }))).toBe("filed");
  expect(groupOf(item({ scope: { ...WORKSPACE, people: ["PER-1"] } }))).toBe("who");
  expect(groupOf(item())).toBe("facts");
  expect(groupOf(item({ kind: "glossary_entry" }))).toBe("other");
});

test("a proposal's change is its group, and a word for a glossary entry", () => {
  expect(changesOf(item({ kind: "glossary_entry" }))).toBe("words");
  expect(changesOf(item({ kind: "style_note" }))).toBe("write");
});

test("not used in a while: active and unused for the review's days, counted from when it was learned if never used; words never", () => {
  expect(notUsedInAWhile(item({ lastUsed: ago(40), used: 2 }), NOW, 30)).toBe(true);
  expect(notUsedInAWhile(item({ lastUsed: ago(5), used: 2, learnedAt: ago(90) }), NOW, 30)).toBe(false);
  expect(notUsedInAWhile(item({ learnedAt: ago(90) }), NOW, 30)).toBe(true);
  expect(notUsedInAWhile(item({ learnedAt: ago(3) }), NOW, 30)).toBe(false);
  expect(notUsedInAWhile(item({ learnedAt: ago(90), kind: "glossary_entry" }), NOW, 30)).toBe(false);
  expect(notUsedInAWhile(item({ learnedAt: ago(90), status: "proposed" }), NOW, 30)).toBe(false);
  // Until the window is known nothing is called stale.
  expect(notUsedInAWhile(item({ learnedAt: ago(90) }), NOW, undefined)).toBe(false);
});

test("every item is in exactly one section, newest first, and groups with nothing are left out", () => {
  const entry = (id: string, over: Partial<S["KnowledgeView"]>): S["KnowledgeView"] => ({
    id,
    kind: "lesson",
    version: 1,
    text: id,
    status: "active",
    learned_from: "person",
    trust: "trusted",
    learned_at: ago(2),
    applies_to: WORKSPACE,
    id_patterns: [],
    used: 1,
    given: 1,
    last_used: ago(1),
    ...over,
  });
  const all = itemsOf(
    [
      entry("LES-1", {}),
      entry("LES-2", { status: "proposed", learned_at: ago(1) }),
      entry("GLOSS-1", { kind: "glossary_entry", term: "gutter", meaning: "the inner margin" }),
      entry("LES-3", { status: "retired" }),
      entry("LES-4", { used: 0, last_used: undefined, learned_at: ago(90) }),
      entry("LES-5", { status: "discarded" }),
    ],
    [],
  );
  const sections = sectionsOf(all, NOW, 30);
  expect(sections.waiting.map((i) => i.id)).toEqual(["LES-2"]);
  expect(sections.follows.map((g) => [g.group, g.items.map((i) => i.id)])).toEqual([["facts", ["LES-1"]]]);
  expect(sections.words.map((i) => [i.id, i.term, i.meaning])).toEqual([["GLOSS-1", "gutter", "the inner margin"]]);
  expect(sections.idle.map((i) => i.id)).toEqual(["LES-4"]);
  expect(sections.retired.map((i) => i.id)).toEqual(["LES-3"]);
});
