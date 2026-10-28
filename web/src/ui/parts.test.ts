// One component for each kind of part (design 7.12, check C35): a screen draws a pill with ui/Pill and never with the
// older `pill` class; the older class and the unused `.tabs` style are gone from the shared styles.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const root = join(__dirname, "..");

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sources(path);
    return /\.tsx$/.test(name) && !/\.test\.tsx$/.test(name) ? [path] : [];
  });
}

test("no component draws a pill with the older class", () => {
  const found = sources(root)
    .filter((path) => /className=(?:"[^"]*|\{`[^`]*)(?<![-\w.])pill(?![-\w])/.test(readFileSync(path, "utf-8").replace(/styles\.pill/g, "")))
    .map((path) => path.slice(root.length + 1));
  expect(found).toEqual([]);
});

test("the shared styles hold no older pill or tabs rules", () => {
  const css = readFileSync(join(root, "styles.css"), "utf-8");
  expect(css).not.toMatch(/(^|\n)\.pill(?![-\w])|\.tabs(?![-\w])/);
});

// A row's title wraps to every line it needs; it is never cut to a number of lines (a long to-do is read whole), and the
// title button and the detail's state line let their row and pane grow with the words.
test("a row's title is never clamped to a number of lines", () => {
  const css = readFileSync(join(root, "ui", "Row.module.css"), "utf-8");
  const title = css.match(/\n\.title \{[^}]*\}/)?.[0] ?? "";
  expect(title).not.toBe("");
  expect(title).not.toMatch(/line-clamp|overflow: hidden/);
});

test("the title button grows with its words and the detail's menu shares the state's line", () => {
  const css = readFileSync(join(root, "styles.css"), "utf-8");
  expect(css.match(/\n\.expander \{[^}]*\}/)?.[0]).toMatch(/display: block/);
  expect(css.match(/\n\.expander \{[^}]*\}/)?.[0]).not.toMatch(/(?<!min-)height: \d/);
  expect(css.match(/\n\.detail-top \{[^}]*\}/)?.[0]).not.toMatch(/flex-wrap: wrap/);
});
