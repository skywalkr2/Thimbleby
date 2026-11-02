import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

// A CSS module scopes its class names, but not an element selector: `th:first-child { width: 30% }` in one module reaches
// every table cell of that kind in the app. So every selector in a module names a class (or is marked `:global` on purpose).
function modules(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return modules(path);
    return name.endsWith(".module.css") ? [path] : [];
  });
}

/** The selectors of a rule, split at the commas that are not inside brackets or parentheses. */
function splitSelectors(head: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let current = "";
  for (const ch of head) {
    if (ch === "(" || ch === "[") depth += 1;
    if (ch === ")" || ch === "]") depth -= 1;
    if (ch === "," && depth === 0) {
      out.push(current.trim());
      current = "";
    } else current += ch;
  }
  out.push(current.trim());
  return out;
}

test("no selector in a CSS module reaches an element of another part of the app", () => {
  const unscoped: string[] = [];
  for (const file of modules("src")) {
    const css = readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    for (const match of css.matchAll(/([^{}]+)\{/g)) {
      const head = match[1].trim();
      if (head.startsWith("@") || /^(from|to|\d+%)(\s*,\s*(from|to|\d+%))*$/.test(head)) continue;
      for (const selector of splitSelectors(head)) {
        if (selector && !/[.#]|:global/.test(selector)) unscoped.push(`${file}: ${selector}`);
      }
    }
  }
  expect(unscoped).toEqual([]);
});
