import "@testing-library/jest-dom/vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderApp } from "../test-utils";
import { CheckboxGroup } from "./CheckboxGroup";
import { DateField } from "./DateField";
import { FileDrop } from "./FileDrop";
import { FormBlock } from "./FormBlock";
import { FormField } from "./FormField";
import { Select } from "./Select";

test("a field names its control, says Optional as a tag and wires its help line", () => {
  renderApp(
    <FormField id="f-name" label="Name" hint="As on the door" optional>
      <input id="f-name" aria-describedby="f-name-hint" />
    </FormField>,
  );
  const input = screen.getByLabelText(/^Name/);
  expect(input).toHaveAccessibleDescription("As on the door");
  const tag = screen.getByText("Optional");
  expect(tag).toHaveAttribute("data-tag");
  // The tag is part of the label, not a second field.
  expect(tag.closest("label")).toHaveTextContent("Name");
});

test("a field with no id of its own makes one and hands it to its control", () => {
  renderApp(<FormField label="Day">{(id) => <input id={id} />}</FormField>);
  expect(screen.getByLabelText("Day")).toBeInTheDocument();
});

test("a label can be kept for screen readers only", () => {
  renderApp(
    <FormField id="s" label="Search" labelHidden>
      <input id="s" />
    </FormField>,
  );
  expect(screen.getByText("Search")).toHaveClass("sr");
  expect(screen.getByLabelText("Search")).toBeInTheDocument();
});

test("a part of a form with no control of its own keeps the field's data hook", () => {
  const { container } = renderApp(<FormBlock as="section" aria-label="Part">text</FormBlock>);
  expect(container.querySelector("section[data-field]")).not.toBeNull();
});

test("a select is the native list, marked as the shared one, and its choice is read and changed as one", async () => {
  const seen: string[] = [];
  renderApp(
    <FormField id="pick" label="Account">
      <Select id="pick" defaultValue="b" onChange={(e) => seen.push(e.target.value)}>
        <option value="a">Alpha</option>
        <option value="b">Beta</option>
      </Select>
    </FormField>,
  );
  const select = screen.getByRole("combobox", { name: "Account" });
  expect(select).toHaveAttribute("data-ui", "select");
  expect(select).toHaveValue("b");
  await userEvent.selectOptions(select, "a");
  expect(seen).toEqual(["a"]);
});

test("a disabled select stays a select and says nothing by opacity", () => {
  renderApp(
    <Select aria-label="Locked" disabled>
      <option>One</option>
    </Select>,
  );
  expect(screen.getByRole("combobox", { name: "Locked" })).toBeDisabled();
});

test("a date field is a date, a time or a date with a time, marked as the shared control", () => {
  const { container } = renderApp(
    <>
      <DateField aria-label="Day" defaultValue="2026-10-28" />
      <DateField aria-label="Start" kind="time" />
      <DateField aria-label="When" kind="datetime-local" />
    </>,
  );
  expect(screen.getByLabelText("Day")).toHaveAttribute("type", "date");
  expect(screen.getByLabelText("Start")).toHaveAttribute("type", "time");
  expect(screen.getByLabelText("When")).toHaveAttribute("type", "datetime-local");
  expect(container.querySelectorAll('[data-ui="date"]')).toHaveLength(3);
});

test("a file drop holds the real file input, says what to do, then names the chosen file", async () => {
  const { container } = renderApp(
    <FormField id="up" label="File">
      <FileDrop id="up" />
    </FormField>,
  );
  const zone = container.querySelector('[data-ui="file"]')!;
  expect(zone).toHaveTextContent("Choose a file");
  const input = screen.getByLabelText("File") as HTMLInputElement;
  expect(input).toHaveAttribute("type", "file");
  await userEvent.upload(input, new File(["x"], "plan.pdf", { type: "application/pdf" }));
  expect(zone).toHaveTextContent("plan.pdf");
  expect(zone).toHaveAttribute("data-chosen");
});

test("a checkbox group is a group named by its legend, with a hint and no frame of its own", () => {
  renderApp(
    <CheckboxGroup legend="Who can see it" hint="Pick any">
      <label>
        <input type="checkbox" /> Me
      </label>
    </CheckboxGroup>,
  );
  const group = screen.getByRole("group", { name: "Who can see it" });
  expect(group).toHaveAttribute("data-ui", "group");
  expect(screen.getByText("Pick any")).toBeInTheDocument();
});

test("a checkbox group can keep its legend for screen readers only", () => {
  renderApp(
    <CheckboxGroup legend="Where" legendHidden>
      <input type="radio" aria-label="Here" />
    </CheckboxGroup>,
  );
  expect(screen.getByText("Where")).toHaveClass("sr");
  expect(screen.getByRole("group", { name: "Where" })).toBeInTheDocument();
});
