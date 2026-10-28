import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "vitest";

// A fold built on <details class="more-options"> lays its summary out as a flex row, which takes the browser's own marker away,
// so the stylesheet draws the control: an icon before the title and a different one once it is open.
test("a fold's summary draws its own control, and the open fold looks different", () => {
  const css = readFileSync(join(__dirname, "styles.css"), "utf8");
  expect(css).toMatch(/\.more-options > summary::before\s*\{[^}]*content:\s*""/);
  expect(css).toMatch(/\.more-options\[open\] > summary::before\s*\{[^}]*transform/);
});
