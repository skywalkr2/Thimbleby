import "@testing-library/jest-dom/vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Actions } from "./Actions";
import { DetailTop } from "./DetailTop";
import { Item, ItemList } from "./ItemList";
import { ExpandableRow, Row, RowItem } from "./Row";
import { RowBody } from "./RowBody";
import { DetailItem, RowList } from "./RowList";
import { SectionRow } from "./SectionRow";

test("an expandable row's title is a button that says whether its body is open and what it controls", async () => {
  const toggled: boolean[] = [];
  function Harness() {
    return (
      <ul>
        <ExpandableRow
          pill={<span>Waiting</span>}
          title="Cover files"
          titleId="t-1"
          aria-labelledby="t-1"
          meta="2 things to send"
          expand={{ expanded: false, controls: "b-1", onToggle: () => toggled.push(true) }}
          menu={<button type="button">More</button>}
        />
      </ul>
    );
  }
  render(<Harness />);
  const button = screen.getByRole("button", { name: "Cover files" });
  expect(button).toHaveAttribute("aria-expanded", "false");
  expect(button).toHaveAttribute("aria-controls", "b-1");
  expect(button).toHaveAttribute("data-expander");
  // The state and the meta are on the row, beside the title, not part of the button's name.
  const row = screen.getByRole("listitem");
  expect(within(row).getByText("Waiting")).toBeInTheDocument();
  expect(within(row).getByText("2 things to send")).toBeInTheDocument();
  expect(row).toHaveAccessibleName("Cover files");
  await userEvent.click(button);
  expect(toggled).toEqual([true]);
});

test("a title that is already chosen is inert: it neither looks nor feels clickable", () => {
  render(
    <ul>
      <ExpandableRow title="Chosen" expand={{ expanded: true, inert: true, onToggle: () => undefined }} />
    </ul>,
  );
  expect(screen.getByRole("button", { name: "Chosen" })).toHaveAttribute("data-inert");
});

test("a row can have several meta lines, one each, and leaves out the empty ones", () => {
  const { container } = render(
    <ul>
      <Row title="One" metaLines={["First line", "", null, "Third line"]} />
    </ul>,
  );
  expect(container.querySelectorAll("p")).toHaveLength(2);
  expect(screen.getByText("Third line")).toBeInTheDocument();
});

test("a row takes its cursor look from the attributes of its list's row, and is not a stop of the loop when asked", () => {
  const { rerender } = render(
    <ul>
      <Row title="Mine" aria-current="true" />
    </ul>,
  );
  expect(screen.getByRole("listitem")).toHaveAttribute("data-selected");
  rerender(
    <ul>
      <Row title="Heading" loop={false} />
    </ul>,
  );
  expect(screen.getByRole("listitem")).not.toHaveAttribute("data-row");
});

test("a row's extra content is under it, and a body runs the full width", () => {
  render(
    <ul>
      <Row title="Open row">
        <RowBody id="b-1">
          <p>Inside the body</p>
        </RowBody>
      </Row>
    </ul>,
  );
  expect(screen.getByText("Inside the body").closest("[data-row-body]")).toHaveAttribute("id", "b-1");
});

test("a list of rows is one list, and in a pane it has no frame of its own", () => {
  const { container } = render(
    <>
      <RowList aria-label="Rows">
        <RowItem>One line</RowItem>
      </RowList>
      <RowList as="ol" detail aria-label="In the pane">
        <DetailItem>One thing</DetailItem>
      </RowList>
    </>,
  );
  expect(screen.getByRole("list", { name: "Rows" }).tagName).toBe("UL");
  const pane = screen.getByRole("list", { name: "In the pane" });
  expect(pane.tagName).toBe("OL");
  expect(pane).toHaveAttribute("data-detail");
  expect(container.querySelector("[data-detail-item]")).not.toBeNull();
});

test("items inside a row keep what they are on the left and their actions at the right, and can join the keyboard loop", () => {
  render(
    <ItemList aria-label="Parts">
      <Item row>
        <div>What it is</div>
        <Actions>
          <button type="button">Do</button>
        </Actions>
      </Item>
      <Item single>No actions</Item>
    </ItemList>,
  );
  const [first, second] = screen.getAllByRole("listitem");
  expect(first).toHaveAttribute("data-row");
  expect(first).toHaveAttribute("data-item");
  expect(second).not.toHaveAttribute("data-row");
  expect(within(first).getByRole("button", { name: "Do" }).closest("[data-actions]")).not.toBeNull();
});

test("a section is a row with its content under it in the list, and the content alone in the pane", () => {
  const { rerender } = render(
    <ul>
      <SectionRow title="Robin" titleId="r-1" meta="2 waiting">
        <p>The content</p>
      </SectionRow>
    </ul>,
  );
  const row = screen.getByRole("listitem");
  expect(row).toHaveAccessibleName("Robin");
  expect(row).not.toHaveAttribute("data-row");
  expect(within(row).getByText("2 waiting")).toBeInTheDocument();
  rerender(
    <ul>
      <SectionRow pane title="Robin" meta="2 waiting">
        <p>The content</p>
      </SectionRow>
    </ul>,
  );
  expect(screen.queryByText("2 waiting")).toBeNull();
  expect(screen.getByText("The content")).toBeInTheDocument();
});

test("the top of a pane's item holds its state and its actions", () => {
  render(<DetailTop state={<span>Needs you</span>} actions={<button type="button">More</button>} />);
  expect(screen.getByText("Needs you").closest("[data-detail-top]")).not.toBeNull();
  expect(screen.getByRole("button", { name: "More" })).toBeInTheDocument();
});

test("a group of actions wraps, and can sit at the right edge", () => {
  const { container } = render(
    <Actions align="end" role="group" aria-label="Choices">
      <button type="button">A</button>
    </Actions>,
  );
  expect(container.querySelector("[data-actions]")).not.toBeNull();
  expect(screen.getByRole("group", { name: "Choices" })).toBeInTheDocument();
});
