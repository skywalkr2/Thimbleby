// A person with several sides whose names are long (design 6.32, 7.1; re-sweep X83): the side filter, the sidebar and the icon
// rail hold at a phone, a tablet and a desktop width. The server (`--many-sides`) has Personal beside four sides, three with
// names long enough to cut; /__e2e/many-sides says what they are called. At every width nothing is wider than the window, a long
// name is cut with an ellipsis and has its full name on hover (and in its own words for a screen reader), the filter is a list
// to pick from on a phone, and the icon rail gives each side a mark of its own.
import { expect, test, type Page } from "@playwright/test";
import { choicesOf, choose } from "./choose";

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
      for (const view of ["today", "schedule", "work/changed", "work/followups"]) {
        await go(page, view);
        const filter = width < 640 ? page.getByRole("combobox", { name: "Show" }) : page.getByRole("radiogroup", { name: "Show" });
        await expect(filter.first()).toBeVisible(LOADED);
        expect(await overflow(page), `${view} at ${width}px scrolls sideways`).toBeLessThanOrEqual(0);
        const box = await filter.first().boundingBox();
        expect(box, `${view}: the filter has a place`).not.toBeNull();
        expect(box!.x + box!.width, `${view}: the filter ends inside the window at ${width}px`).toBeLessThanOrEqual(width + 1);
        expect(box!.x).toBeGreaterThanOrEqual(0);
      }
    });
  }

  test("on a phone the side filter is a list with every side by its full name, and choosing one keeps the window as it was", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("?token=e2e-token");
    await go(page, "today");
    const list = page.getByRole("combobox", { name: "Show" });
    await expect(list).toBeVisible(LOADED);
    expect((await choicesOf(list)).map((c) => c.label)).toEqual(["All", "Personal", ...names]);
    await choose(list, { label: names[0] });
    await expect(list).toHaveAttribute("value", /PRJ-/);
    expect(await overflow(page)).toBeLessThanOrEqual(0);
    await expect(page.getByRole("radio")).toHaveCount(0);
  });

  test("on a desktop each chip is cut at a width, has its full name on hover, and the control stays inside the window", async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 800 });
    await page.goto("?token=e2e-token");
    await go(page, "today");
    const group = page.getByRole("radiogroup", { name: "Show" }).first();
    await expect(group).toBeVisible(LOADED);
    const long = names.find((n) => n.length > 40)!;
    const chip = group.getByRole("radio", { name: long });
    await expect(chip.locator("[title]").first()).toHaveAttribute("title", long);
    const width = (await chip.boundingBox())!.width;
    expect(width, "a chip is cut to about two dozen characters").toBeLessThan(330);
    const cut = await chip.locator("[title]").first().evaluate((el) => getComputedStyle(el).textOverflow);
    expect(cut).toBe("ellipsis");
  });

  test("the menu cuts a long name with an ellipsis, gives its full name on hover and never scrolls sideways", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("?token=e2e-token");
    await go(page, "today");
    const menu = page.getByRole("navigation", { name: "Views" });
    await expect(menu.getByRole("link", { name: "Personal" })).toBeVisible(LOADED);
    expect(await menu.evaluate((el) => el.scrollWidth - el.clientWidth), "the menu scrolls sideways").toBeLessThanOrEqual(0);
    const long = names.find((n) => n.length > 40)!;
    const link = menu.getByRole("link", { name: long });
    const label = link.locator('[class*="label"]');
    await expect(label).toHaveAttribute("title", long);
    expect(await label.evaluate((el) => getComputedStyle(el).textOverflow)).toBe("ellipsis");
    // Cut: the text is wider than what is shown, and the link stays inside the menu.
    expect(await label.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
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
