// Every browser spec belongs to a project of the Playwright config: a spec no project matches never runs, so a check
// written for a fix would pass by never being run.
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import config, { allProjects, allServers } from "../playwright.config";
import { namedProjects, selectServers, type Selectable } from "../playwright.select";

describe("browser specs", () => {
  it("each one is matched by a project", () => {
    const specs = readdirSync(join(__dirname, "..", "e2e")).filter((f) => f.endsWith(".spec.ts"));
    const matchers = (config.projects ?? []).map((p) => p.testMatch).filter((m): m is RegExp => m instanceof RegExp);
    const lost = specs.filter((f) => !matchers.some((m) => m.test(f)));
    expect(lost).toEqual([]);
  });
});

// The config starts only the servers the named projects need (`--project`), and all of them when none is named.
describe("web servers started for a run", () => {
  const projects = allProjects as Selectable[];
  const commands = (named: string[]) => selectServers(allServers, projects, named).map((s) => s.command);
  const has = (list: string[], text: string) => list.filter((c) => c.includes(text)).length;

  it("reads the projects from the command line or PW_PROJECTS", () => {
    expect(namedProjects(["test", "--project=layout", "--project", "accounts", "a11y"])).toEqual(["layout", "accounts", "a11y"]);
    expect(namedProjects(["test"], { PW_PROJECTS: "layout, accounts" })).toEqual(["layout", "accounts"]);
    expect(namedProjects(["test"])).toEqual([]);
  });

  it("starts only the layout server for the layout project", () => {
    const c = commands(["layout"]);
    expect(c).toHaveLength(1);
    expect(c[0]).toContain("--layout-stress");
  });

  it("starts the app and the fake services, and nothing else, for accounts", () => {
    const c = commands(["accounts"]);
    expect(c).toHaveLength(2);
    expect(has(c, "tests.e2e_fresh_server")).toBe(1);
    expect(has(c, "tests.fake_services")).toBe(1);
  });

  it("starts the root server once for the root projects, and the nested one for a nested project", () => {
    expect(commands(["root-shell", "root-a11y"])).toHaveLength(1);
    const c = commands(["root-*", "nested-shell"]);
    expect(c).toHaveLength(2);
    expect(has(c, "--base-path /admin")).toBe(1);
  });

  it("starts every server when no project is named", () => {
    expect(commands([])).toHaveLength(allServers.length);
  });

  it("starts a server for each project when all are named", () => {
    const all = commands(projects.map((p) => p.name));
    expect(all).toHaveLength(allServers.length);
  });
});
