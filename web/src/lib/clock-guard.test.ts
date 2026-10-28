import { expect, test } from "vitest";

// Every moment on every screen is written on the person's own clock (`lib/dates.ts`). A screen that formats a moment with the
// computer's clock would show a different time from the next screen, so none builds its own: this reads the sources and
// fails on the calls that do.

const sources = import.meta.glob(["../**/*.ts", "../**/*.tsx", "!../**/*.test.ts", "!../**/*.test.tsx", "!../api/schema.d.ts"], {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

/** The files that may read a moment's parts on the computer's clock, and why: the module that is the one place, and the
 * ones that write a date by a strftime pattern or a month and day for a calendar date, which have no zone to move. */
const ALLOWED = new Set(["../lib/dates.ts", "../lib/date-formats.ts"]);

const FORBIDDEN: [RegExp, string][] = [
  [/\.toLocale(Time|Date)String\(/, "toLocaleTimeString or toLocaleDateString"],
  [/\.getHours\(\)/, "getHours"],
  [/\.getTimezoneOffset\(/, "getTimezoneOffset"],
  [/DateTimeFormat\([^)]*\{[^}]*\b(hour|minute|timeStyle)\b/s, "a time formatter of its own"],
];

test("no screen writes a moment on the computer's clock: they all go through the dates module", () => {
  const found: string[] = [];
  for (const [key, text] of Object.entries(sources)) {
    const file = key.replace(/^\.\//, "../lib/");
    if (ALLOWED.has(file)) continue;
    for (const [pattern, name] of FORBIDDEN) if (pattern.test(text)) found.push(`${file}: ${name}`);
  }
  expect(found).toEqual([]);
});
