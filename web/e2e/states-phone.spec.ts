// The states of the list screens and the phone shell (VP07, VP08, VP12, VP13; change log 319). Written, not yet run. The project is
// `layout`: its server holds the layout-stress records, so there are rows to read at every width. The states are driven with routes
// the test controls: a held read, a 500, a refusal, and the browser going offline. They check:
//   - To-dos, Follow-ups, People and a record's page show skeleton rows while a read is held;
//   - a read that fails says so plainly with Try again, and Try again brings the list;
//   - going offline draws the one banner, what was loaded stays readable, and the banner goes when the connection is back;
//   - a save that fails on a record's page and in the to-dos add row keeps what was typed and says "Not saved" with Try again;
//   - at 390 on a touch screen: the tab bar is Today, To-dos, a tonal plus, Schedule and More; a row's menu is at its top right; there
//     is no strip of sides (a button opens a sheet); every button in a row and in the bar is at least 44px; nothing scrolls sideways;
//   - at 1024 the side filter is a button, the settings sections fold into a picker, and no two header controls overlap.
import { expect, test, type APIRequestContext, type Page, type Route } from "@playwright/test";

const LOADED = { timeout: 20_000 };
const AUTH = { Authorization: "Bearer e2e-token" };
const TAP = 44;

const go = (page: Page, hash: string) =>
  page.evaluate((to) => {
    window.location.hash = to;
  }, hash);
const wider = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

async function firstPerson(request: APIRequestContext): Promise<{ id: string; name: string }> {
  const read = await request.get("api/people", { headers: AUTH });
  expect(read.ok()).toBe(true);
  const people = (await read.json()) as Array<{ id: string; name: string }>;
  expect(people.length).toBeGreaterThan(0);
  return people[0];
}

/** Opens the app at a screen with its read held (never answered until `release`), failing with a status, or as it is. */
async function opened(page: Page, hash: string, path: string, how: "held" | { status: number } | "as-is") {
  let release: () => void = () => undefined;
  if (how !== "as-is") {
    const gate = new Promise<void>((resolve) => (release = resolve));
    await page.route(`**/api/${path}`, async (route: Route) => {
      if (how === "held") {
        await gate;
        await route.continue();
      } else {
        await route.fulfill({ status: how.status, contentType: "application/json", body: JSON.stringify({ detail: "The folder is locked." }) });
      }
    });
  }
  await page.goto(`?token=e2e-token#${hash}`);
  return { release, unroute: () => page.unroute(`**/api/${path}`) };
}

const SCREENS = [
  { name: "To-dos", hash: "work/open", path: "open-items", ready: (page: Page) => page.getByRole("heading", { level: 1, name: /To-dos/ }) },
  { name: "Follow-ups", hash: "work/followups", path: "followups", ready: (page: Page) => page.getByRole("heading", { level: 1, name: /Follow-ups/ }) },
  { name: "People", hash: "records/people", path: "people", ready: (page: Page) => page.getByRole("heading", { level: 1, name: /People/ }) },
];

