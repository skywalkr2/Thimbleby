// Every page reached from Settings keeps the Settings side bar, so the person can go from any page to any other without
// choosing Settings again; and none of them is wider than the window.
import { expect, test, type Page } from "@playwright/test";

const LOADED = { timeout: 20_000 };
const WIDTHS = [
  { width: 390, height: 844 },
  { width: 1024, height: 768 },
  { width: 1512, height: 982 },
];

const bar = (page: Page) => page.getByRole("navigation", { name: "Settings sections" });

const wide = (page: Page) =>
  page.evaluate(() => ({ window: window.innerWidth, page: document.documentElement.scrollWidth, body: document.body.scrollWidth }));

async function notWider(page: Page, where: string) {
  const found = await wide(page);
  expect(found.page, `${where}: page`).toBeLessThanOrEqual(found.window);
  expect(found.body, `${where}: body`).toBeLessThanOrEqual(found.window);
}

test("every Settings page keeps the side bar, and the person can go back to any other", async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto("?token=e2e-token#settings/you");
  await expect(bar(page).getByRole("link", { name: "Advanced", exact: true })).toBeVisible(LOADED);
  const names = (await bar(page).getByRole("link").allTextContents()).map((n) => n.trim());
  expect(names.length).toBeGreaterThan(4);
  expect(names).toContain("Connections");

  for (const size of WIDTHS) {
    await page.setViewportSize(size);
    // Out through each link of the side bar and back to the first section: the bar is there each time.
    for (const name of names) {
      await bar(page).getByRole("link", { name, exact: true }).click();
      await expect(bar(page), `${name} at ${size.width}`).toBeVisible(LOADED);
      await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible(LOADED);
      await notWider(page, `${name} at ${size.width}`);
      await bar(page).getByRole("link", { name: names[0], exact: true }).click();
      await expect(bar(page).getByRole("link", { name: names[0], exact: true })).toHaveAttribute("aria-current", "page", LOADED);
    }
  }
});

test("Connections, Add-ons and what each account can do open inside Settings", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("?token=e2e-token#settings/you");
  await expect(bar(page)).toBeVisible(LOADED);
  await bar(page).getByRole("link", { name: "Connections", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Connections", exact: true })).toBeVisible(LOADED);
  await expect(bar(page)).toBeVisible();
  await bar(page).getByRole("link", { name: "Appearance", exact: true }).click();
  await expect(bar(page).getByRole("link", { name: "Appearance", exact: true })).toHaveAttribute("aria-current", "page", LOADED);

  await page.goto("?token=e2e-token#settings/ai-compare");
  await expect(bar(page)).toBeVisible(LOADED);
  await notWider(page, "what each account can do");
  await page.goto("?token=e2e-token#addons");
  await expect(bar(page)).toBeVisible(LOADED);
  await notWider(page, "Add-ons");
});
