// Day mode (UI/UX review F7): the light tokens keep AA contrast for every text pair they change, and the shared styles take
// the day look (tonal row actions, pane edges, no group bands, lighter titles) from tokens that night mode keeps as they were.
// Styles are not computed under jsdom, so these read the stylesheets; the browser checks measure the result.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { contrast } from "../lib/theme";

const root = join(__dirname, "..");
const read = (file: string) => readFileSync(join(root, file), "utf8");
const tokens = read("theme/tokens.css");

/** The declarations of the block that opens with `opener` (up to its closing brace), as name to value. */
function block(opener: string): Record<string, string> {
  const start = tokens.indexOf(opener);
  expect(start).toBeGreaterThanOrEqual(0);
  const end = tokens.indexOf("\n}", start);
  const out: Record<string, string> = {};
  for (const m of tokens.slice(start, end).matchAll(/(--[\w-]+):\s*([^;]+);/g)) out[m[1]] = m[2].trim();
  return out;
}
const primitives = block(":root {");
const dark = block(':root[data-theme="dark"] {');

/** A token's color: a `#rrggbb` value, or the one it names through `var()`, from the light roles then the primitives. */
const color = (name: string, set: Record<string, string> = primitives, base: Record<string, string> = primitives): string => {
  const value = set[name] ?? base[name];
  expect(value, name).toBeDefined();
  const ref = /^var\((--[\w-]+)\)$/.exec(value);
  return ref ? color(ref[1], set, base) : value;
};
const light = (name: string) => color(name);

const AA = 4.5;
const pairs: Array<[string, string, number]> = [
  // Body text and meta on every surface it sits on.
  ["--text", "--surface", 15],
  ["--text", "--canvas", 14],
  ["--text", "--surface-sunk", 14],
  ["--text", "--accent-soft", 13],
  ["--text-muted", "--surface", 6.5],
  ["--text-muted", "--canvas", AA],
  ["--text-muted", "--surface-sunk", 6.1],
  ["--text-muted", "--accent-soft", AA],
  ["--text-subtle", "--surface", AA],
  ["--text-subtle", "--canvas", AA],
  ["--text-subtle", "--surface-sunk", 4.9],
  ["--text-subtle", "--surface-hover", AA],
  // Links, and a tonal action (the accent's text on its soft fill).
  ["--accent-text", "--surface", AA],
  ["--accent-text", "--canvas", AA],
  ["--accent-text", "--surface-sunk", AA],
  ["--accent-text", "--accent-soft", AA],
  // A filled button: its text on the accent.
  ["--text-on-accent", "--accent", AA],
  // Status words on their tints and on the surface.
  ["--warn", "--warn-soft", AA],
  ["--danger", "--danger-soft", AA],
  ["--ok", "--ok-soft", AA],
  ["--warn", "--surface", AA],
  ["--danger", "--surface", AA],
  ["--ok", "--surface", AA],
];

test.each(pairs)("light %s on %s is at least %s:1", (fg, bg, min) => {
  expect(contrast(light(fg), light(bg))).toBeGreaterThanOrEqual(min);
});

test("the parts of a control that must be seen are 3:1: input edges, the focus ring and the accent", () => {
  for (const on of ["--surface", "--canvas", "--surface-sunk"]) {
    expect(contrast(light("--border-strong"), light(on))).toBeGreaterThanOrEqual(3);
  }
  for (const on of ["--surface", "--canvas", "--accent-soft"]) {
    expect(contrast(light("--focus-ring"), light(on))).toBeGreaterThanOrEqual(3);
  }
});

test("the day values are the reviewed ones, and decorative edges stay quiet", () => {
  expect(light("--text")).toBe("#171717");
  expect(light("--text-muted")).toBe("#5c5c5c");
  expect(light("--canvas")).toBe("#f5f3ee");
  expect(light("--surface-sunk")).toBe("#f8f5ef");
  expect(light("--border")).toBe("#e6e1d8");
  expect(light("--btn-border")).toBe("#cfc9bd");
  // Dividers and a button outline are decorative or named by their label; neither is used for an input.
  expect(contrast(light("--border"), light("--surface"))).toBeLessThan(1.3);
});

