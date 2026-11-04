import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Button, ButtonLink } from "./Button";
import { IconButton } from "./IconButton";

test("a button runs its action, and the variants are marked", async () => {
  const user = userEvent.setup();
  const onClick = vi.fn();
  render(
    <Button variant="primary" onClick={onClick}>
      Save
    </Button>,
  );
  const button = screen.getByRole("button", { name: "Save" });
  expect(button).toHaveAttribute("data-variant", "primary");
  expect(button).toHaveAttribute("type", "button");
  await user.click(button);
  expect(onClick).toHaveBeenCalledTimes(1);
});

test("a disabled button shows its reason and points to it", async () => {
  const user = userEvent.setup();
  const onClick = vi.fn();
  render(
    <Button disabled reason="Pick a person first" onClick={onClick}>
      Send
    </Button>,
  );
  const button = screen.getByRole("button", { name: "Send" });
  expect(button).toBeDisabled();
  expect(screen.getByText("Pick a person first")).toBeVisible();
  expect(button).toHaveAccessibleDescription("Pick a person first");
  await user.click(button);
  expect(onClick).not.toHaveBeenCalled();
});

test("the reason is only shown while the button is disabled", () => {
  render(<Button reason="Pick a person first">Send</Button>);
  expect(screen.queryByText("Pick a person first")).toBeNull();
  expect(screen.getByRole("button", { name: "Send" })).not.toHaveAttribute("aria-describedby");
});

test("a loading button keeps its label, is busy and does nothing", async () => {
  const user = userEvent.setup();
  const onClick = vi.fn();
  render(
    <Button loading icon="send" onClick={onClick}>
      Sending
    </Button>,
  );
  const button = screen.getByRole("button", { name: "Sending" });
  expect(button).toHaveAttribute("aria-busy", "true");
  expect(button.querySelector("[data-icon]")).toBeNull();
  await user.click(button);
  expect(onClick).not.toHaveBeenCalled();
});

test("an icon shows beside the label, and the sizes are small or medium", () => {
  render(
    <Button icon="plus" size="sm">
      Add
    </Button>,
  );
  expect(screen.getByRole("button", { name: "Add" }).querySelector('[data-icon="plus"]')).not.toBeNull();
});

test("an icon-only button is named by its label and runs when pressed", async () => {
  const user = userEvent.setup();
  const onPress = vi.fn();
  render(<IconButton icon="close" label="Close the panel" onPress={onPress} />);
  const button = screen.getByRole("button", { name: "Close the panel" });
  await user.click(button);
  expect(onPress).toHaveBeenCalledTimes(1);
});

test("an icon-only button shows its label as a tooltip on focus", async () => {
  const user = userEvent.setup();
  render(<IconButton icon="help" label="Help" />);
  await user.tab();
  expect(await screen.findByRole("tooltip")).toHaveTextContent("Help");
});

test("the three weights are primary, secondary and quiet, and a link can be drawn as a button", () => {
  render(
    <>
      <Button variant="primary">Go</Button>
      <Button>Other</Button>
      <Button variant="quiet">Skip</Button>
      <ButtonLink href="#there" variant="primary">
        Open
      </ButtonLink>
    </>,
  );
  expect(screen.getByRole("button", { name: "Go" })).toHaveAttribute("data-variant", "primary");
  expect(screen.getByRole("button", { name: "Other" })).toHaveAttribute("data-variant", "secondary");
  expect(screen.getByRole("button", { name: "Skip" })).toHaveAttribute("data-variant", "quiet");
  const link = screen.getByRole("link", { name: "Open" });
  expect(link).toHaveAttribute("href", "#there");
  expect(link).toHaveAttribute("data-variant", "primary");
});

test("a disabled primary keeps its weight and its reason sits beside it, in the same group", () => {
  render(
    <Button variant="primary" disabled reason="Pick a person first">
      Send
    </Button>,
  );
  const button = screen.getByRole("button", { name: "Send" });
  expect(button).toHaveAttribute("data-variant", "primary");
  expect(button.parentElement).toContainElement(screen.getByText("Pick a person first"));
  expect(button.nextElementSibling).toBe(screen.getByText("Pick a person first"));
});

// Three weights as pills (design 7.12): filled, tonal and plain, with the outline as the bordered default. Each button names the weight
// it is drawn in, so a browser test can count the filled ones in view (at most one a screen).
test("every variant names the weight it is drawn in: primary and danger are filled, tonal is soft, quiet is plain, the default is the outline", () => {
  render(
    <>
      <Button variant="primary">Filled</Button>
      <Button variant="danger">Remove</Button>
      <Button variant="tonal">Soft</Button>
      <Button variant="quiet">Plain</Button>
      <Button>Outline</Button>
      <ButtonLink variant="tonal" href="#x">
        Soft link
      </ButtonLink>
    </>,
  );
  const weight = (name: string) => screen.getByRole(name === "Soft link" ? "link" : "button", { name }).getAttribute("data-weight");
  expect(weight("Filled")).toBe("filled");
  expect(weight("Remove")).toBe("filled");
  expect(weight("Soft")).toBe("tonal");
  expect(weight("Plain")).toBe("plain");
  expect(weight("Outline")).toBe("outline");
  expect(weight("Soft link")).toBe("tonal");
});

test("the weights are drawn as pills in the style sheet: filled solid, tonal the soft accent with no border, plain text", () => {
  const css = readFileSync(join(__dirname, "Button.module.css"), "utf8");
  expect(css).toMatch(/\.btn \{[^}]*border-radius: var\(--radius-btn\)/s);
  expect(css).toMatch(/\.primary \{[^}]*background: var\(--accent\)/);
  expect(css).toMatch(/\.tonal \{[^}]*background: var\(--accent-soft\); border-color: transparent; color: var\(--accent-text\)/);
  expect(css).toMatch(/\.quiet \{[^}]*background: transparent/);
  expect(readFileSync(join(__dirname, "..", "theme", "tokens.css"), "utf8")).toMatch(/--radius-btn: var\(--radius-full\)/);
});

test("a disabled primary reads as disabled: a sunken fill, a firm edge and the subtle text, never the tonal weight's soft accent", async () => {
  const { readFileSync } = await import("node:fs");
  const { join } = await import("node:path");
  const css = readFileSync(join(__dirname, "Button.module.css"), "utf8");
  const rule = css.match(/\.primary:disabled, \.primary:disabled:hover \{([^}]*)\}/)![1];
  expect(rule).toMatch(/background: var\(--surface-sunk\)/);
  expect(rule).toMatch(/border-color: var\(--border-strong\)/);
  expect(rule).toMatch(/color: var\(--text-subtle\)/);
  expect(rule).not.toMatch(/accent-soft/);
});
