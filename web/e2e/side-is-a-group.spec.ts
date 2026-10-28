// A side is a group, never a project (design 6.32; roadmap check P77): on a fresh workspace after setup with a business, the
// business's page and an empty project's page are read at a narrow, a wide and a very wide window. Neither shows a row of
// "nothing yet" parts (a part with nothing in it is left out, and a page with nothing says so in one line), neither is wider
// than the window, and the business's Edit details is a small form with a name, other names and a description, never the
// project form with a target date, a status or a role. The server (`--just-me`) is a workspace made with nothing besides
// Personal; the test adds the business through the setup route, as setup does, and a project inside it.
import { expect, test, type Page } from "@playwright/test";

const LOADED = { timeout: 20_000 };
const WIDTHS = [700, 1440, 2000];
// What each empty part of a project's page used to say; none is shown any more.
const EMPTY_PARTS = /Nothing has come in|No facts are recorded|No terms are used|No one is named for any kind of question|Nothing is unknown right now/;
const AUTH = { Authorization: "Bearer e2e-token" };

// Made-up and plain: the business's name and its description, and one project inside it.
const SIDE = "Example Imprint";
const SUMMARY = `${SIDE} is a small independent publisher.`;
const PROJECT = "First catalog";

let side = "";
let project = "";

const go = (page: Page, hash: string) =>
  page.evaluate((to) => {
    window.location.hash = to;
  }, hash);

const wider = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

test.describe("a business is a group, not a project", () => {
  test.beforeAll(async ({ request }) => {
    const made = await request.post("api/setup/business", { headers: AUTH, data: { name: SIDE, kind: "business", summary: SUMMARY } });
    expect(made.ok()).toBe(true);
    side = (await made.json()).project;
    // A worker that starts again after a failure finds the project there already.
    const added = await request.post("api/projects", { headers: AUTH, data: { name: PROJECT, parent: side } });
    if (added.ok()) project = (await added.json()).id;
    else project = ((await (await request.get("api/projects", { headers: AUTH })).json()) as Array<{ id: string; name: string }>).find((p) => p.name === PROJECT)!.id;
  });

  test.beforeEach(async ({ page }) => {
    await page.goto("?token=e2e-token");
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible(LOADED);
  });

  for (const width of WIDTHS) {
    test(`the business's page and an empty project's page show no row of empty parts and fit a ${width}px window`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      for (const [hash, title] of [
        [`records/project/${encodeURIComponent(side)}`, SIDE],
        [`records/project/${encodeURIComponent(project)}`, PROJECT],
      ] as const) {
        await go(page, hash);
        await expect(page.getByRole("heading", { level: 1, name: title, exact: true })).toBeVisible(LOADED);
        const knows = page.locator("[data-project-knows]");
        await expect(knows).toBeVisible(LOADED);
        await expect(knows.locator("[data-skeleton]")).toHaveCount(0, LOADED);
        // Nothing has come in yet: no part is shown empty, and the page says so once, in one line.
        await expect(knows.getByText("doesn't know anything here yet", { exact: false })).toHaveCount(1);
        await expect(knows.locator("p.empty")).toHaveCount(1);
        await expect(knows.getByRole("heading", { level: 3 })).toHaveCount(0);
        expect(await knows.innerText()).not.toMatch(EMPTY_PARTS);
        // Who reads it is a plain line, not a card of its own.
        await expect(knows.getByText("Who reads it:", { exact: false })).toHaveCount(1);
        expect(await wider(page)).toBeLessThanOrEqual(0);
      }
    });
  }

  test("the business's page lists its projects and its Edit details has no target date, status or role", async ({ page }) => {
    await go(page, `records/project/${encodeURIComponent(side)}`);
    const inside = page.getByRole("region", { name: "Projects", exact: true });
    await expect(inside.getByRole("link", { name: PROJECT })).toBeVisible(LOADED);
    // A group: no "Edit project", and no project-only rows in its details.
    const details = page.getByRole("region", { name: "Details", exact: true });
    await expect(details.getByText(SUMMARY)).toBeVisible(LOADED);
    await expect(details.getByText(/Target|Status|Phase|Priority|Your role/)).toHaveCount(0);
    await page.getByRole("button", { name: "Edit details" }).click();
    const drawer = page.getByRole("dialog", { name: `Edit ${SIDE}` });
    await expect(drawer).toBeVisible(LOADED);
    await expect(drawer.getByRole("textbox", { name: "Name", exact: true })).toBeFocused();
    await expect(drawer.getByRole("textbox", { name: /Other names/ })).toBeVisible();
    await expect(drawer.getByRole("textbox", { name: "Description" })).toHaveValue(SUMMARY);
    for (const projectOnly of [/Target/, /Status/, /Phase/, /Priority/, /Group/, /Owner/, /Your role/, /Inside/, /Budget/]) {
      await expect(drawer.getByLabel(projectOnly)).toHaveCount(0);
    }
    await expect(page.getByRole("dialog", { name: "Edit project" })).toHaveCount(0);
  });

  test("the Projects screen lists the business as a heading with its project under it, and counts only projects", async ({ page }) => {
    await go(page, "records/projects");
    await expect(page.getByRole("heading", { level: 1, name: "Projects", exact: true })).toBeVisible(LOADED);
    const group = page.getByRole("rowgroup", { name: SIDE });
    await expect(group.getByRole("link", { name: SIDE })).toBeVisible(LOADED);
    await expect(group.getByRole("link", { name: PROJECT })).toBeVisible(LOADED);
    // Only the project has a menu; the business's heading has none.
    await expect(page.getByRole("button", { name: `More actions for ${SIDE}` })).toHaveCount(0);
    await expect(page.getByRole("button", { name: `More actions for ${PROJECT}` })).toBeVisible(LOADED);
  });
});
