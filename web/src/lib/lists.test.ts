import type { S } from "./api";
import { isProjectList, listsOn } from "./lists";

const list = (name: string, used_by: string[]): S["ValueListView"] => ({ id: name, name, label: name, values: [], retired: [], used_by });
const project = list("project-status", ["project.status"]);
const other = list("demo/stages", ["demo/chapter.stage"]);
const loose = list("loose", []);
const mixed = list("mixed", ["project.group", "demo/chapter.stage"]);
const all = [project, other, loose, mixed];

test("a project list is one that only project fields take their values from; a list nothing uses is not", () => {
  expect(all.map(isProjectList)).toEqual([true, false, false, false]);
});

test("with no side the Lists page holds every list, less the project lists under Just me, and the business page none", () => {
  expect(listsOn(all, "lists", { sides: false, justMe: false })).toEqual(all);
  expect(listsOn(all, "lists", { sides: false, justMe: true })).toEqual([other, loose, mixed]);
  expect(listsOn(all, "business", { sides: false, justMe: false })).toEqual([]);
});

test("with a side the business page holds the project lists and the Lists page the rest, so a list shows in one place only", () => {
  expect(listsOn(all, "business", { sides: true, justMe: false })).toEqual([project]);
  expect(listsOn(all, "lists", { sides: true, justMe: false })).toEqual([other, loose, mixed]);
});
