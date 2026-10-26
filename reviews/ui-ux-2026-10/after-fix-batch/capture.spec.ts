// Makes the captures in this folder: <screen>-<mode>-<width>.jpg. Read-only: nothing is filled in or saved.
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { test, type Page } from "@playwright/test";

const OUT = __dirname;
const TOKEN = "e2e-token";
const MODES = ["day", "night"] as const;
const SIZES = [
  { w: 1440, h: 900 },
  { w: 390, h: 844 },
];
const failed: string[] = [];

async function shot(page: Page, name: string, mode: string, w: number) {
  await page.waitForTimeout(2500);
  await page.screenshot({ path: join(OUT, `${name}-${mode}-${w}.jpg`), type: "jpeg", quality: 75, fullPage: true });
}

async function open(page: Page, base: string, hash: string, token: string, mode: string) {
  await page.addInitScript((m) => {
    try {
      window.localStorage.setItem("cockpit:theme", m === "night" ? "dark" : "light");
    } catch {}
  }, mode);
  await page.goto(`${base}?token=${token}#${hash}`);
  await page.locator("main").first().waitFor({ timeout: 30_000 });
}

const SCREENS: [string, string][] = [
  ["today", "today"], ["work-changed", "work/changed"], ["work-followups", "work/followups"], ["work-open", "work/open"],
  ["work-handled", "work/handled"], ["schedule", "schedule"], ["work-outgoing", "work/outgoing"], ["work-stages", "work/stages"], ["records-projects", "records/projects"],
  ["records-people", "records/people"], ["records-files", "records/files"], ["records-knowledge", "records/knowledge"],
  ["sources", "sources"], ["addons", "addons"], ["quality", "quality"], ["handover", "handover"],
  ["settings-you", "settings/you"], ["settings-ai", "settings/ai"], ["settings-backups", "settings/backups"],
  ["settings-today", "settings/today"], ["settings-appearance", "settings/appearance"], ["settings-lists", "settings/lists"],
  ["settings-files", "settings/files"], ["settings-advanced", "settings/advanced"], ["settings-ai-compare", "settings/ai-compare"],
];
const STEPS = ["you", "work", "ai", "mail", "promises", "backup", "people", "done"];

for (const mode of MODES) {
  for (const size of SIZES) {
    test(`${mode} ${size.w}`, async ({ browser }) => {
      const demo = process.env.CAP_DEMO!;
      const ctx = await browser.newContext({
        viewport: { width: size.w, height: size.h },
        colorScheme: mode === "night" ? "dark" : "light",
        reducedMotion: "reduce",
      });
      const page = await ctx.newPage();
      const attempt = async (name: string, fn: () => Promise<void>) => {
        try {
          await fn();
        } catch (e) {
          failed.push(`${name}-${mode}-${size.w}: ${String(e).split("\n")[0]}`);
        }
      };
      for (const [name, hash] of SCREENS) await attempt(name, async () => { await open(page, demo, hash, TOKEN, mode); await shot(page, name, mode, size.w); });

      // Settings > Connections, from the side bar.
      await attempt("settings-connections", async () => {
        await open(page, demo, "settings/you", TOKEN, mode);
        await page.getByRole("navigation", { name: "Settings sections" }).getByRole("link", { name: "Connections", exact: true }).click();
        await shot(page, "settings-connections", mode, size.w);
      });

      // A project page (the first Personal one if there is one, else the first), and one business project, and a person.
      const rec = async (path: string) => (await (await page.request.get(`${demo}api/${path}`, { headers: { Authorization: `Bearer ${TOKEN}`, "X-Cockpit-Token": TOKEN } })).json()) as { id: string; name?: string; role?: string }[];
      await attempt("records", async () => {
        await open(page, demo, "today", TOKEN, mode);
        const projects = await rec("projects");
        const business = projects[0];
        await open(page, demo, `records/project/${encodeURIComponent(business.id)}`, TOKEN, mode);
        await shot(page, "project-business", mode, size.w);
        const people = await rec("people");
        await open(page, demo, `records/person/${encodeURIComponent(people[0].id)}`, TOKEN, mode);
        await shot(page, "person", mode, size.w);
      });

      // The hand-in drawer and the status popover, over Today.
      await attempt("hand-in", async () => {
        await open(page, demo, "today", TOKEN, mode);
        await page.getByRole("button", { name: "Hand something in" }).first().click();
        await shot(page, "hand-in-drawer", mode, size.w);
      });
      await attempt("status", async () => {
        await open(page, demo, "today", TOKEN, mode);
        const chip = page.getByRole("button", { name: /^App status: / }).first();
        if (!(await chip.isVisible())) await page.getByRole("button", { name: "More" }).first().click();
        await page.getByRole("button", { name: /^App status: / }).first().click();
        await shot(page, "status-popover", mode, size.w);
      });
      await attempt("set-aside", async () => {
        await open(page, demo, "today", TOKEN, mode);
        await page.getByRole("button", { name: /\d+ set aside/ }).first().click({ timeout: 5_000 });
        await page.locator("#set-aside").scrollIntoViewIfNeeded();
        await shot(page, "set-aside", mode, size.w);
      });

      // Setup steps on the fresh workspace, each before filling in.
      const token = (await (await fetch(`http://127.0.0.1:${process.env.CAP_FAKE}/__e2e/info`)).json()).token as string;
      await attempt("project-personal", async () => {
        const fresh = process.env.CAP_FRESH!;
        await open(page, fresh, "today", token, mode);
        const ps = (await (await page.request.get(`${fresh}api/projects`)).json()) as { id: string; name?: string }[];
        const p = ps.find((x) => /personal/i.test(`${x.name} ${x.id}`)) ?? ps[0];
        await open(page, fresh, `records/project/${encodeURIComponent(p.id)}`, token, mode);
        await shot(page, "project-personal", mode, size.w);
      });
      for (const step of STEPS) {
        await attempt(`setup-${step}`, async () => {
          await open(page, process.env.CAP_FRESH!, "setup", token, mode);
          await page.locator(`button[data-screen="${step}"]`).first().click();
          await page.waitForTimeout(800);
          await shot(page, `setup-${step}`, mode, size.w);
        });
      }
      await ctx.close();
    });
  }
}
test.afterAll(() => { if (failed.length) console.log("CAPTURE FAILURES:\n" + failed.join("\n")); });
