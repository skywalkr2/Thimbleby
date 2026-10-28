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
  ["--text-muted", "--surface", 7],
  ["--text-muted", "--canvas", AA],
  ["--text-muted", "--surface-sunk", 6.9],
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
  expect(light("--text")).toBe("#1d2230");
  expect(light("--text-muted")).toBe("#4e5565");
  expect(light("--canvas")).toBe("#f4f5f7");
  expect(light("--surface-sunk")).toBe("#f6f7f9");
  expect(light("--border")).toBe("#e8eaef");
  expect(light("--btn-border")).toBe("#cfd4dc");
  // Dividers and a button outline are decorative or named by their label; neither is used for an input.
  expect(contrast(light("--border"), light("--surface"))).toBeLessThan(1.3);
});

test("night mode keeps its values and its bordered, banded look; type, row titles and links are the same as by day", () => {
  expect(dark["--canvas"]).toBe("var(--gray-950)");
  expect(dark["--text"]).toBe("#e8ebf1");
  expect(dark["--text-muted"]).toBe("#a7afbd");
  expect(dark["--surface-sunk"]).toBe("#1d2129");
  expect(dark["--border"]).toBe("var(--gray-800)");
  expect(dark["--btn-border"]).toBe("var(--border-strong)");
  expect(dark["--pane-border"]).toBe("var(--border)");
  expect(dark["--pane-edge"]).toBe("none");
  expect(dark["--band-bg"]).toBe("var(--canvas)");
  expect(dark["--band-bottom"]).toBe("1px solid var(--border)");
  expect(dark["--pill-neutral-bg"]).toBe("var(--surface-sunk)");
  // What the two themes share is set once, in the light block, and night does not set it again.
  for (const name of ["--row-title-weight", "--link", "--row-selected-bg", "--row-selected-bar"]) {
    expect(primitives[name], name).toBeDefined();
    expect(dark[name], name).toBeUndefined();
  }
  expect(primitives["--row-title-weight"]).toBe("var(--weight-semibold)");
  // The media block for the system theme sets the same values as the in-app choice.
  const media = tokens.slice(tokens.indexOf("@media (prefers-color-scheme: dark)"), tokens.indexOf(':root[data-theme="dark"] {'));
  for (const name of ["--btn-border", "--pane-border", "--pane-edge", "--band-bg", "--band-bottom", "--pill-neutral-bg", "--pill-neutral-edge"]) {
    expect(media).toContain(`${name}: ${dark[name]}`);
  }
});

test("a row's actions are never solid: the primary draws as the outline, and the cursor's row has a soft fill and a bar, not a filled button", () => {
  const css = read("ui/Row.module.css");
  expect(css).toMatch(/\.actions :global\(\[data-variant="primary"\]:not\(:disabled\)\) \{[^}]*background: var\(--surface\)/);
  expect(css).not.toMatch(/row-action/);
  expect(css).toMatch(/\.selected, \.selected:hover \{[^}]*background: var\(--row-selected-bg\); box-shadow: var\(--row-selected-bar\)/);
  expect(css).toMatch(/\.title \{[^}]*font-weight: var\(--row-title-weight\)/s);
  // The same two rules for the lines drawn with the older classes, so the two look alike until they are one.
  const styles = read("styles.css");
  expect(styles).toMatch(/\.queue:not\(\.detail-queue\) > \.line > \.row > \.acts > \[data-variant="primary"\]:not\(:disabled\) \{[^}]*background: var\(--surface\)/);
  expect(styles).toMatch(/\.line\[aria-current="true"\] \{[^}]*var\(--row-selected-bg\)/);
  expect(tokens).toMatch(/--row-selected-bg: color-mix\(in srgb, var\(--accent-soft\) 55%, transparent\)/);
  expect(tokens).not.toMatch(/--row-action|--row-pill-w/);
});

test("panes take their edge from the tokens, and a group header has no band", () => {
  for (const file of ["ui/Panel.module.css", "ui/ListDetail.module.css", "ui/RecordsTable.module.css"]) {
    const css = read(file);
    expect(css, file).toMatch(/border: 1px solid var\(--pane-border\); box-shadow: var\(--pane-edge\)/);
  }
  const styles = read("styles.css");
  for (const selector of [".queue", ".panel", ".table-wrap", ".record-side"]) {
    const line = styles.split("\n").find((l) => l.startsWith(`${selector} {`)) ?? "";
    expect(line, selector).toContain("var(--pane-border)");
    expect(line, selector).toContain("var(--pane-edge)");
  }
  const head = /\.groupHead \{[^}]*\}/s.exec(read("components/Today.module.css"))?.[0] ?? "";
  expect(head).toContain("background: var(--band-bg)");
  expect(head).toContain("border-bottom: var(--band-bottom)");
  const light = tokens.slice(0, tokens.indexOf("/* ---------- Dark"));
  expect(light).toMatch(/--band-bg: transparent/);
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
  expect(rail).toMatch(/\.rail :is\(p, :global\(\.tb-title\)\) :is\(a, :global\(\.link-button\)\):not\(:global\(\[data-variant\]\)\) \{ text-decoration-line: underline; \}/);
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

test("below 640px a lone action stays at the row's edge and several sit under the title", () => {
  const css = read("ui/Row.module.css");
  const phone = css.slice(css.indexOf("@media (max-width: 639.98px)"));
  expect(phone).toMatch(/\.row, :global\(\[data-narrow\]\) \.row \{[^}]*grid-template-columns: minmax\(0, 1fr\) auto/);
  // A lone action stays at the right edge; a second button sends the actions under the title, at the right.
  expect(phone).toMatch(/\.row > \.actions:has\(> :global\(\[data-variant\]\) ~ :global\(\[data-variant\]\)\)[^{]*\{[^}]*grid-column: 1 \/ -1;[^}]*justify-content: flex-end/);
});
