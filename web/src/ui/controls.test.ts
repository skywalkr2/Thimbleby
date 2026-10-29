// One component for each kind of form control (design 7.12, VC05, check E12): a screen draws a list with ui/Select, a date or
// time with ui/DateField, a file with ui/FileDrop, a group of ticks with ui/CheckboxGroup and a labelled field with
// ui/FormField, and never with the native element. The older global field and fieldset styles are gone from the shared styles.
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

const screens = sources(root).filter((path) => !/[\\/]ui[\\/](Select|DateField|FileDrop|CheckboxGroup|SearchField)\.tsx$/.test(path));
const found = (pattern: RegExp) => screens.filter((path) => pattern.test(readFileSync(path, "utf-8"))).map((path) => path.slice(root.length + 1));

test("no screen draws a native select, date or time input, or fieldset", () => {
  expect(found(/<select[\s>]/)).toEqual([]);
  expect(found(/<fieldset[\s>]/)).toEqual([]);
  expect(found(/<input[^>]*\stype="(date|time|datetime-local)"/)).toEqual([]);
});

test("a search box is a SearchField: a magnifier and a placeholder, its label for screen readers", () => {
  expect(found(/<input[^>]*\stype="search"/)).toEqual([]);
});

test("a file input is a FileDrop, or hidden and opened from a button", () => {
  const bare = screens.filter((path) => {
    const text = readFileSync(path, "utf-8");
    return [...text.matchAll(/<input[^>]*type="file"[^>]*>/gs)].some((m) => !/\shidden[\s/>]/.test(m[0]));
  });
  expect(bare.map((path) => path.slice(root.length + 1))).toEqual([]);
});

test("the shared styles hold no older field or fieldset rules", () => {
  const css = readFileSync(join(root, "styles.css"), "utf-8");
  expect(css).not.toMatch(/(^|\n)\.field[\s.{:]|fieldset\.details|\.change legend/);
  expect(css).not.toMatch(/(^|\n)textarea, select, input/);
});

test("no screen draws a field's wrapper with the older class", () => {
  expect(found(/className="field[ "]/)).toEqual([]);
});
