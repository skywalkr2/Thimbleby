// The helpers that group add-ons by the release file they come in, and read names as a heading.
import { groupByFile, listOf } from "./packs";

describe("entries that share a file", () => {
  test("groupByFile joins entries with the same file at the place the file first appears, and keeps each one's index", () => {
    const items = [{ id: "a", file: "x" }, { id: "solo" }, { id: "b", file: "x" }, { id: "c", file: "y" }, { id: "d", file: null }];
    expect(groupByFile(items).map((group) => group.map((slot) => `${slot.item.id}:${slot.index}`))).toEqual([
      ["a:0", "b:2"],
      ["solo:1"],
      ["c:3"],
      ["d:4"],
    ]);
  });

  test("listOf reads as a heading", () => {
    expect(listOf([])).toBe("");
    expect(listOf(["A"])).toBe("A");
    expect(listOf(["A", "B"])).toBe("A and B");
    expect(listOf(["A", "B", "C"], "and")).toBe("A, B and C");
  });
});
