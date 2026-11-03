// The Timeline view of the calendar page (design 7.7): at a wide window, lanes of items with their details on focus; at a narrow
// one, the same items as a list by week. Never wider than the window, and no accessibility violations either way. It shares the
// root server with the acceptance scenario and runs after it.
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { FIRST_SCREEN } from "./journey-helpers";

const SIZES = [
  { width: 1280, height: 900, mode: "wide" },
  { width: 900, height: 900, mode: null },
  // On a phone the window has no side menu (a bar at the bottom instead), so the timeline has all the width: the two weeks the
  // test server shows (`ui.schedule.timeline_range`) fit down to a phone's narrowest, where the list by week takes over.
  { width: 320, height: 700, mode: "list" },
];

/** A long title with no break in it, made here so no outside text is written out. */
const LONG = "Quarterly".repeat(12);

async function seed(page: Page): Promise<string> {
  // Signed in first, so the requests below carry the session.
  await page.goto("?token=e2e-token");
  const today = ((await (await page.request.get("api/schedule")).json()) as { today: string }).today;
  for (const [what, time] of [
    [LONG, "09:30"],
    ["Walk through the proofs", "14:00"],
    ["Walk through the index", "14:00"],
    ["Pick up the print order", null],
  ] as const) {
    const made = await page.request.post("api/calendar/meetings", { data: { what, day: today, time } });
    expect(made.ok()).toBe(true);
  }
  return today;
}

async function open(page: Page) {
  await page.goto("?token=e2e-token");
  await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible(FIRST_SCREEN);
  await page.evaluate(() => {
    window.location.hash = "schedule";
  });
  await expect(page.getByRole("main").getByRole("heading", { level: 1, name: "Schedule" })).toBeVisible();
  await expect(page.locator("main [data-skeleton]")).toHaveCount(0, { timeout: 15_000 });
  await page.getByRole("radio", { name: "Timeline" }).click();
  await expect(page.locator("main [data-timeline]")).toBeVisible();
  await expect(page.locator("main [data-skeleton]")).toHaveCount(0);
}

test.describe("the timeline", () => {
  for (const size of SIZES) {
    test(`at ${size.width}px the timeline never scrolls sideways and has no accessibility violations`, async ({ page }) => {
      await page.setViewportSize({ width: size.width, height: size.height });
      await seed(page);
      await open(page);
      const frame = page.locator("main [data-timeline]");
      if (size.mode) await expect(frame).toHaveAttribute("data-mode", size.mode);
      // The seeded entries are on the page in either layout.
      await expect(page.getByRole("button", { name: /Walk through the proofs/ }).first()).toBeAttached();
      const found = await page.evaluate(() => ({
        window: window.innerWidth,
        page: document.documentElement.scrollWidth,
        body: document.body.scrollWidth,
        main: (document.querySelector("main") as HTMLElement).scrollWidth,
        frame: (document.querySelector("main [data-timeline]") as HTMLElement).scrollWidth,
      }));
      expect(found.page).toBeLessThanOrEqual(found.window);
      expect(found.body).toBeLessThanOrEqual(found.window);
      expect(found.main).toBeLessThanOrEqual(found.window);
      expect(found.frame).toBeLessThanOrEqual(found.window);
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
      expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
    });
  }

  test("in a wide window an item's details show on focus and Enter opens a calendar entry's details", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await seed(page);
    await open(page);
    const proofs = page.getByRole("button", { name: /^Calendar entry: Walk through the proofs\./ });
    await proofs.focus();
    await expect(page.locator("main [data-timeline-details]")).toContainText("Walk through the proofs");
    // Two entries at the same time are both there, one above the other, and neither covers the other.
    const index = page.getByRole("button", { name: /^Calendar entry: Walk through the index\./ });
    const [a, b] = [await proofs.boundingBox(), await index.boundingBox()];
    expect(a && b && (a.y + a.height <= b.y || b.y + b.height <= a.y)).toBe(true);
    await page.keyboard.press("Enter");
    await expect(page.getByRole("complementary", { name: "Walk through the proofs" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(proofs).toBeFocused();
  });

  test("the range can be picked and is remembered, and the list by week names each week", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    await seed(page);
    await open(page);
    await page.getByRole("radio", { name: "2 weeks" }).click();
    await expect(page.getByRole("radio", { name: "2 weeks" })).toHaveAttribute("aria-checked", "true");
    await expect(page.locator("main [data-week-list] h3").first()).toContainText("Week of");
    await page.reload();
    await page.evaluate(() => {
      window.location.hash = "schedule";
    });
    await expect(page.getByRole("radio", { name: "2 weeks" })).toHaveAttribute("aria-checked", "true");
  });
});
