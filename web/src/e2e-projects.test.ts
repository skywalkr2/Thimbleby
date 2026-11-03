// Every browser spec belongs to a project of the Playwright config: a spec no project matches never runs, so a check
// written for a fix would pass by never being run.
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import config from "../playwright.config";

describe("browser specs", () => {
  it("each one is matched by a project", () => {
    const specs = readdirSync(join(__dirname, "..", "e2e")).filter((f) => f.endsWith(".spec.ts"));
    const matchers = (config.projects ?? []).map((p) => p.testMatch).filter((m): m is RegExp => m instanceof RegExp);
    const lost = specs.filter((f) => !matchers.some((m) => m.test(f)));
    expect(lost).toEqual([]);
  });
});
