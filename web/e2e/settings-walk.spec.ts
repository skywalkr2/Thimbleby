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
  expect(names).toContain("Add-ons");
  // The pages of basic settings come first, in plain words; Quality is in the person's menu, not here.
  expect(names.slice(0, 5)).toEqual(["You", "AI and spending", "Notices", "Backups", "Appearance"]);
  expect(names).not.toContain("Quality");
  expect(names).not.toContain("Lists");

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
  await page.goto("?token=e2e-token#settings/addons");
  await expect(bar(page)).toBeVisible(LOADED);
  await notWider(page, "Add-ons");
  // The old addresses of the two screens open their sections, and the address says where they went.
  await page.goto("?token=e2e-token#addons");
  await expect(page.getByRole("heading", { level: 1, name: "Add-ons", exact: true })).toBeVisible(LOADED);
  expect(new URL(page.url()).hash).toBe("#settings/addons");
  await page.goto("?token=e2e-token#sources");
  await expect(page.getByRole("heading", { level: 1, name: "Connections", exact: true })).toBeVisible(LOADED);
  expect(new URL(page.url()).hash).toBe("#settings/connections");
});

// The settings walk: the rows on the pages of basic settings and behind Advanced are few, in plain words, and none shows a
// key, an id or a word of the files (the Settings cut).
const FILE_WORDS = /^Ui |^Watch |^Steward |PRJ-|PER-|tasks\.|json|tier/;
const MOST_LABEL = 60;

test("the settings walk counts at most 26 basic and 30 advanced settings, each labelled in plain words", async ({ page }) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("?token=e2e-token#settings/you");
  await expect(bar(page).getByRole("link", { name: "Advanced", exact: true })).toBeVisible(LOADED);
  const names = (await bar(page).getByRole("link").allTextContents()).map((n) => n.trim());
  const labels: string[] = [];
  const headings: string[] = [];
  let basic = 0;
  for (const name of ["You", "AI and spending", "Notices", "Backups", "Appearance", "Your business"]) {
    if (!names.includes(name)) continue;
    await bar(page).getByRole("link", { name, exact: true }).click();
    await expect(page.getByRole("heading", { level: 2 }).first()).toBeVisible(LOADED);
    basic += await page.locator(".setting").count();
    labels.push(...(await page.locator(".setting .setting-label").allTextContents()));
    headings.push(...(await page.locator("main h2, main h3").allTextContents()));
  }
  expect(basic).toBeLessThanOrEqual(26);

  await bar(page).getByRole("link", { name: "Advanced", exact: true }).click();
  const toggles = page.locator(".settings-topic .topic-toggle");
  await expect(toggles.first()).toBeVisible(LOADED);
  const topics = await toggles.count();
  expect(topics).toBeLessThanOrEqual(8);
  for (let n = 0; n < topics; n += 1) {
    headings.push((await toggles.nth(n).textContent()) ?? "");
    if ((await toggles.nth(n).getAttribute("aria-expanded")) !== "true") await toggles.nth(n).click();
  }
  expect(await page.locator(".settings-topic .setting").count()).toBeLessThanOrEqual(30);
  labels.push(...(await page.locator(".settings-topic .setting .setting-label").allTextContents()));

  for (const label of labels.map((l) => l.trim()).filter(Boolean)) {
    expect(label.length, label).toBeLessThanOrEqual(MOST_LABEL);
    expect(label, label).not.toMatch(FILE_WORDS);
  }
  for (const heading of headings.map((h) => h.trim()).filter(Boolean)) expect(heading, heading).not.toMatch(FILE_WORDS);
});

test("How the assistant is doing is in the person's menu, and opens Quality without the Settings side bar", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("?token=e2e-token");
  await page.getByRole("button", { name: /^Change appearance, / }).click();
  await page.getByRole("menuitem", { name: /^How .+ is doing$/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Quality", exact: true })).toBeVisible(LOADED);
  expect(new URL(page.url()).hash).toBe("#quality");
  await expect(bar(page)).toHaveCount(0);
});
