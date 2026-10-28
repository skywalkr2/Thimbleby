import "@testing-library/jest-dom/vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
