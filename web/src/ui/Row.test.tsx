import "@testing-library/jest-dom/vitest";
import { render, screen, within } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Button } from "./Button";
import { Row } from "./Row";

test("a row has a leading mark, a title, a meta line, then the primary action and the menu", () => {
  render(
    <ul>
      <Row
        pill={<span>Decision</span>}
        title="Make 1 decision"
        meta="From an email"
        primary={<button type="button">Answer</button>}
        menu={<button type="button">More</button>}
      />
    </ul>,
  );
  const row = screen.getByRole("listitem");
  expect(row).toHaveAttribute("data-row");
  expect(within(row).getByText("Make 1 decision")).toBeInTheDocument();
  expect(within(row).getByText("From an email")).toBeInTheDocument();
  const buttons = within(row).getAllByRole("button");
  // The menu is the last thing on the row.
  expect(buttons.map((b) => b.textContent)).toEqual(["Answer", "More"]);
});

test("a row can take focus from the keyboard loop, and says when it is selected", () => {
  const { rerender } = render(
    <ul>
      <Row title="One" />
    </ul>,
  );
  const row = screen.getByRole("listitem");
  row.focus();
  expect(row).toHaveFocus();
  expect(row).not.toHaveAttribute("aria-current");
  rerender(
    <ul>
      <Row title="One" selected />
    </ul>,
  );
  expect(screen.getByRole("listitem")).toHaveAttribute("aria-current", "true");
  expect(screen.getByRole("listitem")).toHaveAttribute("data-selected");
});

test("expanded content sits under the row", () => {
  render(
    <ul>
      <Row title="One">
        <p>Item inside</p>
      </Row>
    </ul>,
  );
  expect(within(screen.getByRole("listitem")).getByText("Item inside")).toBeInTheDocument();
});

test("a row can be a plain block outside a list", () => {
  render(<Row as="div" title="Alone" />);
  expect(screen.queryByRole("listitem")).toBeNull();
  expect(screen.getByText("Alone").closest("[data-row]")?.tagName).toBe("DIV");
});

test("a row with nothing under it adds no space for it", () => {
  render(
    <ul>
      <Row title="One">{false}</Row>
      <Row title="Two">
        <p>Detail</p>
      </Row>
    </ul>,
  );
  const [empty, full] = screen.getAllByRole("listitem");
  expect(empty.querySelector("[class*='extra']")).toBeNull();
  expect(full.querySelector("[class*='extra']")).not.toBeNull();
});

test("a row's leading slot is always there and is 24px wide, with and without content; a mark stands after the title's words", () => {
  render(
    <ul>
      <Row title="Plain" />
      <Row title="Marked" pill={<span data-pill="">Clash</span>} />
      <Row title="Ticked" lead={<button type="button">Done</button>} />
    </ul>,
  );
  const [plain, marked, ticked] = screen.getAllByRole("listitem");
  // Every row has the slot, empty or not, so every title starts on one edge.
  for (const row of [plain, marked, ticked]) expect(row.querySelector(":scope > [data-row-lead]")).not.toBeNull();
  expect(plain.querySelector("[data-row-lead]")).toBeEmptyDOMElement();
  expect(marked.querySelector("[data-row-lead]")).toBeEmptyDOMElement();
  expect(within(ticked).getByRole("button", { name: "Done" }).closest("[data-row-lead]")).not.toBeNull();
  // The slot is the first thing in the row, then the words.
  expect(plain.firstElementChild).toBe(plain.querySelector("[data-row-lead]"));
  // The mark comes after the title's words in the title's line, never before them.
  const title = within(marked).getByText("Marked").closest("[data-row-title]") as HTMLElement;
  expect(title).toContainElement(within(marked).getByText("Clash"));
  expect(title.textContent).toBe("MarkedClash");
});

test("the slot's width is the one token, so no row can draw it another width", () => {
  const css = readFileSync(join(__dirname, "Row.module.css"), "utf8");
  const tokens = readFileSync(join(__dirname, "..", "theme", "tokens.css"), "utf8");
  expect(tokens).toMatch(/--row-lead-w: var\(--target-min\)/);
  expect(tokens).toMatch(/--target-min: 24px/);
  expect(css).toMatch(/\.row \{[^}]*grid-template-columns: var\(--row-lead-w\) minmax\(0, 1fr\) auto/s);
  expect(css).toMatch(/\.lead \{[^}]*width: var\(--row-lead-w\)/s);
});

test("a list in which no row has a mark takes no width for the slot; one mark anywhere keeps the slot on every row", () => {
  const css = readFileSync(join(__dirname, "Row.module.css"), "utf8");
  // The rule is written on the list: it holds only while no row's slot has content.
  expect(css).toMatch(/:where\(:not\(:has\(> \.row > \.lead:not\(:empty\)\)\)\) > \.row > \.lead \{ display: none; \}/);
  expect(css).toMatch(/> \.row \{ grid-template-columns: minmax\(0, 1fr\) auto; \}/);
  render(
    <ul>
      <Row title="Plain" />
      <Row title="Marked" lead={<span data-icon="x" />} />
    </ul>,
  );
  const [plain, marked] = screen.getAllByRole("listitem");
  expect(plain.querySelector("[data-row-lead]")).toBeEmptyDOMElement();
  expect(marked.querySelector("[data-row-lead]")).not.toBeEmptyDOMElement();
});

test("the buttons and the menu are separate parts of the row, so a phone can put the menu at the top right and the buttons under the words", () => {
  render(
    <ul>
      <Row title="Both" primary={<button type="button">Answer</button>} menu={<button type="button">More</button>} />
      <Row title="Menu only" menu={<button type="button">More</button>} />
      <Row title="Neither" />
    </ul>,
  );
  const [both, menuOnly, neither] = screen.getAllByRole("listitem");
  expect(both.querySelector("[class*='buttons']")).toContainElement(within(both).getByRole("button", { name: "Answer" }));
  expect(both.querySelector("[class*='menu']")).toContainElement(within(both).getByRole("button", { name: "More" }));
  expect(both.querySelector("[class*='buttons']")).not.toContainElement(within(both).getByRole("button", { name: "More" }));
  expect(menuOnly.querySelector("[class*='buttons']")).toBeNull();
  expect(neither.querySelector("[class*='actions']")).toBeNull();
  const css = readFileSync(join(__dirname, "Row.module.css"), "utf8");
  const phone = css.slice(css.indexOf("@media (max-width: 639.98px)"));
  expect(phone).toMatch(/\.row \{[^}]*grid-template-columns: var\(--row-lead-w\) minmax\(0, 1fr\)/);
  expect(phone).toMatch(/\.menu \{[^}]*position: absolute; top: var\(--space-1\); right: var\(--space-1\)/);
  expect(phone).toMatch(/\.buttons \{[^}]*grid-column: 2/);
});

test("a button among a row's actions says it is drawn as an outline when it is a primary, and the row's other buttons keep their own weight", () => {
  render(
    <ul>
      <Row
        title="Row"
        primary={<Button variant="primary">Open</Button>}
        actions={
          <>
            <Button variant="tonal">Soft</Button>
            <Button variant="quiet">Plain</Button>
          </>
        }
      />
    </ul>,
  );
  expect(screen.getByRole("button", { name: "Open" })).toHaveAttribute("data-weight", "outline");
  expect(screen.getByRole("button", { name: "Soft" })).toHaveAttribute("data-weight", "tonal");
  expect(screen.getByRole("button", { name: "Plain" })).toHaveAttribute("data-weight", "plain");
});
