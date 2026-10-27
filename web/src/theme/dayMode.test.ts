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

test("night mode keeps its values and its bordered, banded look, with its row actions tonal like the day's", () => {
  expect(dark["--canvas"]).toBe("var(--gray-950)");
  expect(dark["--text"]).toBe("#e8ebf1");
  expect(dark["--text-muted"]).toBe("#a7afbd");
  expect(dark["--surface-sunk"]).toBe("#1d2129");
  expect(dark["--border"]).toBe("var(--gray-800)");
  expect(dark["--btn-border"]).toBe("var(--border-strong)");
  expect(dark["--row-action-bg"]).toBe("var(--brand-900)");
  expect(dark["--row-action-text"]).toBe("var(--brand-200)");
  expect(dark["--pane-border"]).toBe("var(--border)");
  expect(dark["--pane-edge"]).toBe("none");
  expect(dark["--band-bg"]).toBe("var(--canvas)");
  expect(dark["--band-bottom"]).toBe("1px solid var(--border)");
  expect(dark["--row-title-weight"]).toBe("var(--weight-semibold)");
  expect(dark["--pill-neutral-bg"]).toBe("var(--surface-sunk)");
  expect(dark["--rail-link-line"]).toBe("underline");
  // The media block for the system theme sets the same values as the in-app choice.
  const media = tokens.slice(tokens.indexOf("@media (prefers-color-scheme: dark)"), tokens.indexOf(':root[data-theme="dark"] {'));
  for (const name of ["--btn-border", "--row-action-bg", "--pane-border", "--pane-edge", "--band-bg", "--band-bottom", "--row-title-weight", "--pill-neutral-bg", "--pill-neutral-edge", "--rail-link-line"]) {
    expect(media).toContain(`${name}: ${dark[name]}`);
  }
});

