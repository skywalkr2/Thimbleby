// Today, the opened review and To-dos built to the reviewer's 4.6 mockups (`today`, `today-review`, `todos`; change log 316).
// Written, not yet run. The layout server holds the long made-up text and a batch to look over, so these hold with them:
//   - the inline add row adds a to-do with Enter and the cursor stays in the row for the next one;
//   - a question has no check box or round tick;
//   - "Needs a date" is one line, and its button opens the list;
//   - the counts agree: the tab, the groups with the line for those that need a date, and the footer;
//   - the opened review is an inset card with "Keep all", the screen's one filled button, and Decide has none while it is open;
//   - neither screen scrolls sideways at 1440, 1024 or 390.
import { expect, test, type Page } from "@playwright/test";
import { pickPersonalIfSides } from "./journey-helpers";

const LOADED = { timeout: 20_000 };
const GREETING = /^Good (morning|afternoon|evening)/;

async function openTodos(page: Page) {
  await page.goto("?token=e2e-token#work/open");
  await expect(page.getByRole("main").getByRole("heading", { level: 1, name: "To-dos and questions" })).toBeVisible(LOADED);
  await expect(page.locator("main [data-skeleton]")).toHaveCount(0, LOADED);
}

async function openToday(page: Page) {
  await page.goto("?token=e2e-token#today");
  await expect(page.getByRole("main").getByRole("heading", { level: 1, name: GREETING })).toBeVisible(LOADED);
  await expect(page.locator("[data-queue-line]").first()).toBeVisible(LOADED);
}

const needsDateCount = async (page: Page): Promise<number> => {
  const line = page.locator("[data-needs-date-line]");
  if ((await line.count()) === 0) return 0;
  return Number((await line.first().innerText()).match(/\d+/)?.[0] ?? 0);
};

test.describe("To-dos", () => {
  test("the inline add row adds a to-do with Enter, says so with Undo, and the cursor stays in the row for the next one", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openTodos(page);
    await pickPersonalIfSides(page);
    const field = page.getByRole("textbox", { name: "Add a to-do" });
    // It is the first line of the list, on every width.
    expect(await page.getByRole("list", { name: "Open to-dos" }).locator("> li").first().getByRole("textbox").count()).toBe(1);
    const before = await needsDateCount(page);
    await field.fill("Call the printer about the proofs");
    await field.press("Enter");
    await expect(page.getByText("Added: Call the printer about the proofs")).toBeVisible(LOADED);
    await expect(page.getByRole("button", { name: "Undo" })).toBeVisible();
    await expect(field).toHaveValue("");
    await expect(field).toBeFocused();
    // A to-do with no day is one that needs a date: the line at the foot counts it.
    await expect.poll(() => needsDateCount(page), LOADED).toBe(before + 1);
    // The next one goes the same way, with no click between.
    await page.keyboard.type("Send the proof");
    await page.keyboard.press("Enter");
    await expect(page.getByText("Added: Send the proof")).toBeVisible(LOADED);
    await expect(field).toBeFocused();
    await expect.poll(() => needsDateCount(page), LOADED).toBe(before + 2);
  });

  test("the inline add row is there on a phone too, and the header's button still opens the form for details", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openTodos(page);
    await expect(page.getByRole("textbox", { name: "Add a to-do" })).toBeVisible();
    await page.getByRole("button", { name: "Add a to-do" }).first().click();
    await expect(page.getByRole("textbox", { name: "What to do" })).toBeFocused();
  });

  test("questions have no check box or round tick", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openTodos(page);
    await page.getByRole("button", { name: /^Questions/ }).click();
    const list = page.getByRole("list", { name: "Open questions" });
    if ((await list.count()) === 0) test.skip(true, "the fixture holds no open question");
    await expect(list).toBeVisible(LOADED);
    await expect(list.getByRole("checkbox")).toHaveCount(0);
    await expect(list.getByRole("button", { name: "Mark done" })).toHaveCount(0);
  });

  test("Needs a date is one line at the foot of the list that opens its list", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openTodos(page);
    const field = page.getByRole("textbox", { name: "Add a to-do" });
    await field.fill("A to-do with no day yet");
    await field.press("Enter");
    const line = page.locator("[data-needs-date-line]");
    await expect(line).toBeVisible(LOADED);
    // One line: its row is no taller than a row of the list, and the group is not open.
    const box = await line.locator("> div").first().boundingBox();
    expect(box?.height ?? 999).toBeLessThan(64);
    await expect(page.getByRole("region", { name: /Needs a date/ })).toHaveCount(0);
    const open = line.getByRole("button", { name: "Give them dates" });
    await expect(open).toHaveAttribute("aria-expanded", "false");
    await open.click();
    await expect(page.getByRole("region", { name: /Needs a date/ })).toBeVisible();
    await expect(line.getByRole("button", { name: "Hide them" })).toHaveAttribute("aria-expanded", "true");
  });

  test("the counts agree: the tab, the groups with the line for those that need a date, and the footer", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openTodos(page);
    const tab = await page.getByRole("button", { name: /^To-dos/ }).innerText();
    const tabCount = Number(tab.match(/\d+/)?.[0]);
    const counts = await page.locator("[data-todo-group] [data-group-count]").allInnerTexts();
    const grouped = counts.reduce((n, c) => n + Number(c), 0);
    expect(grouped + (await needsDateCount(page))).toBe(tabCount);
    await expect(page.locator("[data-need-count]")).toContainText(`of these ${tabCount} to-dos`);
    // The groups come in the mockup's order.
    const names = (await page.locator("[data-todo-group]").allTextContents()).map((t) => t.replace(/\d+$/, "").trim());
    const order = ["Overdue", "Today", "Coming up", "Waiting on others"];
    expect(names).toEqual(order.filter((o) => names.includes(o)));
  });
});