test.describe("States of the list screens", () => {
  for (const screen of SCREENS) {
    test(`${screen.name}: skeleton rows while the read is held, then the list`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      const held = await opened(page, screen.hash, screen.path, "held");
      await expect(page.locator("main [data-skeleton]").first()).toBeVisible(LOADED);
      held.release();
      await expect(page.locator("main [data-skeleton]")).toHaveCount(0, LOADED);
      await expect(screen.ready(page)).toBeVisible(LOADED);
    });

    test(`${screen.name}: a failed read says so with Try again, and Try again brings the list`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      const failing = await opened(page, screen.hash, screen.path, { status: 500 });
      const alert = page.locator('main [role="alert"]', { has: page.getByRole("button", { name: "Try again" }) }).first();
      await expect(alert).toBeVisible(LOADED);
      await expect(alert).toContainText(/couldn't be loaded|didn't load/);
      await failing.unroute();
      await alert.getByRole("button", { name: "Try again" }).click();
      await expect(page.locator("main [data-skeleton]")).toHaveCount(0, LOADED);
      await expect(page.locator('main [role="alert"]', { hasText: /couldn't be loaded|didn't load/ })).toHaveCount(0, LOADED);
    });

    test(`${screen.name}: offline draws the one banner, what was loaded stays readable, and the banner goes when the connection is back`, async ({ page, context }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(`?token=e2e-token#${screen.hash}`);
      await expect(screen.ready(page)).toBeVisible(LOADED);
      await expect(page.locator("main [data-skeleton]")).toHaveCount(0, LOADED);
      const before = await page.locator("main").innerText();
      await context.setOffline(true);
      const banner = page.locator("[data-offline-banner]");
      await expect(banner).toBeVisible(LOADED);
      await expect(banner).toContainText("The app can't reach its server");
      await expect(banner.getByRole("button", { name: "Try now" })).toBeVisible();
      // What was loaded is still on the screen.
      await expect(screen.ready(page)).toBeVisible();
      expect((await page.locator("main").innerText()).length).toBeGreaterThanOrEqual(before.length - 400);
      await context.setOffline(false);
      await expect(banner).toHaveCount(0, LOADED);
    });
  }

  test("a record's page: a held read shows skeleton rows, a failed read says so with Try again", async ({ page, request }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const person = await firstPerson(request);
    const held = await opened(page, `records/person/${person.id}`, "record*", "held");
    await expect(page.locator("main [data-skeleton]").first()).toBeVisible(LOADED);
    held.release();
    await expect(page.getByRole("heading", { level: 1, name: person.name })).toBeVisible(LOADED);
    await held.unroute();
    const failing = await opened(page, `records/person/${person.id}`, "record*", { status: 500 });
    await page.reload();
    const alert = page.locator('main [role="alert"]', { hasText: "This page didn't load." });
    await expect(alert).toBeVisible(LOADED);
    await failing.unroute();
    await alert.getByRole("button", { name: "Try again" }).click();
    await expect(page.getByRole("heading", { level: 1, name: person.name })).toBeVisible(LOADED);
  });

  test("a record's page: a save that is refused as a server error keeps what was typed, says Not saved, and Try again saves it", async ({ page, request }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const person = await firstPerson(request);
    await page.goto(`?token=e2e-token#records/person/${person.id}`);
    await expect(page.getByRole("heading", { level: 1, name: person.name })).toBeVisible(LOADED);
    await page.route("**/api/people/*", async (route) => {
      if (route.request().method() === "POST" || route.request().method() === "PUT") await route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ detail: "The app couldn't write to its folder." }) });
      else await route.continue();
    });
    await page.getByRole("button", { name: /^Edit/ }).first().click();
    const dialog = page.getByRole("dialog");
    const nameBox = dialog.getByLabel("Full name");
    await nameBox.fill(`${person.name} Jr`);
    await dialog.getByRole("button", { name: /^Save|^Add a person/ }).click();
    const note = dialog.locator("[data-not-saved]");
    await expect(note).toBeVisible(LOADED);
    await expect(note).toContainText("Not saved");
    await expect(nameBox).toHaveValue(`${person.name} Jr`);
    await expect(note.getByRole("button", { name: "Try again" })).toBeVisible();
  });

  test("To-dos: an add that fails keeps the words in the row and says Not saved with Try again", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("?token=e2e-token#work/open");
    const field = page.getByRole("textbox", { name: "Add a to-do" });
    await expect(field).toBeVisible(LOADED);
    await page.route("**/api/todos", async (route) => {
      if (route.request().method() === "POST") await route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ detail: "The app couldn't write to its folder." }) });
      else await route.continue();
    });
    await field.fill("Pay the deposit");
    await field.press("Enter");
    const note = page.locator("[data-inline-add] [data-not-saved]");
    await expect(note).toBeVisible(LOADED);
    await expect(note).toContainText("“Pay the deposit” wasn't saved.");
    await expect(field).toHaveValue("Pay the deposit");
  });

  test("To-dos: a date at the end of the title is shown beside the row before Enter, and can be dropped", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("?token=e2e-token#work/open");
    const field = page.getByRole("textbox", { name: "Add a to-do" });
    await expect(field).toBeVisible(LOADED);
    await field.fill("Send the headcount tomorrow");
    const found = page.locator("[data-date-found]");
    await expect(found).toContainText(/^Due /, LOADED);
    await found.getByRole("button", { name: /Don't set a date/ }).click();
    await expect(found).toHaveCount(0);
    await expect(field).toHaveValue("Send the headcount tomorrow");
  });
});

