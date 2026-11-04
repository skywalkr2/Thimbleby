import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Icon } from "./Icon";
import { Skeleton } from "./Skeleton";
import { WordingProvider } from "../lib/wording";

const css = (name: string) => readFileSync(join(__dirname, name), "utf8");
const shell = (name: string) => readFileSync(join(__dirname, "..", "shell", name), "utf8");

// G1d: the shared parts the screen batches handed back, each proved at the cheapest level.

test("the keyboard, the note and the flag are icons of their own, drawn differently from the help, book and search marks", () => {
  const drawn = (name: Parameters<typeof Icon>[0]["name"]) => {
    const { container, unmount } = render(<Icon name={name} />);
    const html = container.innerHTML;
    unmount();
    return html;
  };
  const shapes = ["keyboard", "note", "flag", "help", "book", "search", "chat", "grid"].map((n) => drawn(n as never));
  expect(new Set(shapes).size).toBe(shapes.length);
});

test("a skeleton row draws the lead and the end of the row the loaded row has, and a list with neither draws neither", () => {
  const { container, rerender } = render(
    <WordingProvider>
      <Skeleton rows={2} />
    </WordingProvider>,
  );
  expect(container.querySelectorAll("[class*='lead']")).toHaveLength(2);
  expect(container.querySelectorAll("[class*='btn']")).toHaveLength(2);
  rerender(
    <WordingProvider>
      <Skeleton rows={2} row={{ lead: false, action: "none" }} />
    </WordingProvider>,
  );
  expect(container.querySelectorAll("[class*='lead']")).toHaveLength(0);
  expect(container.querySelectorAll("[class*='btn']")).toHaveLength(0);
  expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
  rerender(
    <WordingProvider>
      <Skeleton rows={1} row={{ action: "menu" }} />
    </WordingProvider>,
  );
  expect(container.querySelectorAll("[class*='menu']")).toHaveLength(1);
  expect(container.querySelectorAll("[class*='btn']")).toHaveLength(0);
});

test("a skeleton's lines sit in boxes as tall as a row's title and meta line, so a row loads at the height it will have", () => {
  const sheet = css("Skeleton.module.css");
  expect(sheet).toMatch(/\.bar \{ height: 14px; width: 60%; \}/);
  expect(sheet).toMatch(/\.short \{ width: 36%; height: 10px; \}/);
  expect(sheet).toMatch(/\.lines > \.bar, \.lines > \.short \{ margin-block: var\(--space-1\); \}/);
});

test("the toast keeps its close button on the words' row: the words yield width before the buttons wrap", () => {
  const sheet = readFileSync(join(__dirname, "..", "lib", "toasts.module.css"), "utf8");
  expect(sheet).toMatch(/\.message \{ flex: 1 1 8rem;/);
});

test("a phone's tabs are one row that scrolls inside its own box, and every segment of a segmented control shares the track equally", () => {
  const tabs = css("TabStrip.module.css");
  expect(tabs).toMatch(/\[data-narrow\]\) \.strip \{ flex-wrap: nowrap;[^}]*overflow-x: auto/);
  const seg = css("SegmentedControl.module.css");
  expect(seg).toMatch(/\.track \{[^}]*display: inline-grid; grid-auto-flow: column; grid-auto-columns: minmax\(0, 1fr\)/);
});

test("the title of a page and the line under it are a gap apart, taken from the spacing scale", () => {
  expect(css("PageHeader.module.css")).toMatch(/\.titles \{[^}]*display: grid; gap: var\(--space-2\)/);
});

