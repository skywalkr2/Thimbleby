import "@testing-library/jest-dom/vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render } from "@testing-library/react";
import { MarkDot, sideSlot } from "./MarkDot";

test("a mark is drawn for the eye only and says its kind and slot or color", () => {
  const { container } = render(
    <>
      <MarkDot kind="side" slot={3} />
      <MarkDot kind="calendar" color="teal" />
      <MarkDot kind="calendar" color={null} />
    </>,
  );
  const marks = container.querySelectorAll("[data-mark]");
  expect(marks).toHaveLength(3);
  for (const mark of marks) expect(mark).toHaveAttribute("aria-hidden", "true");
  expect(marks[0]).toHaveAttribute("data-color", "3");
  expect(marks[1]).toHaveAttribute("data-mark", "calendar");
  expect(marks[1]).toHaveAttribute("data-color", "teal");
  // A calendar with no color of its own is drawn gray, never left blank.
  expect(marks[2]).toHaveAttribute("data-color", "gray");
});

test("a side's slot follows its place in the person's list and wraps after five", () => {
  expect([0, 1, 4, 5, 6].map(sideSlot)).toEqual([1, 2, 5, 1, 2]);
});

test("every slot and named color has a rule that takes its color from the theme's tokens", () => {
  const css = readFileSync(join(__dirname, "MarkDot.module.css"), "utf8");
  for (const n of [1, 2, 3, 4, 5]) expect(css).toContain(`[data-color="${n}"] { background: var(--side-${n}); }`);
  for (const name of ["blue", "teal", "green", "orange", "red", "pink", "purple", "gray"]) expect(css).toContain(`[data-color="${name}"]`);
});