test.describe("The phone shell at 390", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test("the tab bar is Today, To-dos, a tonal plus, Schedule and More, and Search is in the header", async ({ page }) => {
    await page.goto("?token=e2e-token#today");
    const bar = page.getByRole("navigation", { name: "Views" });
    await expect(bar).toBeVisible(LOADED);
    const order = await bar.locator("a, button").evaluateAll((els) => els.map((el) => (el.getAttribute("aria-label") ?? el.textContent ?? "").trim()));
    expect(order).toEqual(["Today", "To-dos", "Hand something in", "Schedule", "More"]);
    await expect(bar.getByRole("button", { name: "Hand something in" })).toHaveAttribute("data-weight", "tonal");
    await expect(bar.getByRole("button", { name: "Search" })).toHaveCount(0);
    await expect(page.getByRole("banner").getByRole("button", { name: "Search" })).toBeVisible();
    expect(await wider(page)).toBeLessThanOrEqual(0);
  });

  test("More has the work screens, the saved items and Settings, then Help, theme and spacing", async ({ page }) => {
    await page.goto("?token=e2e-token#today");
    await page.getByRole("navigation", { name: "Views" }).getByRole("button", { name: "More" }).click();
    const sheet = page.getByRole("dialog", { name: "More" });
    await expect(sheet).toBeVisible(LOADED);
    for (const name of ["What changed", "Handled for you", "Follow-ups", "People", "Files", "Settings"]) {
      await expect(sheet.getByRole("link", { name })).toBeVisible();
    }
    await expect(sheet.getByRole("radiogroup", { name: "Theme" })).toBeVisible();
  });

  test("a row's menu is at its top right, its buttons are at least 44px, and there is no strip of sides", async ({ page }) => {
    await page.goto("?token=e2e-token#work/open");
    await expect(page.locator("main [data-skeleton]")).toHaveCount(0, LOADED);
    await expect(page.getByRole("radiogroup", { name: "Show" })).toHaveCount(0);
    const row = page.locator("main [data-row]").filter({ has: page.locator('[aria-haspopup="menu"]') }).first();
    await expect(row).toBeVisible(LOADED);
    const box = (await row.boundingBox())!;
    const menu = (await row.locator('[aria-haspopup="menu"]').first().boundingBox())!;
    // At the top right of the row: inside its right edge and within the first line.
    expect(menu.x + menu.width).toBeLessThanOrEqual(box.x + box.width + 1);
    expect(menu.x + menu.width).toBeGreaterThanOrEqual(box.x + box.width - 16);
    expect(menu.y - box.y).toBeLessThanOrEqual(16);
    // The title stacks above the actions: no button sits beside the title text.
    const title = (await row.locator("[data-row-title]").first().boundingBox())!;
    expect(title.x + title.width).toBeLessThanOrEqual(menu.x + 1);
    for (const target of await page.locator("main [data-row] button:visible, nav[aria-label='Views'] button:visible, nav[aria-label='Views'] a:visible").all()) {
      const b = await target.boundingBox();
      if (!b) continue;
      expect(b.height, await target.innerText().catch(() => "")).toBeGreaterThanOrEqual(TAP - 0.5);
      expect(b.width).toBeGreaterThanOrEqual(TAP - 0.5);
    }
    expect(await wider(page)).toBeLessThanOrEqual(0);
  });

  test("the side filter is one button in the page header that opens a sheet, when there is a side beside Personal", async ({ page }) => {
    await page.goto("?token=e2e-token#work/open");
    await expect(page.locator("main [data-skeleton]")).toHaveCount(0, LOADED);
    await expect(page.getByRole("radiogroup", { name: "Show" })).toHaveCount(0);
    const button = page.getByRole("button", { name: /^Side: / });
    if ((await button.count()) === 0) return;
    await button.click();
    const sheet = page.getByRole("dialog", { name: "Show one side" });
    await expect(sheet).toBeVisible();
    for (const option of await sheet.locator("[data-side-option]").all()) {
      expect((await option.boundingBox())!.height).toBeGreaterThanOrEqual(TAP - 0.5);
    }
    await page.keyboard.press("Escape");
    await expect(sheet).toHaveCount(0);
  });

  for (const hash of ["today", "work/open", "work/followups", "records/people", "records/files", "records/notes", "records/knowledge", "work/changed", "work/handled"]) {
    test(`no sideways scroll on ${hash}`, async ({ page }) => {
      await page.goto(`?token=e2e-token#${hash}`);
      await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible(LOADED);
      await expect(page.locator("main [data-skeleton]")).toHaveCount(0, LOADED);
      expect(await wider(page)).toBeLessThanOrEqual(0);
    });
  }
});

test.describe("In-between width at 1024", () => {
  test.use({ viewport: { width: 1024, height: 768 } });

  test("the side filter is a button, not a strip, and the settings sections fold into a picker", async ({ page }) => {
    await page.goto("?token=e2e-token#work/open");
    await expect(page.locator("main [data-skeleton]")).toHaveCount(0, LOADED);
    await expect(page.getByRole("radiogroup", { name: "Show" })).toHaveCount(0);
    await go(page, "settings");
    const picker = page.locator("details.settings-picker");
    await expect(picker).toBeVisible(LOADED);
    expect(await wider(page)).toBeLessThanOrEqual(0);
  });

  test("nothing in the header overlaps another control, and the content has no sideways scroll", async ({ page }) => {
    await page.goto("?token=e2e-token#today");
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible(LOADED);
    const boxes = await page.locator("header button:visible, header a:visible, header input:visible").evaluateAll((els) =>
      els.map((el) => {
        const r = el.getBoundingClientRect();
        return { x: r.x, y: r.y, w: r.width, h: r.height, name: el.getAttribute("aria-label") ?? el.textContent ?? "" };
      }),
    );
    for (let i = 0; i < boxes.length; i += 1) {
      for (let j = i + 1; j < boxes.length; j += 1) {
        const a = boxes[i];
        const b = boxes[j];
        const overlap = a.x < b.x + b.w - 1 && b.x < a.x + a.w - 1 && a.y < b.y + b.h - 1 && b.y < a.y + a.h - 1;
        expect(overlap, `${a.name} overlaps ${b.name}`).toBe(false);
      }
    }
    expect(await wider(page)).toBeLessThanOrEqual(0);
  });
});