test("night mode keeps its values and its bordered look; type, row titles and links are the same as by day", () => {
  expect(dark["--canvas"]).toBe("var(--gray-950)");
  expect(dark["--text"]).toBe("#f4f4f2");
  expect(dark["--text-muted"]).toBe("#aaaead");
  expect(dark["--surface-sunk"]).toBe("#1c1d20");
  expect(dark["--border"]).toBe("var(--gray-800)");
  expect(dark["--btn-border"]).toBe("var(--border-strong)");
  expect(dark["--pane-border"]).toBe("var(--border)");
  // A card is seen by its surface and a faint top light as well as its hairline (VP06).
  expect(dark["--pane-edge"]).toBe("inset 0 1px 0 rgb(255 255 255 / 0.04)");
  // A group's label has no band, by day or by night (VP03): the tokens for one are gone.
  expect(tokens).not.toMatch(/--band-/);
  expect(dark["--pill-neutral-bg"]).toBe("var(--surface-sunk)");
  // What the two themes share is set once, in the light block, and night does not set it again.
  for (const name of ["--row-title-weight", "--link", "--row-selected-bg", "--row-selected-bar"]) {
    expect(primitives[name], name).toBeDefined();
    expect(dark[name], name).toBeUndefined();
  }
  expect(primitives["--row-title-weight"]).toBe("var(--weight-semibold)");
  // The media block for the system theme sets the same values as the in-app choice.
  const media = tokens.slice(tokens.indexOf("@media (prefers-color-scheme: dark)"), tokens.indexOf(':root[data-theme="dark"] {'));
  for (const name of ["--btn-border", "--pane-border", "--pane-edge", "--pill-neutral-bg", "--pill-neutral-edge"]) {
    expect(media).toContain(`${name}: ${dark[name]}`);
  }
});

test("a row's actions are never solid: the primary draws as the outline, and the cursor's row has a soft fill and a bar, not a filled button", () => {
  const css = read("ui/Row.module.css");
  // An outline by day and tonal by night, from the row-button tokens: the primary and the secondary draw alike.
  expect(css).toMatch(/\.actions :global\(\[data-variant="primary"\]:not\(:disabled\)\), \.actions :global\(\[data-variant="secondary"\]:not\(:disabled\)\) \{[^}]*background: var\(--row-btn-bg\)/);
  expect(primitives["--row-btn-bg"]).toBe("var(--surface)");
  expect(dark["--row-btn-bg"]).toBe("var(--accent-soft)");
  expect(dark["--row-btn-border"]).toBe("transparent");
  expect(css).not.toMatch(/row-action/);
  expect(css).toMatch(/\.selected, \.selected:hover \{[^}]*background: var\(--row-selected-bg\); box-shadow: var\(--row-selected-bar\)/);
  expect(css).toMatch(/\.title \{[^}]*font-weight: var\(--row-title-weight\)/s);
  // One row for every line: the older classes for a line, its row and its actions are gone.
  const styles = read("styles.css");
  expect(styles).not.toMatch(/(^|\n)\.(queue|line|row|acts|kind|expander|children|child)(?![-\w])/);
  expect(tokens).toMatch(/--row-selected-bg: color-mix\(in srgb, var\(--accent-soft\) 55%, transparent\)/);
  expect(tokens).not.toMatch(/--row-action|--row-pill-w/);
});