test("a checkbox group's panel carries the legend's top padding itself, so the legend never touches the panel's edge", () => {
  const group = css("CheckboxGroup.module.css");
  expect(group).toMatch(/\.panel \{[^}]*padding: 0 var\(--space-4\) var\(--space-3\)/);
  expect(group).toMatch(/\.panel > \.legend \{ padding-top: var\(--space-3\)/);
});

test("a drawer's body shows a shadow at the edge where the form continues, and a row's lead sits on its title's line", () => {
  expect(css("Drawer.module.css")).toMatch(/\.body \{[^}]*radial-gradient\(farthest-side at 50% 0/s);
  expect(css("Row.module.css")).toMatch(/\.row:has\(> \.main > \.meta\) > \.lead \{ align-self: start;/);
});

test("the search box has one focus ring, and the status popover keeps Refresh at its bottom edge", () => {
  expect(css("SearchField.module.css")).toMatch(/\.input:focus-visible \{ border-color: var\(--focus-ring\); box-shadow: 0 0 0 1px var\(--focus-ring\); \}/);
  expect(shell("StatusMenu.module.css")).toMatch(/\.state\[data-state="updates"\] \{ position: sticky; bottom: 0;/);
});

test("the page sections are one section gap apart, from one token", () => {
  const tokens = readFileSync(join(__dirname, "..", "theme", "tokens.css"), "utf8");
  expect(tokens).toMatch(/--section-gap: var\(--space-6\)/);
  const styles = readFileSync(join(__dirname, "..", "styles.css"), "utf8");
  expect(styles).toMatch(/\.record-main \{ gap: var\(--section-gap\); \}/);
});

test("an empty state is as wide as its words need, and a rail's one-line empty state keeps the card's width", () => {
  const sheet = css("EmptyState.module.css");
  expect(sheet).toMatch(/\.empty \{[^}]*width: fit-content; min-width: min\(100%, 24rem\); max-width: 100%/);
  expect(sheet).toMatch(/\.inline \{ width: auto; min-width: 0;/);
});

test("a drawer's title is the dialog title size over 14px labels, the drawer is 480px, the scrim is 40%, and small text keeps the floors", () => {
  expect(css("Drawer.module.css")).toMatch(/\.title \{[^}]*font-size: var\(--text-lg\)/);
  const tokens = readFileSync(join(__dirname, "..", "theme", "tokens.css"), "utf8");
  expect(tokens).toMatch(/--drawer-w: 480px/);
  expect(tokens).toMatch(/--overlay: rgb\(23 23 23 \/ 0\.40\)/);
  expect(tokens).toMatch(/--text-meta: 13px/);
  // A pill is the 12px size the scale keeps for pills; a record's labels and values are 14px; the Back link is a button of 14px.
  expect(css("Pill.module.css")).toMatch(/font-size: var\(--text-xs\)/);
  expect(css("DefinitionList.module.css")).toMatch(/\.list \{[^}]*font-size: var\(--text-sm\)/);
  expect(css("Button.module.css")).toMatch(/\.btn \{[^}]*font-size: var\(--text-sm\)/s);
  expect(css("AskAboutThis.module.css")).toMatch(/\.hint \{[^}]*font-size: var\(--text-meta\)/);
});

test("the Change link that ends the spending sentence has the sentence's weight", () => {
  const styles = readFileSync(join(__dirname, "..", "styles.css"), "utf8");
  expect(styles).toMatch(/\.spend-line \.link-button \{ font-weight: inherit; \}/);
});

// G6: the shared leftovers.
test("an inline empty state's button keeps its own width and drops under the words rather than squeezing onto three lines", () => {
  const rules = css("EmptyState.module.css");
  expect(rules).toMatch(/\.inline\s*\{\s*flex-wrap:\s*wrap;\s*\}/);
  expect(rules).toMatch(/\.inline > :global\(\[data-variant\]\)\s*\{[^}]*flex:\s*none;[^}]*white-space:\s*nowrap/);
});

test("the side menu's marks are one fixed width, so every name starts on the same edge", () => {
  expect(shell("Sidebar.module.css")).toMatch(/\.glyph\s*\{[^}]*\bwidth:\s*22px;[^}]*min-width:\s*22px/);
});
