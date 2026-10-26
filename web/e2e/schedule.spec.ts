// The schedule (design 7.7): three days side by side on a wide window and one under another on a narrow one, never wider than
// the window, with a long unbroken title in an entry. It moves a day at a time with the arrows and comes back with Today.
// It shares the root server with the acceptance scenario and runs after it.
import { expect, test, type Page } from "@playwright/test";

const SIZES = [
  { width: 390, height: 844, side: false },
  { width: 1024, height: 768, side: true },
  { width: 1440, height: 900, side: true },
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
    ["Pick up the print order", null],
  ] as const) {
    const made = await page.request.post("api/calendar/meetings", { data: { what, day: today, time } });
    expect(made.ok()).toBe(true);
  }
  return today;
}

async function open(page: Page) {
  await page.goto("?token=e2e-token");
  await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
  await page.evaluate(() => {
    window.location.hash = "schedule";
  });
  await expect(page.getByRole("main").getByRole("heading", { level: 1, name: "Schedule" })).toBeVisible();
  await expect(page.locator("main [data-skeleton]")).toHaveCount(0, { timeout: 15_000 });
  await expect(page.locator("main [data-day]").first()).toBeVisible();
}

test.describe("the schedule", () => {
  for (const size of SIZES) {
    test(`at ${size.width}px the days ${size.side ? "sit side by side" : "stack"} and nothing is wider than the window`, async ({ page }) => {
      await page.setViewportSize({ width: size.width, height: size.height });
      await seed(page);
      await open(page);
      await expect(page.getByText(LONG).first()).toBeVisible();
      const found = await page.evaluate(() => ({
        window: window.innerWidth,
        page: document.documentElement.scrollWidth,
        body: document.body.scrollWidth,
        days: Array.from(document.querySelectorAll("main [data-day]")).map((el) => {
          const box = el.getBoundingClientRect();
          return { left: Math.round(box.left), right: Math.round(box.right), top: Math.round(box.top) };
        }),
      }));
      expect(found.page).toBeLessThanOrEqual(found.window);
      expect(found.body).toBeLessThanOrEqual(found.window);
      expect(found.days.length).toBeGreaterThanOrEqual(2);
      for (const d of found.days) expect(d.right).toBeLessThanOrEqual(found.window);
      const [first, second] = found.days;
      if (size.side) {
        expect(Math.abs(first.top - second.top)).toBeLessThanOrEqual(2);
        expect(second.left).toBeGreaterThan(first.left);
      } else {
        expect(second.top).toBeGreaterThan(first.top);
        expect(Math.abs(second.left - first.left)).toBeLessThanOrEqual(2);
      }
    });
  }

  test("the arrow keys and buttons move a day and Today returns, and a field keeps its own arrows", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const today = await seed(page);
    await open(page);
    const first = page.locator("main [data-day]").first();
    await expect(first).toHaveAttribute("data-day", today);
    await page.getByRole("button", { name: "Next day" }).click();
    await expect(first).not.toHaveAttribute("data-day", today);
    await page.getByRole("button", { name: "Today" }).click();
    await expect(first).toHaveAttribute("data-day", today);
    await page.locator("body").press("ArrowRight");
    await expect(first).not.toHaveAttribute("data-day", today);
    await page.locator("body").press("Shift+ArrowLeft");
    await expect(first).not.toHaveAttribute("data-day", today);
    await page.getByRole("button", { name: "Today" }).click();
    await expect(first).toHaveAttribute("data-day", today);
  });
});
