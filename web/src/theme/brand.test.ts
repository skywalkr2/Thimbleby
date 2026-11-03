// The product's own palette and type (design 7.12, the visual review's VP16 and VP06): every text-on-surface and text-on-accent pair of
// the semantic roles meets WCAG 2.2 AA in both themes, read from tokens.css; the state colors have hues of their own and are never the
// accent; the side and calendar marks are neither; night surfaces lift; the faces are bundled; the workspace's own color still
// replaces the accent and is still refused when its text cannot be read.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { accentContrast, applyBrand, brandTokens, contrast } from "../lib/theme";

const root = join(__dirname, "..");
const read = (file: string) => readFileSync(join(root, file), "utf8");
const tokens = read("theme/tokens.css");

type Declarations = Record<string, string>;

/** The declarations of the block that opens with `opener`, up to its closing brace at the start of a line or two spaces in. */
function block(opener: string): Declarations {
  const start = tokens.indexOf(opener);
  expect(start, opener).toBeGreaterThanOrEqual(0);
  const end = tokens.indexOf("\n}", start);
  const inner = tokens.slice(start + opener.length, end).replace(/\n {2}\}\s*$/, "");
  const out: Declarations = {};
  for (const m of inner.matchAll(/(--[\w-]+):\s*([^;]+);/g)) out[m[1]] = m[2].trim();
  return out;
}

const dayBlock = block(":root {");
const systemNight = block(':root:not([data-theme="light"]) {');
const chosenNight = block(':root[data-theme="dark"] {');
const themes: Record<"day" | "night", Declarations> = { day: dayBlock, night: { ...dayBlock, ...chosenNight } };

