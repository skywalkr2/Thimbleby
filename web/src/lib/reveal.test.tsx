import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { useState } from "react";
import { vi } from "vitest";
import { reveal, revealOrKeep, useReveal } from "./reveal";

// A list that holds the row asked for opens it; a request made before the list had its rows is kept for a short while.

function Screen(props: { rows: string[] }) {
  const [open, setOpen] = useState("");
  useReveal("question", (id) => {
    if (!props.rows.includes(id)) return false;
    setOpen(id);
    return true;
  });
  return <p>{open ? `opened ${open}` : "nothing opened"}</p>;
}

afterEach(() => vi.useRealTimers());

test("a list that holds the row opens it when asked, and says so", () => {
  render(<Screen rows={["Q-1"]} />);
  expect(reveal("question", "Q-1")).toBe(true);
  expect(reveal("question", "Q-9")).toBe(false);
});

test("a request kept for a screen that mounts before its rows have loaded opens the row once they have", () => {
  expect(revealOrKeep("question", "Q-2")).toBe(false);
  const view = render(<Screen rows={[]} />);
  expect(screen.getByText("nothing opened")).toBeInTheDocument();
  view.rerender(<Screen rows={["Q-2"]} />);
  expect(screen.getByText("opened Q-2")).toBeInTheDocument();
});

test("a kept request that the rows never answer is dropped after a while, and does not open a row that arrives much later", () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-26T09:00:00Z"));
  expect(revealOrKeep("question", "Q-3")).toBe(false);
  const view = render(<Screen rows={[]} />);
  vi.setSystemTime(new Date("2026-10-26T09:01:00Z"));
  view.rerender(<Screen rows={["Q-3"]} />);
  expect(screen.getByText("nothing opened")).toBeInTheDocument();
});
