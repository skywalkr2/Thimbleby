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

// One chevron draws every fold: no style sheet puts a text triangle before a fold's title, and each fold that draws a chevron takes
// the one token (`--chevron-clip`), so they can't drift apart.
test("no style sheet draws a fold's mark as a text triangle or its own chevron; every one uses the shared token", () => {
  const sheets = (dir: string): string[] =>
    readdirSync(dir).flatMap((name) => {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) return sheets(path);
      return /\.css$/.test(name) ? [path] : [];
    });
  const triangles = /content:\s*["']\\?(25B8|25BE|▸|▾|▶)/i;
  const own: string[] = [];
  const users: string[] = [];
  for (const path of sheets(root)) {
    const text = readFileSync(path, "utf-8");
    if (triangles.test(text)) own.push(path.slice(root.length + 1));
    if (text.includes("--chevron-clip")) users.push(path.slice(root.length + 1));
  }
  expect(own).toEqual([]);
  // The fold chevrons of the shared styles, Today's fold and the brief card's, and the filter chip's caret.
  expect(users).toEqual(expect.arrayContaining(["styles.css", "components/Today.module.css", "components/BriefCard.module.css", "ui/FilterChip.module.css", "theme/tokens.css"]));
});