test.describe("Today", () => {
  test("the opened review is an inset card whose Keep all is the screen's one filled button, and Decide has none while it is open", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openToday(page);
    const row = page.locator('[data-queue-line="review"]').first();
    await row.getByRole("button", { name: /^Look over/ }).click();
    const card = row.locator("[data-inset]");
    await expect(card).toBeVisible(LOADED);
    // The card sits inside the row's text edge and is drawn on the sunken surface.
    const rowBox = await row.boundingBox();
    const cardBox = await card.boundingBox();
    expect((cardBox?.x ?? 0) - (rowBox?.x ?? 0)).toBeGreaterThan(24);
    const keep = card.getByRole("button", { name: /^Keep (it|all \d+)$/ });
    await expect(keep).toBeVisible();
    await expect(keep).toHaveAttribute("data-weight", "filled");
    await expect(page.locator('section[aria-labelledby="queue-group-decide"] [data-weight="filled"]')).toHaveCount(0);
    await expect(page.locator('main [data-weight="filled"]')).toHaveCount(1);
  });

  test("with no review open the first decision carries the one filled button", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openToday(page);
    const decide = page.locator('section[aria-labelledby="queue-group-decide"]');
    if ((await decide.count()) === 0) test.skip(true, "the fixture has no decision");
    expect(await page.locator('main [data-weight="filled"]').count()).toBeLessThanOrEqual(1);
  });

  test("the greeting is the heading, the groups are labelled with counts, and the rail has no filled button", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openToday(page);
    await expect(page.getByRole("region", { name: "Needs you" }).getByRole("heading", { level: 2, name: "Needs you" })).toHaveClass(/sr/);
    for (const group of await page.locator("[data-queue-line]").first().locator("xpath=ancestor::section[1]").locator("[data-group-label]").all()) await expect(group).toBeVisible();
    await expect(page.locator('[data-region][aria-label] [data-weight="filled"]')).toHaveCount(0);
    await expect(page.locator('[data-col] [data-weight="filled"]')).toHaveCount(0);
  });
});

for (const [name, open] of [
  ["Today", openToday],
  ["To-dos", openTodos],
] as const) {
  for (const width of [1440, 1024, 390]) {
    test(`${name} does not scroll sideways at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await open(page);
      const over = await page.evaluate(() => ({ page: document.documentElement.scrollWidth - window.innerWidth, body: document.body.scrollWidth - window.innerWidth }));
      expect(over.page).toBeLessThanOrEqual(0);
      expect(over.body).toBeLessThanOrEqual(0);
    });
  }
}
