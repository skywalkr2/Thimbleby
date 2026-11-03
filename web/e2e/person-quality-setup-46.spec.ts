// A person's page, "How Reginald is doing" and the setup steps built to the reviewer's 4.6 mockups (`person`, `quality`, `setup-ai`; change log 317).
// Written, not yet run. The project is `people-records`: its workspace has Personal, a job and a business made as setup makes them, people can be
// added through the API, Quality and the setup walkthrough are reachable by their addresses, and no other scenario counts its people. They check:
//   - the person page's one filled button opens the add form with them as the one who does it, and the cursor is in its first field;
//   - the contact card comes before Activity where the columns stack (1024 and 390) and beside it at 1440;
//   - Quality's changes are words (an arrow and a sentence, never a color or a bare number);
//   - the weekly table is a list at 390 and a table at 1440;
//   - a rejected key says the reason the check gave, plainly, and the line names the account only by the label the account gives;
//   - no sideways scroll at 1440, 1024 and 390 on each screen, and axe passes on each.
import AxeBuilder from "@axe-core/playwright";
import { showSteps } from "./journey-helpers";
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const LOADED = { timeout: 20_000 };
const AUTH = { Authorization: "Bearer e2e-token" };
const WIDTHS = [1440, 1024, 390] as const;

const go = (page: Page, hash: string) =>
  page.evaluate((to) => {
    window.location.hash = to;
  }, hash);
const wider = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

async function addPerson(request: APIRequestContext, name: string): Promise<string> {
  // A run that starts again on this server (after a failed test) finds the person already there.
  const listed = (await (await request.get("api/people", { headers: AUTH })).json()) as Array<{ id: string; name: string }>;
  const there = listed.find((p) => p.name === name);
  if (there) return there.id;
  const made = await request.post("api/people", { headers: AUTH, data: { full_name: name, how_to_reach: { email: [`${name.toLowerCase().replace(/\W+/g, ".")}@example.com`] } } });
  expect(made.ok(), await made.text()).toBe(true);
  return ((await made.json()) as { id: string }).id;
}

async function openPerson(page: Page, id: string, name: string) {
  await page.goto("?token=e2e-token");
  await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible(LOADED);
  await go(page, `records/person/${id}`);
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible(LOADED);
  await expect(page.locator("[data-contact-card]")).toBeVisible(LOADED);
}

async function openQuality(page: Page) {
  await page.goto("?token=e2e-token#quality");
  await expect(page.getByRole("heading", { level: 1, name: /^How .+ is doing$/ })).toBeVisible(LOADED);
  await expect(page.locator("main [data-skeleton]")).toHaveCount(0, LOADED);
}

/** The setup walkthrough, on its AI step, with the first service chosen. */
async function openAiStep(page: Page) {
  await page.goto("?token=e2e-token#setup");
  await expect(page.getByRole("heading", { level: 1, name: "Getting started" })).toBeVisible(LOADED);
  // On a phone the steps are behind a Steps button.
  await showSteps(page);
  await page.getByRole("navigation", { name: /steps/i }).locator('button[data-screen="ai"]').click();
  await expect(page.getByRole("heading", { level: 2, name: "Your AI account" })).toBeVisible(LOADED);
}

let id = "";
const NAME = "Odette Marsh";