test("panes take their edge from the tokens, and a group label has no band and is uppercase 11px with a count pill", () => {
  for (const file of ["ui/Panel.module.css", "ui/ListDetail.module.css", "ui/RecordsTable.module.css"]) {
    const css = read(file);
    expect(css, file).toMatch(/border: 1px solid var\(--pane-border\); box-shadow: var\(--pane-edge\)/);
  }
  const styles = read("styles.css");
  expect(read("ui/RowList.module.css")).toMatch(/\.list \{[^}]*border: 1px solid var\(--pane-border\); box-shadow: var\(--pane-edge\)/);
  for (const selector of [".panel", ".table-wrap", ".record-side"]) {
    const line = styles.split("\n").find((l) => l.startsWith(`${selector} {`)) ?? "";
    expect(line, selector).toContain("var(--pane-border)");
    expect(line, selector).toContain("var(--pane-edge)");
  }
  const label = /\.label \{[^}]*\}/s.exec(read("ui/GroupLabel.module.css"))?.[0] ?? "";
  expect(label).toContain("font-size: var(--text-label)");
  expect(label).toContain("text-transform: uppercase");
  expect(label).toContain("letter-spacing: var(--tracking-label)");
  expect(label).not.toMatch(/background|border/);
  expect(read("ui/GroupLabel.module.css")).toMatch(/\.count \{[^}]*border-radius: var\(--radius-full\)/s);
  const light = tokens.slice(0, tokens.indexOf("/* ---------- Dark"));
  expect(light).toMatch(/--pane-border: transparent/);
});

test("the held and learned lines of Today are rows (ui/Row), so they take the same actions and the same cursor look", () => {
  for (const file of ["shell/HeldLines.tsx", "components/LearnedToday.tsx"]) expect(read(file), file).toMatch(/<Row\b/);
  expect(read("shell/HeldLines.module.css")).not.toMatch(/grid-template-columns/);
  expect(read("ui/Button.module.css")).not.toMatch(/data-tonal|row-action/);
});

