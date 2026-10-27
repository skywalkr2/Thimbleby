// A mark that says done, failed, warning, open or "leaves the app" is a line icon from ui/Icon, never a text glyph, so it
// draws the same everywhere and takes the text color (design 7.12, check C36).
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const root = join(__dirname, "..");
const GLYPHS = /[✓✔✕✗✘→↗○⚠▸▾]/;

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sources(path);
    return /\.tsx$/.test(name) && !/\.test\.tsx$/.test(name) ? [path] : [];
  });
}

test("no component draws a status mark or an arrow as a text glyph", () => {
  const found = sources(root).flatMap((path) =>
    readFileSync(path, "utf-8")
      .split("\n")
      .map((text, i) => ({ text, at: `${path.slice(root.length + 1)}:${i + 1}` }))
      .filter(({ text }) => GLYPHS.test(text) && !/^\s*(\/\/|\*|\/\*)/.test(text))
      .map(({ at }) => at),
  );
  expect(found).toEqual([]);
});
