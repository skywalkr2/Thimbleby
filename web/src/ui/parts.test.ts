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

// A row's title wraps to every line it needs (a long to-do is read whole); only a list that asks for `clamp`, Today's
// queue, cuts it to two lines, with the full words in the title attribute and in the open details. The title button and
// the detail's state line let their row and pane grow with the words.
test("a row's title is never clamped to a number of lines unless the list opts in", () => {
  const css = readFileSync(join(root, "ui", "Row.module.css"), "utf-8");
  const title = css.match(/\n\.title \{[^}]*\}/)?.[0] ?? "";
  expect(title).not.toBe("");
  expect(title).not.toMatch(/line-clamp|overflow: hidden/);
  expect(css.match(/\n\.clamp \{[^}]*\}/)?.[0]).toMatch(/line-clamp: 2/);
  const queue = readFileSync(join(root, "components", "TodayQueue.tsx"), "utf-8");
  expect(queue).toMatch(/clamp=\{title\}/);
});

test("an expandable row's title is a button that covers the row's text and grows with its words; the detail's menu shares the state's line", () => {
  const css = readFileSync(join(root, "ui", "Row.module.css"), "utf-8");
  const expander = css.match(/\n\.expander \{[^}]*\}/)?.[0] ?? "";
  expect(expander).toMatch(/display: inline/);
  expect(expander).not.toMatch(/(?<!min-)height: \d/);
  expect(css).toMatch(/\.expander::after \{[^}]*position: absolute; inset: 0/);
  const top = readFileSync(join(root, "ui", "DetailTop.module.css"), "utf-8");
  expect(top.match(/(^|\n)\.top \{[^}]*\}/)?.[0]).not.toMatch(/flex-wrap: wrap/);
});

test("the older line, row, queue, kind, text, acts and expander classes are gone from every screen", () => {
  const found = sources(root).filter((path) =>
    /className=(?:"[^"]*|\{`[^`]*)(?<![-\w.])(line|row|queue|kind|k-(?:review|send|held|risk|wait|done)|text|acts|expander|children|child|in-pane|row-end|sub)(?![-\w])/.test(readFileSync(path, "utf-8")),
  );
  expect(found.map((path) => path.slice(root.length + 1))).toEqual([]);
});
