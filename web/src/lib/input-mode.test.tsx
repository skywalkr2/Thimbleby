import "@testing-library/jest-dom/vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { installInputMode, resetInputMode, useKeyboardInput } from "./input-mode";

function Probe() {
  return <p>{useKeyboardInput() ? "keyboard" : "no keyboard"}</p>;
}

afterEach(() => act(() => resetInputMode()));

test("nothing is set until a key or a press, so a page that has had neither shows no ring", () => {
  installInputMode();
  render(<Probe />);
  expect(screen.getByText("no keyboard")).toBeInTheDocument();
  expect(document.documentElement).not.toHaveAttribute("data-input");
});

test("a key sets the keyboard mode on the page's root, and a press takes it back", async () => {
  const user = userEvent.setup();
  render(<Probe />);
  await user.keyboard("j");
  expect(document.documentElement).toHaveAttribute("data-input", "keyboard");
  expect(screen.getByText("keyboard")).toBeInTheDocument();
  await user.click(document.body);
  expect(document.documentElement).toHaveAttribute("data-input", "pointer");
  expect(screen.getByText("no keyboard")).toBeInTheDocument();
});

test("a modifier key alone is not typing", async () => {
  const user = userEvent.setup();
  render(<Probe />);
  await user.keyboard("{Shift}");
  expect(document.documentElement).not.toHaveAttribute("data-input");
});
