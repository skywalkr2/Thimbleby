// A screen that is waiting for its data shows the shape of what is coming (ui/Skeleton, with `aria-busy`), never the word
// "Loading…" as text (design 7.12, check C41). The word is only the skeleton's accessible name.
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

test("no component shows Loading as text: waiting is a skeleton", () => {
  const found = sources(root)
    .filter((path) => !path.endsWith(join("ui", "Skeleton.tsx")))
    .filter((path) => /\bt\(\s*"loading"\s*\)|"loading"\s*\)|\?\s*"welcome\.failed"\s*:\s*"loading"/.test(readFileSync(path, "utf-8")))
    .map((path) => path.slice(root.length + 1));
  expect(found).toEqual([]);
});
