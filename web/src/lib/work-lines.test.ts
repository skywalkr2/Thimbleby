import { describe, expect, test } from "vitest";
import { sideSummary, workLines } from "./work-lines";

describe("workLines", () => {
  test("one name to a line, blank lines dropped", () => {
    expect(workLines("First one\n\n  Second one  \nThird")).toEqual(["First one", "Second one", "Third"]);
  });

  test("a pasted list loses its bullets and numbers", () => {
    expect(workLines("- First one\n* Second one\n• Third one\n1. Fourth one\n2) Fifth one")).toEqual([
      "First one",
      "Second one",
      "Third one",
      "Fourth one",
      "Fifth one",
    ]);
  });

  test("a name given twice in any case is kept once, and inner spaces are squeezed", () => {
    expect(workLines("Spring  order\nspring order\r\nSpring Order\nAnother")).toEqual(["Spring order", "Another"]);
  });

  test("nothing typed is nothing", () => {
    expect(workLines("  \n \n")).toEqual([]);
  });
});

describe("sideSummary", () => {
  it("keeps a sentence as one tidy line and never splits it", () => {
    expect(sideSummary("  An independent   publishing\nimprint.  ")).toBe("An independent publishing imprint.");
  });

  it("is empty when nothing was written", () => {
    expect(sideSummary(" \n ")).toBe("");
  });
});
