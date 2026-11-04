import "@testing-library/jest-dom/vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Button } from "./Button";
import { FilterChip } from "./FilterChip";
import { PageHeader } from "./PageHeader";
import { RoundCheck } from "./RoundCheck";
import { TabStrip } from "./TabStrip";

test("a header has the title as its one heading, with the kind beside it, one primary and the tabs and chips below", () => {
  render(
    <PageHeader
      id="t"
      title="People"
      kind={<span>Person</span>}
      subtitle="Nine people"
      crumb={<a href="#up">Back</a>}
      primary={<button type="button">Add a person</button>}
      tabs={<span>tabs</span>}
      filters={<span>chips</span>}
    />,
  );
  expect(screen.getAllByRole("heading")).toHaveLength(1);
  expect(screen.getByRole("heading", { level: 1, name: "People" })).toHaveAttribute("id", "t");
  expect(screen.getByText("Person")).toBeInTheDocument();
  expect(screen.getByText("Nine people")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Add a person" })).toBeInTheDocument();
  expect(screen.getByText("tabs")).toBeInTheDocument();
  expect(screen.getByText("chips")).toBeInTheDocument();
});

test("the heading's level can be lowered for a screen shown inside another, and it can take the cursor", () => {
  render(<PageHeader title="Follow-ups" level={3} focusable />);
  const heading = screen.getByRole("heading", { level: 3, name: "Follow-ups" });
  expect(heading).toHaveAttribute("tabindex", "-1");
});

test("a header with no tabs or chips draws no second row, and a group of actions can be named", () => {
  const { container } = render(<PageHeader title="Files" actionsLabel="File actions" actions={<button type="button">Scan</button>} />);
  expect(container.querySelector("[class*='bar']")).toBeNull();
  expect(screen.getByRole("group", { name: "File actions" })).toContainElement(screen.getByRole("button", { name: "Scan" }));
});

test("a tab strip says which tab is on and changes it with a press; the count is read with the name", async () => {
  const user = userEvent.setup();
  const change = vi.fn();
  render(
    <TabStrip
      label="Show"
      value="a"
      onChange={change}
      options={[
        { value: "a", label: "To-dos", count: 6 },
        { value: "b", label: "Questions", count: 0 },
      ]}
    />,
  );
  const group = screen.getByRole("group", { name: "Show" });
  expect(within(group).getByRole("button", { name: "To-dos 6" })).toHaveAttribute("aria-pressed", "true");
  await user.click(within(group).getByRole("button", { name: "Questions 0" }));
  expect(change).toHaveBeenCalledWith("b");
});

test("a filter chip is a native list named by its filter, and a choice calls back", async () => {
  const user = userEvent.setup();
  const change = vi.fn();
  render(
    <FilterChip
      label="Who"
      value=""
      onChange={change}
      options={[
        ["", "Everyone"],
        ["p1", "Robin"],
      ]}
    />,
  );
  const select = screen.getByRole("combobox", { name: /Who/ });
  expect(select).toHaveValue("");
  await user.selectOptions(select, "Robin");
  expect(change).toHaveBeenCalledWith("p1");
});

test("the round tick is a button with the action's name", async () => {
  const user = userEvent.setup();
  const run = vi.fn();
  render(<RoundCheck label="Mark done" onClick={run} />);
  await user.click(screen.getByRole("button", { name: "Mark done" }));
  expect(run).toHaveBeenCalledTimes(1);
});

// One content grid (VP01): a header, its tabs and chips, and the screen's lists share the content area's left and right edges, so the
// header adds no margin or padding of its own to either side. The title is the display face at the title size, 28px on a phone.
test("the header sits on the content area's edges: no side margin or padding, and the title takes the title size from the tokens", () => {
  const css = readFileSync(join(__dirname, "PageHeader.module.css"), "utf8");
  const header = /\.header \{[^}]*\}/s.exec(css)?.[0] ?? "";
  expect(header).not.toMatch(/(^|[^-])(margin|padding)(-inline|-left|-right)?:/);
  expect(css).toMatch(/h1\.title \{[^}]*font-family: var\(--font-display\); font-size: var\(--text-title\); line-height: var\(--lh-title\)/s);
  expect(css).toMatch(/@media \(max-width: 639\.98px\) \{ h1\.title \{ font-size: var\(--text-2xl\)/);
  const tokens = readFileSync(join(__dirname, "..", "theme", "tokens.css"), "utf8");
  expect(tokens).toMatch(/--text-title: 30px/);
  expect(tokens).toMatch(/--text-2xl: 28px/);
});

test("the one primary action is the last of the header's actions, and a tonal or outline button beside it is never counted as filled", () => {
  render(
    <PageHeader
      title="People"
      actions={<Button variant="tonal">Import</Button>}
      primary={<Button variant="primary">Add a person</Button>}
    />,
  );
  expect(document.querySelectorAll('[data-weight="filled"]')).toHaveLength(1);
  expect(screen.getByRole("button", { name: "Add a person" })).toHaveAttribute("data-weight", "filled");
  expect(screen.getByRole("button", { name: "Import" })).toHaveAttribute("data-weight", "tonal");
});

test("the way back is one shared control in the crumb's place, with a chevron and the page's own label, and it asks nothing but a press", async () => {
  const back = vi.fn();
  render(<PageHeader title="A page" back={{ label: "Back to Today", name: "Back to Today", onClick: back }} />);
  const control = screen.getByRole("button", { name: "Back to Today" });
  expect(control.closest("[data-back-link]")).not.toBeNull();
  expect(control.querySelector("[data-icon]")).not.toBeNull();
  await userEvent.setup().click(control);
  expect(back).toHaveBeenCalledTimes(1);
});

test("no screen draws its own bare Back in a header's crumb: the way back is the page header's `back`", () => {
  const dir = join(__dirname, "..", "components");
  const found: string[] = [];
  for (const name of readdirSync(dir)) {
    if (!/\.tsx$/.test(name) || /\.test\.tsx$/.test(name)) continue;
    const text = readFileSync(join(dir, name), "utf8");
    // A crumb that holds a button which goes back.
    if (/crumb=\{[^}]*onClick=\{props\.onBack\}/s.test(text)) found.push(name);
  }
  expect(found).toEqual([]);
});