test("a row's action is tonal unless the row is selected, and the selected row's is the filled one", () => {
  const css = read("ui/Row.module.css");
  expect(css).toMatch(/\.actions :global\(:is\(\[data-variant="primary"\], \.btn\.primary\):not\(:disabled\)\) \{[^}]*background: var\(--row-action-bg\)/);
  expect(css).toMatch(/\.selected \.actions :global\(:is\(\[data-variant="primary"\], \.btn\.primary\):not\(:disabled\)\) \{[^}]*background: var\(--row-action-strong-bg\)/);
  expect(css).toMatch(/\.title \{[^}]*font-weight: var\(--row-title-weight\)/s);
  const light = tokens.slice(0, tokens.indexOf("/* ---------- Dark"));
  expect(light).toMatch(/--row-action-bg: var\(--accent-soft\)/);
  expect(light).toMatch(/--row-action-strong-bg: var\(--accent\)/);
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

test("the day look reaches the other Today actions: held and learned lines, Continue setup and the new-lines bar are tonal", () => {
  expect(read("shell/HeldLines.module.css")).toMatch(/\.actions :global\(\[data-variant="primary"\]:not\(:disabled\)\) \{[^}]*var\(--row-action-bg\)/);
  expect(read("components/Learned.module.css")).toMatch(/\.todayActs :global\(\[data-variant="primary"\]:not\(:disabled\)\) \{[^}]*var\(--row-action-bg\)/);
  expect(read("ui/Button.module.css")).toMatch(/\.primary\[data-tonal\]:not\(:disabled\) \{[^}]*var\(--row-action-bg\)/);
  expect(read("components/TodayEmpty.tsx")).toMatch(/variant="primary" data-tonal=""/);
  expect(read("components/TodayQueue.tsx")).toMatch(/variant="primary" data-tonal="" aria-keyshortcuts="Shift\+N"/);
});

test("links in the rail have no underline until the pointer or the keyboard is on them by day; running text and night keep it", () => {
  const light = tokens.slice(0, tokens.indexOf("/* ---------- Dark"));
  expect(light).toMatch(/--rail-link-line: none/);
  const css = read("components/Today.module.css");
  // Links and link-like buttons in the rail take the token; a button-styled link does not.
  expect(css).toMatch(/\.rail :is\(a, :global\(\.link-button\)\):not\(:global\(\.btn\)\) \{ text-decoration-line: var\(--rail-link-line\); \}/);
  // Hover and keyboard focus bring it back, so a link is never found by color alone.
  expect(css).toMatch(/\.rail :is\(a, :global\(\.link-button\)\):not\(:global\(\.btn\)\):is\(:hover, :focus-visible\) \{ text-decoration-line: underline; \}/);
  // A link inside a paragraph is running text.
  expect(css).toMatch(/\.rail p :is\(a, :global\(\.link-button\)\):not\(:global\(\.btn\)\) \{ text-decoration-line: underline; \}/);
});

test("night's row actions are tonal too: the deep brand fill with the light brand text, readable, and the chosen line's is the one filled button", () => {
  expect(dark["--row-action-bg"]).toBe("var(--brand-900)");
  expect(dark["--row-action-hover"]).toBe("var(--brand-900)");
  expect(dark["--row-action-text"]).toBe("var(--brand-200)");
  expect(dark["--row-action-border"]).toBe("transparent");
  // A tonal action reads on its fill and the fill stands out from the surface it sits on.
  expect(contrast(color("--row-action-text", dark), color("--row-action-bg", dark))).toBeGreaterThanOrEqual(AA);
  expect(contrast(color("--row-action-bg", dark), color("--surface", dark))).toBeGreaterThan(1.1);
  // The filled one, for the chosen line, is the accent with its own text, the same words by day and by night.
  expect(dark["--row-action-strong-bg"]).toBe("var(--accent)");
  expect(dark["--row-action-strong-text"]).toBe("var(--text-on-accent)");
  expect(contrast(color("--row-action-strong-text", dark), color("--accent", dark))).toBeGreaterThanOrEqual(AA);
  // The media block for the system theme says the same, so the choice of theme and the system's agree.
  const media = tokens.slice(tokens.indexOf("@media (prefers-color-scheme: dark)"), tokens.indexOf(':root[data-theme="dark"] {'));
  for (const name of ["--row-action-bg", "--row-action-hover", "--row-action-text", "--row-action-border", "--row-action-strong-bg"]) {
    expect(media).toContain(`${name}: ${dark[name]}`);
  }
  // The shared styles draw the tonal one by default and the filled one for the chosen line, whichever theme's tokens they read.
  const css = read("ui/Row.module.css");
  expect(css).toMatch(/\.actions :global\(:is\(\[data-variant="primary"\], \.btn\.primary\):not\(:disabled\)\) \{[^}]*background: var\(--row-action-bg\)/);
  expect(css).toMatch(/\.row:focus-within \.actions :global\(:is\(\[data-variant="primary"\], \.btn\.primary\):not\(:disabled\)\) \{[^}]*background: var\(--row-action-strong-bg\)/);
  expect(read("styles.css")).toMatch(/\.line:focus-within > \.row > \.acts > \.btn\.primary:not\(:disabled\) \{[^}]*background: var\(--row-action-strong-bg\)/);
});

test("below 640px a row's actions sit under its title at full width", () => {
  const css = read("ui/Row.module.css");
  const phone = css.slice(css.indexOf("@media (max-width: 639.98px)"));
  expect(phone).toMatch(/\.row, :global\(\[data-narrow\]\) \.row \{[^}]*grid-template-columns: minmax\(0, 1fr\)/);
  expect(phone).toMatch(/\.actions, :global\(\[data-narrow\]\) \.actions \{[^}]*grid-column: 1;[^}]*justify-content: flex-end/);
  expect(phone).toMatch(/\[data-variant="primary"\][^{]*\{[^}]*flex: 1 1 auto/);
});
