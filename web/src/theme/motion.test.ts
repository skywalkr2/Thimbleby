// Motion (design 7.12): only the brand mark has a long entrance, on the first and last setup screens; everything else keeps its
// short state change; nothing moves when the person has asked for less motion. Every shared control answers hover, press and focus.
// Styles are not computed under jsdom, so these read the stylesheets.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(__dirname, "..");
const read = (file: string) => readFileSync(join(root, file), "utf8");
const tokens = read("theme/tokens.css");

test("the mark's entrance is the one long motion, it is off under reduced motion, and only the setup's two brand screens carry it", () => {
  expect(tokens).toMatch(/--dur-mark:\s*\d+ms/);
  const reduced = tokens.slice(tokens.indexOf("@media (prefers-reduced-motion: reduce)"));
  expect(reduced.split("\n")[0]).toContain("--dur-mark: 0ms");
  const brand = read("components/SetupBrand.module.css");
  expect(brand).toMatch(/@media \(prefers-reduced-motion: no-preference\)\s*\{[^@]*animation:[^;]*var\(--dur-mark\)/s);
  // No other stylesheet uses the long duration or draws the mark.
  const uses = (dir: string): string[] =>
    readdirSync(join(root, dir), { recursive: true, withFileTypes: true })
      .filter((f) => f.isFile() && /\.(css|tsx)$/.test(f.name) && !f.name.includes(".test."))
      .map((f) => join(f.parentPath ?? (f as unknown as { path: string }).path, f.name))
      .filter((path) => /--dur-mark|SetupBrand/.test(readFileSync(path, "utf8")))
      .map((path) => path.slice(root.length + 1));
  expect(uses(".").sort()).toEqual(
    ["components/SetupBrand.module.css", "components/SetupBrand.tsx", "components/Walkthrough.tsx", "theme/tokens.css"].sort(),
  );
  // The walkthrough shows the brand on Welcome and Done only.
  expect(read("components/Walkthrough.tsx")).toMatch(/const brand = current === "welcome" \|\| current === "done"/);
});

// The shared controls a person presses. Focus is one rule for every control (the global :focus-visible ring).
const CONTROLS = [
  "Button", "FilterChip", "Select", "TimeField", "DateField", "TabStrip", "SegmentedControl", "RadioCard", "StatusChip", "RoundCheck", "SearchField", "MenuButton",
];
test.each(CONTROLS)("%s has a hover and a pressed state", (name) => {
  const css = read(`ui/${name}.module.css`);
  expect(css).toMatch(/:hover/);
  if (name !== "SearchField") expect(css).toMatch(/:active/);
});

test("every control shows the one focus ring", () => {
  expect(tokens).toMatch(/:focus-visible\s*\{[^}]*box-shadow:[^}]*--focus-ring/s);
});
