import "@testing-library/jest-dom/vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import { GroupLabel } from "./GroupLabel";

test("a group label is a heading of its words, with the count drawn for the eye and left out of the heading's name", () => {
  render(<GroupLabel count={6}>Decide</GroupLabel>);
  const heading = screen.getByRole("heading", { level: 3, name: "Decide" });
  expect(heading).toHaveAttribute("data-group-label");
  expect(heading.querySelector("[data-group-count]")).toHaveTextContent("6");
  expect(heading.querySelector("[data-group-count]")).toHaveAttribute("aria-hidden", "true");
});

test("no count pill is drawn for zero or none, the level and the element can be chosen, and a late group says so in its tone", () => {
  const { rerender } = render(<GroupLabel count={0}>Empty</GroupLabel>);
  expect(document.querySelector("[data-group-count]")).toBeNull();
  rerender(
    <GroupLabel as="h2" tone="danger" count={2}>
      Overdue
    </GroupLabel>,
  );
  expect(screen.getByRole("heading", { level: 2, name: "Overdue" })).toHaveAttribute("data-tone", "danger");
  rerender(<GroupLabel as="span">Work</GroupLabel>);
  expect(screen.getByText("Work").closest("[data-group-label]")?.tagName).toBe("SPAN");
});

// The one place uppercase is allowed (the web build's style rules refuse it elsewhere): 11px, spaced, muted, with the count in a pill.
test("the label is 11px uppercase with letter spacing and a count pill, from the type tokens", () => {
  const css = readFileSync(join(__dirname, "GroupLabel.module.css"), "utf8");
  const tokens = readFileSync(join(__dirname, "..", "theme", "tokens.css"), "utf8");
  expect(tokens).toMatch(/--text-label: 11px/);
  expect(tokens).toMatch(/--tracking-label: 0\.08em/);
  const label = /\.label \{[^}]*\}/s.exec(css)?.[0] ?? "";
  expect(label).toContain("font-size: var(--text-label)");
  expect(label).toContain("text-transform: uppercase");
  expect(label).toContain("letter-spacing: var(--tracking-label)");
  expect(label).toContain("color: var(--text-muted)");
  const count = /\.count \{[^}]*\}/s.exec(css)?.[0] ?? "";
  expect(count).toContain("border-radius: var(--radius-full)");
  expect(count).toContain("text-transform: none");
});