test.describe("A person's page, Quality and setup to the 4.6 mockups", () => {
  test.beforeAll(async ({ request }) => {
    id = await addPerson(request, NAME);
  });

  test("the one filled button on a person's page adds a to-do for them: the form opens with them as the owner and the cursor in its words", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openPerson(page, id, NAME);
    const primary = page.getByRole("button", { name: "Add a to-do for Odette" }).first();
    await expect(primary).toHaveAttribute("data-weight", "filled");
    await primary.click();
    const dialog = page.getByRole("dialog", { name: "Add a to-do" });
    await expect(dialog.getByRole("textbox", { name: "What to do" })).toBeFocused(LOADED);
    await expect(dialog.getByRole("combobox", { name: "Who does it" })).toContainText(NAME);
  });

  test("the contact card is above Activity where the columns stack, at 1024 and 390, and beside it at 1440, with their initials and the address in full", async ({ page }) => {
    await openPerson(page, id, NAME);
    for (const width of [1024, 390]) {
      await page.setViewportSize({ width, height: 900 });
      const card = await page.locator("[data-contact-card]").boundingBox();
      const activity = await page.locator("#record-activity").boundingBox();
      expect(card && activity, `at ${width}px`).toBeTruthy();
      expect(card!.y, `at ${width}px the card starts above Activity`).toBeLessThan(activity!.y);
    }
    await page.setViewportSize({ width: 1440, height: 900 });
    const card = (await page.locator("[data-contact-card]").boundingBox())!;
    const main = (await page.locator(".record-main").boundingBox())!;
    expect(card.x).toBeGreaterThan(main.x + main.width - 1);
    await expect(page.locator("[data-contact-card] [data-avatar]")).toHaveText("OM");
    // The address is there in full and is never cut off by the card.
    const email = page.locator("[data-contact-card]").getByText("odette.marsh@example.com");
    await expect(email).toBeVisible();
    const inside = await email.evaluate((node) => {
      const box = node.getBoundingClientRect();
      const host = node.closest("[data-contact-card]")!.getBoundingClientRect();
      return box.right <= host.right + 1;
    });
    expect(inside).toBe(true);
  });

  test("the box to ask is the last card of the rail, titled with their first name, and has a send button", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openPerson(page, id, NAME);
    const ask = page.locator('[data-slot="ask"]');
    await expect(ask.getByRole("heading", { name: "Ask about Odette" })).toBeVisible();
    await expect(ask.getByRole("button", { name: "Send" })).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    const last = await ask.boundingBox();
    const card = await page.locator("[data-contact-card]").boundingBox();
    expect(last!.y).toBeGreaterThan(card!.y);
  });

  test("Quality's changes are words: each tile says how it changed from the week before in a sentence, never by a color or a bare number", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openQuality(page);
    const tiles = page.getByRole("region", { name: "Outcome measures" }).getByRole("article");
    await expect(tiles).toHaveCount(4);
    for (let i = 0; i < 4; i++) {
      const change = tiles.nth(i).locator("p").nth(1);
      await expect(change).toHaveText(/(No change from the week before|(more|fewer) than the week before)/);
    }
    // One line says what the figures mean, before the window's dates.
    await expect(page.locator("[data-quality-sowhat]")).toBeVisible();
    await expect(page.locator("[data-quality-window]")).toBeVisible();
  });

  test("the weekly table is a list on a phone and a table in a window", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openQuality(page);
    await expect(page.locator("[data-week-list]")).toBeVisible();
    await expect(page.locator("[data-week-table]")).toBeHidden();
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(page.locator("[data-week-table]")).toBeVisible();
    await expect(page.locator("[data-week-list]")).toBeHidden();
  });

  test("a rejected key says the reason the check gave, plainly, with its mark, and names the service only by the label the account gives", async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await openAiStep(page);
    const main = page.locator("main#main");
    const card = main.locator("[data-radio-card]").first();
    await expect(card).toBeVisible(LOADED);
    // The label is what the account's own kind gives; the app types none.
    const label = ((await card.locator("strong").first().innerText()) ?? "").trim();
    const reason = `${label} didn't accept this key. Check it was copied whole, or make a new one.`;
    // The app lists the service's models first, with the key; a service that refuses the key says why there.
    await page.route("**/ai/models", (route) => route.fulfill({ json: { models: [], problem: reason } }));
    await card.click();
    const key = main.getByLabel("Access key");
    if ((await key.count()) === 0) test.skip(true, "this service has no key to paste");
    await key.fill("not-a-real-key");
    await key.blur();
    const rejected = main.locator('[data-key-state="rejected"]');
    await expect(rejected).toBeVisible(LOADED);
    await expect(rejected).toHaveText(reason);
    await expect(rejected).toHaveAttribute("role", "alert");
    await expect(rejected.locator("svg")).toHaveCount(1);
    await expect(key).toHaveAttribute("aria-invalid", "true");
  });

  test("the setup's footer buttons stand on the edges of the step's column", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openAiStep(page);
    const column = (await page.locator("main#main").boundingBox())!;
    const footer = page.locator("[data-step-footer]");
    const back = (await footer.getByRole("button", { name: "Back" }).boundingBox())!;
    // The last thing in the row is the primary button, with its reason beside it when it is disabled (so it is the group, not
    // the button alone, that stands on the column's right edge).
    const last = (await footer.locator("> div > div > *").last().boundingBox())!;
    expect(Math.abs(back.x - column.x)).toBeLessThanOrEqual(2);
    expect(Math.abs(last.x + last.width - (column.x + column.width))).toBeLessThanOrEqual(2);
  });

  for (const width of WIDTHS) {
    test(`no screen scrolls sideways at ${width}px: the person's page, Quality and the setup's AI step`, async ({ page }) => {
      test.setTimeout(90_000);
      await page.setViewportSize({ width, height: 900 });
      await openPerson(page, id, NAME);
      expect(await wider(page), "the person's page").toBeLessThanOrEqual(0);
      await openQuality(page);
      expect(await wider(page), "Quality").toBeLessThanOrEqual(0);
      await openAiStep(page);
      expect(await wider(page), "the AI step").toBeLessThanOrEqual(0);
    });
  }

  test("axe finds nothing on the person's page, Quality or the setup's AI step", async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await openPerson(page, id, NAME);
    expect((await new AxeBuilder({ page }).analyze()).violations.map((v) => v.id)).toEqual([]);
    await openQuality(page);
    expect((await new AxeBuilder({ page }).analyze()).violations.map((v) => v.id)).toEqual([]);
    await openAiStep(page);
    expect((await new AxeBuilder({ page }).analyze()).violations.map((v) => v.id)).toEqual([]);
  });
});