test("one link colour, the same by day and by night, and underlined; a row's title and a link alone in the rail are underlined only when pointed at", () => {
  expect(primitives["--link"]).toBe("var(--accent-text)");
  expect(dark["--link"]).toBeUndefined();
  expect(tokens).not.toMatch(/--rail-link-line/);
  const css = read("styles.css");
  expect(css).toMatch(/a, \.link-button \{ color: var\(--link\); \}/);
  // Written with no weight of its own (:where), so a component that draws its links another way is never overridden.
  expect(css).toMatch(/:where\(a:not\(\[data-variant\]\), \.link-button\) \{ text-decoration-line: underline;/);
  // A row's title is the text colour, and underlined only when pointed at, by the keyboard or by the pointer.
  const row = read("ui/Row.module.css");
  expect(row).toMatch(/\.title :global\(a\) \{ color: inherit; text-decoration-line: none; \}/);
  expect(row).toMatch(/\.title :global\(a\):is\(:hover, :focus-visible\) \{ text-decoration-line: underline; \}/);
  expect(read("ui/RecordsTable.module.css")).toMatch(/\.name a \{ color: var\(--text\); text-decoration: none; \}/);
  // A link on a line of its own in the rail follows the same rule; one in a sentence keeps its underline.
  const rail = read("components/Today.module.css");
  expect(rail).toMatch(/\.rail :is\(a, :global\(\.link-button\)\):not\(:global\(\[data-variant\]\)\) \{ text-decoration-line: none; \}/);
  expect(rail).toMatch(/\.rail p :is\(a, :global\(\.link-button\)\):not\(:global\(\[data-variant\]\)\) \{ text-decoration-line: underline; \}/);
});

test("the type scale: a paragraph is never under 13px, and the 12px size is for pills, key caps, captions and group headers", () => {
  expect(primitives["--text-meta"]).toBe("13px");
  expect(primitives["--lh-meta"]).toBe("18px");
  expect(primitives["--text-section"]).toBe("16px");
  expect(primitives["--text-md"]).toBe("15px");
  expect(primitives["--text-xl"]).toBe("22px");
  for (const file of ["ui/Row.module.css", "ui/Button.module.css", "ui/EmptyState.module.css"]) expect(read(file), file).not.toMatch(/--text-xs/);
  expect(read("ui/Row.module.css")).toMatch(/\.meta \{[^}]*font-size: var\(--text-meta\)/);
  expect(read("styles.css")).toMatch(/\.hint \{ font-size: var\(--text-meta\)/);
});

test("below 640px the parts of a row stack: the buttons go under the words and the menu sits at the row's top right", () => {
  const css = read("ui/Row.module.css");
  const phone = css.slice(css.indexOf("@media (max-width: 639.98px)"));
  expect(phone).toMatch(/\.row \{[^}]*grid-template-columns: var\(--row-lead-w\) minmax\(0, 1fr\)/);
  expect(phone).toMatch(/\.actions \{ display: contents; \}/);
  expect(phone).toMatch(/\.buttons \{[^}]*grid-column: 2; justify-content: flex-start/);
  expect(phone).toMatch(/\.menu \{[^}]*position: absolute; top: var\(--space-1\); right: var\(--space-1\)/);
  // The configured phone layout (an attribute on the page) does the same as a narrow window.
  expect(css).toMatch(/:global\(\[data-narrow\]\) \.menu \{[^}]*position: absolute/);
});

// Dark-mode accents and elevation (design 7.12, VC09): a floating thing lifts off the page by a raised fill and an edge at night,
// a shadow does it by day; today's column is a low-chroma tint; the selected state is the soft accent, never the solid one.
test("overlays lift off the page: a raised fill and an edge by night, the shadow by day", () => {
  expect(primitives["--surface-raised"]).toBe("var(--surface)");
  expect(dark["--surface-raised"]).toMatch(/^#/);
  expect(dark["--overlay-edge"]).toContain("var(--border-strong)");
  // The frame (a drawer, a dialog, a sheet) is one file, and the popover and the menu are the two other surfaces that float.
  for (const file of ["ui/Overlay.module.css", "ui/MenuButton.module.css", "ui/Popover.module.css"]) {
    const css = read(file);
    expect(css, file).toMatch(/background: var\(--surface-raised\)/);
    expect(css, file).toMatch(/var\(--overlay-edge\)/);
  }
  // What sits inside the frame (a footer) takes the raised fill too, so it is not a different grey from the frame.
  for (const file of ["ui/Drawer.module.css", "components/ModalPanel.module.css"]) expect(read(file), file).toMatch(/background: var\(--surface-raised\)/);
});

test("today's column in the calendar is a low-chroma tint, never the full soft accent", () => {
  expect(primitives["--today-tint"]).toMatch(/color-mix\(in srgb, var\(--accent-soft\) 55%/);
  expect(dark["--today-tint"]).toMatch(/color-mix\(in srgb, var\(--accent-soft\) 35%/);
  const css = read("components/Schedule.module.css");
  expect(css).not.toMatch(/\[data-today\][^{]*\{[^}]*var\(--accent-soft\)/);
  expect(css).toMatch(/\.colHead\[data-today\] \{ background: var\(--today-tint\)/);
  // The month's cells are white; today is a filled circle on its number.
  expect(css).not.toMatch(/\.cell\[data-today\] \{/);
  expect(css).toMatch(/\.cell\[data-today\] \.dayNumber \{ background: var\(--accent\)/);
});

test("the selected state in navigation is the soft accent, and the tonal pairs keep AA contrast by night", () => {
  expect(read("shell/Sidebar.module.css")).toMatch(/\.entry\[aria-current="page"\] \{ background: var\(--accent-soft\)/);
  const night = (name: string) => color(name, dark);
  expect(contrast(night("--row-btn-text"), night("--accent-soft"))).toBeGreaterThanOrEqual(AA);
  expect(contrast(night("--text"), night("--surface-raised"))).toBeGreaterThanOrEqual(AA);
});
