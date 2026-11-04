import "@testing-library/jest-dom/vitest";
import { screen } from "@testing-library/react";
import { renderApp } from "../test-utils";
import { ScheduleSkeleton } from "./ScheduleSkeleton";

test("the grids load as hour rows under a heading for each day, the month and the list as rows", () => {
  const { unmount } = renderApp(<ScheduleSkeleton view="grid" days={5} />);
  const grid = screen.getByRole("status");
  expect(grid).toHaveAttribute("data-skeleton", "grid");
  expect(grid).toHaveAttribute("aria-busy", "true");
  expect(grid.style.getPropertyValue("--cols")).toBe("5");
  expect(grid.querySelectorAll("span").length).toBeGreaterThan(5 + 8);
  unmount();
  renderApp(<ScheduleSkeleton view="list" days={5} />);
  expect(screen.getByRole("status")).toHaveAttribute("data-skeleton", "");
});
