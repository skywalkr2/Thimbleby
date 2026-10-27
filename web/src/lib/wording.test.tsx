import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { useWords, WordingProvider } from "./wording";

const wrap = (words: Record<string, string>) => ({ children }: { children: ReactNode }) => <WordingProvider overrides={words}>{children}</WordingProvider>;

test("a count of none reads an entry's zero form when it has one, else its plural", () => {
  const { result } = renderHook(() => useWords(), {
    wrapper: wrap({ "x.gap.zero": "No time between them", "x.gap.one": "Only {n} minute", "x.gap.other": "Only {n} minutes", "x.item.one": "{n} item", "x.item.other": "{n} items" }),
  });
  expect(result.current.tn("x.gap", 0)).toBe("No time between them");
  expect(result.current.tn("x.gap", 1)).toBe("Only 1 minute");
  expect(result.current.tn("x.gap", 12)).toBe("Only 12 minutes");
  expect(result.current.tn("x.item", 0)).toBe("0 items");
});

test("the sheet's travel lines say no time between them for none, never 'Only 0 minutes'", () => {
  const { result } = renderHook(() => useWords(), { wrapper: wrap({}) });
  const { tn } = result.current;
  const vars = { need: "20 minutes", from: "A", to: "B" };
  expect(tn("queue.clash.meta.travel", 0, vars)).toMatch(/^No time between them/);
  expect(tn("queue.clash.meta.travel_apart", 0, vars)).toMatch(/^No time between them/);
  expect(tn("brief.line.clash.travel", 0, { ...vars, text: "T", other: "O", date: "today", time: "9:00" })).toContain("No time between them");
  expect(tn("brief.line.clash.travel_apart", 0, { ...vars, text: "T", other: "O", date: "today", time: "9:00" })).toContain("No time between them");
  expect(tn("queue.clash.meta.travel", 5, vars)).toMatch(/^Only 5 minutes between them/);
});
