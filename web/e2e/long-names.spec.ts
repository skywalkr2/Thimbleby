// A person with several sides whose names are long (design 6.32, 7.1; re-sweep X83): the side filter, the sidebar and the icon
// rail hold at a phone, a tablet and a desktop width. The server (`--many-sides`) has Personal beside four sides, three with
// names long enough to cut; /__e2e/many-sides says what they are called. At every width nothing is wider than the window, a long
// name is cut with an ellipsis and has its full name on hover (and in its own words for a screen reader), the filter is one button
// that opens a sheet to pick from on a phone and up to 1100px, and the icon rail gives each side a mark of its own.
import { expect, test, type Page } from "@playwright/test";

const LOADED = { timeout: 20_000 };
const WIDTHS = [390, 768, 1024, 1280, 1440];

let names: string[];

const go = (page: Page, hash: string) =>
  page.evaluate((to) => {
    window.location.hash = to;
  }, hash);

/** The widest any element reaches past the window, in pixels (none when nothing is wider than it). */
const overflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

test.describe("Long names of sides", () => {
  test.beforeAll(async ({ request }) => {
    const seeded = await (await request.get("__e2e/many-sides")).json();
    expect(seeded.enabled).toBe(true);
    names = seeded.names;
    expect(names.length).toBeGreaterThanOrEqual(4);
  });

  for (const width of WIDTHS) {
    test(`at ${width}px the side filter and the screens it sits on are never wider than the window`, async ({ page }) => {
      test.setTimeout(120_000);
      await page.setViewportSize({ width, height: 900 });
      await page.goto("?token=e2e-token");
      for (const view of ["today", "schedule", "work/changed", "work/handled"]) {
        await go(page, view);
        // Names this long are never a row of cut chips: at every width the filter is one button that opens a sheet.
        // On a phone the choice sits in the Filter sheet of each screen, so only the wider windows draw the button in the page.
        if (width > 390) await expect(page.getByRole("button", { name: /^Side: / }).first()).toBeVisible(LOADED);
        else await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible(LOADED);
        expect(await overflow(page), `${view} at ${width}px scrolls sideways`).toBeLessThanOrEqual(0);
      }
    });
  }

  test("on a phone the side filter is one button that opens a sheet with every side by its full name, and choosing one keeps the window as it was", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("?token=e2e-token");
    await go(page, "today");
    const button = page.getByRole("button", { name: /^Side: / });
    await expect(button).toBeVisible(LOADED);
    await expect(page.getByRole("radiogroup", { name: "Show" })).toHaveCount(0);
    await button.click();
    const sheet = page.getByRole("dialog", { name: "Show one side" });
    await expect(sheet).toBeVisible();
    const labels = await sheet.locator("[data-side-option]").evaluateAll((els) => els.map((el) => (el.querySelector("span")?.textContent ?? "").trim()));
    expect(labels).toEqual(["All", "Personal", ...names]);
    await sheet.getByRole("button", { name: names[0] }).click();
    await expect(sheet).toHaveCount(0);
    await expect(page.getByRole("button", { name: `Side: ${names[0]}` })).toBeVisible();
    expect(await overflow(page)).toBeLessThanOrEqual(0);
  });

  test("on a desktop long names are the one button's sheet, whole, and the control stays inside the window", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("?token=e2e-token");
    await go(page, "today");
    const button = page.getByRole("button", { name: /^Side: / });
    await expect(button).toBeVisible(LOADED);
    await expect(page.getByRole("radiogroup", { name: "Show" })).toHaveCount(0);
    const box = (await button.boundingBox())!;
    expect(box.x + box.width, "the button ends inside the window").toBeLessThanOrEqual(1280);
    await button.click();
    const sheet = page.getByRole("dialog", { name: "Show one side" });
    const long = names.find((n) => n.length > 40)!;
    await expect(sheet.getByRole("button", { name: long })).toBeVisible();
    expect(await overflow(page)).toBeLessThanOrEqual(0);
  });

  test("the menu names a long side whole to a screen reader, keeps it inside the menu and never scrolls sideways", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("?token=e2e-token");
    await go(page, "today");
    const menu = page.getByRole("navigation", { name: "Views" });
    await expect(menu.getByRole("link", { name: "Personal" })).toBeVisible(LOADED);
    expect(await menu.evaluate((el) => el.scrollWidth - el.clientWidth), "the menu scrolls sideways").toBeLessThanOrEqual(0);
    const long = names.find((n) => n.length > 40)!;
    const link = menu.getByRole("link", { name: long });
    await expect(link).toBeVisible();
    const menuBox = (await menu.boundingBox())!;
    const linkBox = (await link.boundingBox())!;
    expect(linkBox.x + linkBox.width).toBeLessThanOrEqual(menuBox.x + menuBox.width + 1);
  });

  test("on the icon rail each side has a mark of its own, not the same icon five times, with the name in the link's own words", async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 800 });
    await page.goto("?token=e2e-token");
    await go(page, "today");
    const menu = page.getByRole("navigation", { name: "Views" });
    await expect(menu.getByRole("link", { name: "Personal" })).toBeVisible(LOADED);
    const marks: string[] = [];
    for (const name of ["Personal", ...names]) {
      const link = menu.getByRole("link", { name });
      await expect(link).toBeVisible();
      marks.push((await link.locator('[class*="glyph"]').textContent()) ?? "");
    }
    expect(marks.every((m) => m.length > 0)).toBe(true);
    expect(new Set(marks).size, `the marks ${marks.join(", ")} are all different`).toBe(marks.length);
    expect(await overflow(page)).toBeLessThanOrEqual(0);
  });
});