/** A token's color in a theme: a `#rrggbb` value, or the one it names through `var()`. */
function color(theme: "day" | "night", name: string): string {
  const value = themes[theme][name];
  expect(value, `${theme} ${name}`).toBeDefined();
  const ref = /^var\((--[\w-]+)\)$/.exec(value);
  if (ref) return color(theme, ref[1]);
  expect(value, `${theme} ${name}`).toMatch(/^#[0-9a-f]{6}$/);
  return value;
}

// Perceptual distance (OKLab) between two colors: how different two marks look, beyond their contrast with the page.
function oklab(hex: string): [number, number, number] {
  const channel = (i: number) => {
    const c = parseInt(hex.slice(1 + 2 * i, 3 + 2 * i), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const [r, g, b] = [channel(0), channel(1), channel(2)];
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}
const apart = (a: string, b: string) => {
  const [p, q] = [oklab(a), oklab(b)];
  return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
};
/** Two marks this far apart in OKLab look like different colors, not two shades of one. */
const DISTINCT = 0.05;

const AA = 4.5; // text
const UI = 3; // large text and the parts of a control that must be seen
const THEMES = ["day", "night"] as const;
const STATES = ["--warn", "--danger", "--ok"];
const MARKS = [1, 2, 3, 4, 5].map((n) => `--side-${n}`).concat([1, 2, 3, 4, 5, 6, 7, 8].map((n) => `--cal-${n}`));

describe.each(THEMES)("%s", (theme) => {
  const c = (name: string) => color(theme, name);
  const surfaces = ["--surface", "--canvas", "--surface-sunk", "--surface-hover", "--accent-soft"];

  test("text on every surface it sits on is AA", () => {
    for (const fg of ["--text", "--text-muted", "--text-subtle", "--accent-text", "--link"]) {
      for (const bg of surfaces) expect(contrast(c(fg), c(bg)), `${fg} on ${bg}`).toBeGreaterThanOrEqual(AA);
    }
    // A floating thing (a menu, a dialog, a drawer) is a surface too: its words and its meta read on it.
    for (const fg of ["--text", "--text-muted", "--text-subtle", "--accent-text"]) {
      expect(contrast(c(fg), c("--surface-raised")), `${fg} on --surface-raised`).toBeGreaterThanOrEqual(AA);
    }
  });

  test("text on the accent and on a danger fill is AA, hover included", () => {
    expect(contrast(c("--text-on-accent"), c("--accent"))).toBeGreaterThanOrEqual(AA);
    expect(contrast(c("--text-on-accent"), c("--accent-hover"))).toBeGreaterThanOrEqual(AA);
    expect(contrast(c("--text-on-danger"), c("--danger"))).toBeGreaterThanOrEqual(AA);
    // A tonal button: the accent's text on its soft fill (the row buttons' pair).
    expect(contrast(c("--row-btn-text"), c("--accent-soft"))).toBeGreaterThanOrEqual(AA);
  });

  test("a state's color reads as text on its own tint and on the surfaces", () => {
    for (const state of STATES) {
      const soft = `${state}-soft`;
      for (const bg of [soft, "--surface", "--canvas", "--surface-sunk"]) expect(contrast(c(state), c(bg)), `${state} on ${bg}`).toBeGreaterThanOrEqual(AA);
      // The words on a state's tint are the plain text colors.
      expect(contrast(c("--text"), c(soft)), `--text on ${soft}`).toBeGreaterThanOrEqual(AA);
      expect(contrast(c("--text-muted"), c(soft)), `--text-muted on ${soft}`).toBeGreaterThanOrEqual(AA);
    }
  });

  test("the parts of a control that must be seen are 3:1: input edges, the focus ring, the accent", () => {
    for (const bg of ["--surface", "--canvas", "--surface-sunk"]) {
      expect(contrast(c("--border-strong"), c(bg)), `--border-strong on ${bg}`).toBeGreaterThanOrEqual(UI);
      expect(contrast(c("--focus-ring"), c(bg)), `--focus-ring on ${bg}`).toBeGreaterThanOrEqual(UI);
      expect(contrast(c("--accent"), c(bg)), `--accent on ${bg}`).toBeGreaterThanOrEqual(UI);
    }
    expect(contrast(c("--focus-ring"), c("--accent-soft"))).toBeGreaterThanOrEqual(UI);
  });

  test("side and calendar marks are seen on every surface (3:1)", () => {
    for (const mark of MARKS) for (const bg of ["--surface", "--canvas", "--surface-sunk"]) expect(contrast(c(mark), c(bg)), `${mark} on ${bg}`).toBeGreaterThanOrEqual(UI);
  });

  test("the state colors have hues of their own: never the accent", () => {
    for (const state of STATES) {
      // Defined from the status primitives, not from the brand ones the workspace's color replaces.
      expect(themes[theme][state]).toMatch(/^var\(--(amber|red|green)-/);
      expect(themes[theme][`${state}-soft`]).toMatch(/^var\(--(amber|red|green)-/);
      for (const accent of ["--accent", "--accent-text"]) expect(apart(c(state), c(accent)), `${state} against ${accent}`).toBeGreaterThanOrEqual(DISTINCT);
      expect(c(`${state}-soft`)).not.toBe(c("--accent-soft"));
    }
    expect(new Set(STATES.map((s) => c(s))).size).toBe(STATES.length);
  });

  test("side and calendar colors differ from every state color", () => {
    for (const mark of MARKS) {
      for (const state of STATES) expect(apart(c(mark), c(state)), `${mark} against ${state}`).toBeGreaterThanOrEqual(DISTINCT);
    }
    // The first five calendars are the same hues as the five sides, and the first three differ from one another.
    for (const n of [1, 2, 3, 4, 5]) expect(c(`--cal-${n}`)).toBe(c(`--side-${n}`));
    for (const [a, b] of [[1, 2], [1, 3], [2, 3]]) expect(apart(c(`--cal-${a}`), c(`--cal-${b}`))).toBeGreaterThanOrEqual(DISTINCT);
  });
});

test("the product's own palette: burgundy by day, brass by night, warm paper and near-black surfaces", () => {
  expect(color("day", "--accent")).toBe("#741e25");
  expect(color("night", "--accent")).toBe("#e5c78d");
  expect(color("day", "--canvas")).toBe("#f5f3ee");
  expect(color("day", "--surface")).toBe("#fefdfb");
  expect(color("day", "--text-on-accent")).toBe("#fff2d8");
  expect(color("day", "--danger")).toBe("#b93815");
  expect(color("night", "--danger")).toBe("#ff8a75");
  for (const theme of THEMES) expect(color(theme, "--focus-ring")).toBe(color(theme, "--accent"));
});

test("night surfaces lift: each level is lighter than the one below, and a floating thing is lighter again", () => {
  const night = (name: string) => color("night", name);
  const order = ["--canvas", "--surface", "--surface-sunk", "--surface-hover", "--surface-raised"];
  for (let i = 1; i < order.length; i++) expect(oklab(night(order[i]))[0], `${order[i]} over ${order[i - 1]}`).toBeGreaterThan(oklab(night(order[i - 1]))[0]);
  // A card is seen by its surface, not only its hairline: the pane lifts off the canvas and has a faint top light.
  expect(contrast(night("--surface"), night("--canvas"))).toBeGreaterThan(1.05);
  expect(themes.night["--pane-edge"]).toContain("inset 0 1px 0");
  expect(themes.night["--pane-border"]).toBe("var(--border)");
  // Day keeps its soft shadow and no hairline.
  expect(themes.day["--pane-border"]).toBe("transparent");
});

test("the in-app dark choice sets exactly what the system's dark does", () => {
  expect(systemNight).toEqual(chosenNight);
  expect(Object.keys(chosenNight).length).toBeGreaterThan(30);
});

test("the faces: Inter for the interface and Fraunces for titles, both bundled and neither fetched", () => {
  expect(dayBlock["--font-ui"]).toMatch(/^"Inter Variable", Inter, /);
  expect(dayBlock["--font-display"]).toMatch(/^"Fraunces Variable", Fraunces, /);
  // Imported once in the entry, from the packages (so the files ship with the app); nothing is named by address.
  const entry = read("main.tsx");
  expect(entry).toMatch(/import "@fontsource-variable\/inter";/);
  expect(entry).toMatch(/import "@fontsource-variable\/fraunces";/);
  const packages = JSON.parse(readFileSync(join(root, "..", "package.json"), "utf8")).dependencies as Record<string, string>;
  for (const name of ["@fontsource-variable/inter", "@fontsource-variable/fraunces"]) expect(packages[name], name).toMatch(/^\d+\.\d+\.\d+$/);
  expect(readFileSync(join(root, "..", "index.html"), "utf8")).not.toMatch(/fonts\.(googleapis|gstatic)|https?:\/\//);
  expect(tokens).not.toMatch(/@import|url\(/);
  // The display face is for a page's title, a step's title and the name beside the mark; nothing else uses it.
  expect(read("ui/PageHeader.module.css")).toMatch(/h1\.title \{ font-family: var\(--font-display\)/);
  expect(read("ui/Wizard.module.css")).toMatch(/\.stepTitle \{[^}]*font-family: var\(--font-display\)/);
  expect(read("ui/Wizard.module.css")).toMatch(/\.title h1 \{[^}]*font-family: var\(--font-display\)/);
  expect(read("shell/Header.module.css")).toMatch(/\.name \{[^}]*font-family: var\(--font-display\)/);
  for (const file of ["styles.css", "ui/Row.module.css", "ui/Button.module.css", "ui/EmptyState.module.css", "components/Today.module.css", "components/Quality.module.css"]) {
    expect(read(file), file).not.toMatch(/font-display/);
  }
});

test("the mark ships in a day and a night version, as plain pictures with no words of their own", () => {
  for (const file of ["assets/brand/mark-day.svg", "assets/brand/mark-night.svg"]) {
    expect(existsSync(join(root, file)), file).toBe(true);
    const svg = read(file);
    expect(svg).toMatch(/^<svg /);
    expect(svg).not.toMatch(/<title|<desc|<text|href=|<script/);
  }
  expect(read("assets/brand/mark-day.svg")).not.toBe(read("assets/brand/mark-night.svg"));
  // The tab's icon is the mark, the night one where the browser is dark.
  const page = readFileSync(join(root, "..", "index.html"), "utf8");
  expect(page).toMatch(/rel="icon"[^>]*href="\.\/src\/assets\/brand\/mark-day\.svg"/);
  expect(page).toMatch(/rel="icon"[^>]*href="\.\/src\/assets\/brand\/mark-night\.svg"[^>]*prefers-color-scheme: dark/);
});

describe("the workspace's own color still replaces the accent", () => {
  afterEach(() => document.documentElement.removeAttribute("style"));

  test("the accent roles are read from the brand primitives the workspace's color sets", () => {
    expect(dayBlock["--accent"]).toBe("var(--brand-600)");
    expect(dayBlock["--accent-hover"]).toBe("var(--brand-700)");
    expect(dayBlock["--accent-text"]).toBe("var(--brand-650)");
    expect(dayBlock["--accent-soft"]).toBe("var(--brand-50)");
    expect(dayBlock["--text-on-accent"]).toBe("var(--brand-on)");
    expect(chosenNight["--accent"]).toBe("var(--brand-300)");
    expect(chosenNight["--accent-text"]).toBe("var(--brand-200)");
    expect(chosenNight["--accent-soft"]).toBe("var(--brand-900)");
    expect(chosenNight["--text-on-accent"]).toBe("var(--brand-on-night)");
  });

  test("applyBrand sets every primitive, the text on the accent among them, and clears them again", () => {
    applyBrand("#2e7d32");
    const style = document.documentElement.style;
    for (const name of ["--brand-600", "--brand-700", "--brand-650", "--brand-50", "--brand-300", "--brand-200", "--brand-900", "--brand-on", "--brand-on-night"]) {
      expect(style.getPropertyValue(name), name).toMatch(/^#[0-9a-f]{6}$/);
    }
    expect(style.getPropertyValue("--brand-600")).toBe("#2e7d32");
    applyBrand(null);
    expect(style.getPropertyValue("--brand-on")).toBe("");
    expect(style.getPropertyValue("--brand-on-night")).toBe("");
  });

  test("the text on a chosen color is readable on it, by day and by night, for any color the check accepts", () => {
    for (const choice of ["#2e7d32", "#3446b5", "#c2185b", "#f2b65c", "#ffd54f", "#741e25", "#0b3d91", "#e5c78d"]) {
      const set = brandTokens(choice)!;
      expect(accentContrast(choice)?.ok, choice).toBe(true);
      expect(contrast(set["--brand-on"], set["--brand-600"]), `${choice} by day`).toBeGreaterThanOrEqual(AA);
      expect(contrast(set["--brand-on-night"], set["--brand-300"]), `${choice} by night`).toBeGreaterThanOrEqual(AA);
    }
  });

  test("a color whose text cannot be read, by white or by near-black, is still refused", () => {
    // Mid-gray: neither white nor the near-black reaches 4.5:1 on it.
    const refused = accentContrast("#777777")!;
    expect(refused.ok).toBe(false);
    expect(refused.ratio).toBeLessThan(AA);
    expect(accentContrast("#741e25")!.ok).toBe(true);
    expect(accentContrast("not a color")).toBeNull();
  });
});
