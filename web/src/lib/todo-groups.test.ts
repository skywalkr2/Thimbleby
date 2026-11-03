import { dueToday, groupActions, groupOf, type OpenAction } from "./open-items";

const a = (id: string, over: Partial<OpenAction> = {}): OpenAction => ({ id, version: 1, text: id, state: "open", owners: [], due: null, project_name: "", since: "2026-01-01", to_send: false, needs_you: true, ...over }) as OpenAction;
const TODAY = "2026-10-27";

test("a to-do is overdue, waiting on someone else, due today or coming up, in that order of claim", () => {
  expect(groupOf(a("1", { state: "overdue", due: "2026-10-01" }), TODAY)).toBe("overdue");
  // Overdue claims it even when someone else has it.
  expect(groupOf(a("2", { state: "overdue", needs_you: false }), TODAY)).toBe("overdue");
  expect(groupOf(a("3", { needs_you: false, due: TODAY }), TODAY)).toBe("waiting");
  expect(groupOf(a("4", { due: TODAY }), TODAY)).toBe("today");
  expect(groupOf(a("5", { due: "2026-10-30" }), TODAY)).toBe("coming");
  expect(groupOf(a("6"), TODAY)).toBe("coming");
});

test("groups come in the list's order with the rows in the order they came in, and a group with none is left out", () => {
  const rows = [a("c1", { due: "2026-11-01" }), a("t1", { due: TODAY }), a("c2"), a("w1", { needs_you: false })];
  expect(groupActions(rows, TODAY).map((g) => [g.group, g.rows.map((r) => r.id)])).toEqual([
    ["today", ["t1"]],
    ["coming", ["c1", "c2"]],
    ["waiting", ["w1"]],
  ]);
  expect(groupActions([], TODAY)).toEqual([]);
});

test("those due today are counted without the overdue ones", () => {
  expect(dueToday([a("1", { due: TODAY }), a("2", { due: TODAY, state: "overdue" }), a("3", { due: "2026-10-28" })], TODAY)).toBe(1);
});
