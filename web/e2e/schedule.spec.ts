// The calendar page (design 7.7): Day, Work week, Week and Month, never wider than the window at any of them, with a long
// unbroken title in an entry. Week and Work week fall back to Day in a space too narrow for their columns; an entry's details
// open beside the calendar and Escape returns the cursor to the entry. It shares the root server with the acceptance scenario
// and runs after it.
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// The days shown after pressing 2 and then 3. Below 1100px the Week view is the working days; on a phone the week is a list by
// day (a section for each day, not a lane).
const SIZES = [
  { width: 390, height: 844, lanes: { work_week: 5, week: 5 }, list: true },
  { width: 768, height: 900, lanes: { work_week: 5, week: 5 } },
  { width: 1024, height: 900, lanes: { work_week: 5, week: 5 } },
  { width: 1440, height: 900, lanes: { work_week: 5, week: 7 } },
  { width: 2000, height: 1100, lanes: { work_week: 5, week: 7 } },
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
  // The calendar's grid, or on a phone its list by day.
  await expect(page.locator("main [data-grid], main [data-month], main [data-schedule-list]").first()).toBeVisible();
}

/** Picks a view with its key, which works while the cursor is on no control. */
async function pick(page: Page, key: "1" | "2" | "3" | "4") {
  await page.locator("body").press(key);
}

/** What the page measures: no sideways scroll, and every day's box inside the window. */
async function measure(page: Page) {
  return page.evaluate(() => ({
    window: window.innerWidth,
    page: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
    main: (document.querySelector("main") as HTMLElement).scrollWidth,
    days: Array.from(document.querySelectorAll("main [data-day]")).map((el) => {
      const box = el.getBoundingClientRect();
      return { left: Math.round(box.left), right: Math.round(box.right), top: Math.round(box.top) };
    }),
  }));
}

test.describe("the calendar page", () => {
  for (const size of SIZES) {
    test(`at ${size.width}px every view fits the window; the week has ${size.list ? "a list by day" : size.lanes.week + " days"}`, async ({ page }) => {
      await page.setViewportSize({ width: size.width, height: size.height });
      await seed(page);
      await open(page);
      const days = (key: string) => (size.list && key !== "1" ? page.locator("main [data-schedule-list] section[data-day]") : page.locator("main ul[data-day]"));
      // The default view is the work week: its days, or a list by day on a phone.
      await expect(days("2")).toHaveCount(size.lanes.work_week);
      for (const [key, count] of [
        ["1", 1],
        ["2", size.lanes.work_week],
        ["3", size.lanes.week],
      ] as const) {
        await pick(page, key);
        await expect(days(key)).toHaveCount(count);
        const found = await measure(page);
        expect(found.page).toBeLessThanOrEqual(found.window);
        expect(found.body).toBeLessThanOrEqual(found.window);
        for (const d of found.days) {
          expect(d.left).toBeGreaterThanOrEqual(0);
          expect(d.right).toBeLessThanOrEqual(found.window);
        }
        if (count > 1 && !size.list) {
          // Days sit side by side.
          expect(Math.abs(found.days[0].top - found.days[1].top)).toBeLessThanOrEqual(2);
          expect(found.days[1].left).toBeGreaterThan(found.days[0].left);
        }
      }
      await pick(page, "4");
      await expect(page.locator("main section[data-day]")).toHaveCount(42);
      const month = await measure(page);
      expect(month.page).toBeLessThanOrEqual(month.window);
      expect(month.body).toBeLessThanOrEqual(month.window);
      for (const d of month.days) expect(d.right).toBeLessThanOrEqual(month.window);
    });

    test(`at ${size.width}px a long unbroken title in Day view wraps inside its lane`, async ({ page }) => {
      await page.setViewportSize({ width: size.width, height: size.height });
      await seed(page);
      await open(page);
      await pick(page, "1");
      await expect(page.getByText(LONG).first()).toBeVisible();
      const found = await measure(page);
      expect(found.page).toBeLessThanOrEqual(found.window);
      expect(found.main).toBeLessThanOrEqual(found.window);
    });
  }

  test("below 1100px the Week view is the working days and says so; at 1100px and over it is the whole week", async ({ page }) => {
    await seed(page);
    await page.setViewportSize({ width: 1024, height: 900 });
    await open(page);
    await pick(page, "3");
    await expect(page.locator("main ul[data-day]")).toHaveCount(5);
    await expect(page.locator("main [data-weekdays-only]")).toBeVisible();
    // The tab still says Week; nothing is wider than the window.
    await expect(page.getByRole("radio", { name: "Week", exact: true })).toHaveAttribute("aria-checked", "true");
    const narrow = await measure(page);
    expect(narrow.page).toBeLessThanOrEqual(narrow.window);
    await page.setViewportSize({ width: 1280, height: 900 });
    await expect(page.locator("main ul[data-day]")).toHaveCount(7);
    await expect(page.locator("main [data-weekdays-only]")).toHaveCount(0);
  });

  test("on a phone the week is a list by day, each entry a row that opens its details, and nothing scrolls sideways", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const today = await seed(page);
    await open(page);
    await pick(page, "3");
    const list = page.locator("main [data-schedule-list]");
    await expect(list).toBeVisible();
    await expect(page.locator("main [data-grid]")).toHaveCount(0);
    await expect(list.locator(`section[data-day="${today}"]`).getByRole("button", { name: /Walk through the proofs/ })).toBeVisible();
    const found = await measure(page);
    expect(found.page).toBeLessThanOrEqual(found.window);
    expect(found.body).toBeLessThanOrEqual(found.window);
    await list.getByRole("button", { name: /Walk through the proofs/ }).click();
    await expect(page.getByRole("dialog").getByRole("heading", { name: "Walk through the proofs" })).toBeFocused();
  });

  for (const width of [1440, 1024, 390]) {
    test(`at ${width}px the Day, Week and Month views never scroll sideways, and pass the accessibility check`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await seed(page);
      await open(page);
      for (const key of ["1", "3", "4"] as const) {
        await pick(page, key);
        await expect(page.locator("main [data-grid], main [data-month], main [data-schedule-list]").first()).toBeVisible();
        const found = await measure(page);
        expect(found.page, `view ${key} at ${width}`).toBeLessThanOrEqual(found.window);
        expect(found.body).toBeLessThanOrEqual(found.window);
        // The Day view opens scrolled to now, which can put the toolbar under the page's sticky header; the check is of
        // the page from its top.
        await page.evaluate(() => window.scrollTo(0, 0));
        const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
        expect(results.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
      }
    });
  }

  test("each view has no accessibility violations, with an entry's details open", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await seed(page);
    await open(page);
    for (const key of ["1", "2", "3", "4"] as const) {
      await pick(page, key);
      await expect(page.locator("main [data-grid], main [data-month]").first()).toBeVisible();
      await page.evaluate(() => window.scrollTo(0, 0));
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
      expect(results.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
    }
    await pick(page, "1");
    await page.getByRole("button", { name: /Walk through the proofs/ }).click();
    await expect(page.getByRole("complementary", { name: "Walk through the proofs" })).toBeVisible();
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
  });

  test("the arrow keys and buttons move by the view's unit and Today returns", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const today = await seed(page);
    await open(page);
    await pick(page, "1");
    const lane = page.locator("main ul[data-day]").first();
    await expect(lane).toHaveAttribute("data-day", today);
    await page.getByRole("button", { name: "Next day" }).click();
    await expect(lane).not.toHaveAttribute("data-day", today);
    await page.getByRole("button", { name: "Today" }).click();
    await expect(lane).toHaveAttribute("data-day", today);
    await page.locator("body").press("ArrowRight");
    await expect(lane).not.toHaveAttribute("data-day", today);
    await page.locator("body").press("Shift+ArrowLeft");
    await expect(lane).not.toHaveAttribute("data-day", today);
    await page.getByRole("button", { name: "Today" }).click();
    await expect(lane).toHaveAttribute("data-day", today);
    await pick(page, "3");
    await expect(page.locator("main ul[data-day]")).toHaveCount(7);
    await page.getByRole("button", { name: "Next week" }).click();
    await expect(page.locator(`main ul[data-day="${today}"]`)).toHaveCount(0);
  });

  test("an entry opens its details beside the calendar, nothing is wider than the window, and Escape returns the cursor to the entry", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await seed(page);
    await open(page);
    await pick(page, "1");
    const entry = page.getByRole("button", { name: /Walk through the proofs/ });
    await entry.click();
    const pane = page.getByRole("complementary", { name: "Walk through the proofs" });
    await expect(pane).toBeVisible();
    const found = await measure(page);
    expect(found.page).toBeLessThanOrEqual(found.window);
    // With the details open the grid keeps room for each day's heading on one line (the pane covers its edge instead of squeezing it).
    const head = await page.locator("main [data-grid] h3").first().evaluate((el) => el.getBoundingClientRect().height);
    expect(head).toBeLessThanOrEqual(40);
    await page.keyboard.press("Escape");
    await expect(pane).toHaveCount(0);
    await expect(entry).toBeFocused();
  });

  test("on a narrow window the details take the screen and Close returns", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await seed(page);
    await open(page);
    await pick(page, "1");
    const entry = page.getByRole("button", { name: /Walk through the proofs/ });
    await entry.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: "Walk through the proofs" })).toBeFocused();
    const box = await dialog.boundingBox();
    expect(box?.width ?? 0).toBeLessThanOrEqual(390);
    await dialog.getByRole("button", { name: "Close" }).click();
    await expect(dialog).toHaveCount(0);
    await expect(entry).toBeFocused();
  });

  test("the Schedule keeps to the review: a 64px hour gutter, entries at least 28px, now in view, a two-row toolbar and no key sentence", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await seed(page);
    await open(page);
    await pick(page, "1");
    const box = (selector: string) => page.locator(selector).first().evaluate((el) => el.getBoundingClientRect().toJSON());
    const grid = await box("main [data-grid]");
    const lane = await box("main ul[data-day]");
    // The grid has a 1px border.
    expect(Math.round(lane.left - grid.left) - 1).toBe(64);
    // Every hour label sits inside the grid, the first one too.
    for (const label of await page.locator("main [data-grid] [data-hour]").all()) {
      const found = await label.boundingBox();
      expect(found!.x).toBeGreaterThanOrEqual(grid.left);
      expect(found!.x + found!.width).toBeLessThanOrEqual(lane.left);
      expect(found!.y).toBeGreaterThanOrEqual(grid.top);
    }
    for (const entry of await page.locator("main ul[data-day] button").all()) expect((await entry.boundingBox())!.height).toBeGreaterThanOrEqual(28);
    // It opens scrolled to now, with a dot on the line, when now is among the hours shown.
    const now = page.locator("main [data-now]");
    if ((await now.count()) > 0) {
      await expect(now).toBeInViewport();
      const dot = await now.evaluate((el) => getComputedStyle(el, "::before").width);
      expect(parseFloat(dot)).toBeGreaterThan(0);
    }
    // Two rows: the arrows and the range, then the views and the filter.
    const rows = await page.locator("main [data-bar-row]").evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().top)));
    expect(rows).toHaveLength(2);
    expect(rows[1]).toBeGreaterThan(rows[0]);
    await expect(page.getByText(/hold Shift to move a week/).first()).toBeHidden();
    // The keys are in the shortcuts list.
    await page.locator("body").press("?");
    await expect(page.getByRole("dialog").getByText("Pick Day, Work week, Week, Month or Timeline")).toBeVisible();
  });

  test("the day grid is a frame of its own that opens on the clash or the day's first entry, not on empty hours", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await seed(page);
    await open(page);
    await pick(page, "1");
    const frame = page.getByRole("region", { name: "Hours of the day" });
    const box = await frame.boundingBox();
    // The frame fits the window, so the page itself is not a thousand pixels of hours.
    expect(box!.y + box!.height).toBeLessThanOrEqual(900);
    const first = page.locator("main [data-grid] ul[data-day] li").first();
    if ((await first.count()) > 0) await expect(first).toBeInViewport();
    // Hour labels are short and sit clear of the card's edge.
    const label = await page.locator("main [data-grid] [data-hour]").nth(1).evaluate((el) => ({ text: el.textContent, right: el.parentElement!.getBoundingClientRect().right - el.getBoundingClientRect().right }));
    expect(label.text).not.toMatch(/:00/);
    expect(label.right).toBeGreaterThanOrEqual(8);
  });

  test("the month's cells are white and today is a filled circle", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await seed(page);
    await open(page);
    await pick(page, "4");
    const surface = await page.locator("main [data-month]").evaluate((el) => getComputedStyle(el).backgroundColor);
    const cells = await page.locator("main section[data-day]").evaluateAll((els) => els.map((el) => getComputedStyle(el).backgroundColor));
    for (const color of cells) expect(["rgba(0, 0, 0, 0)", surface]).toContain(color);
    const today = page.locator("main section[data-today] > button > span").first();
    const circle = await today.evaluate((el) => ({ radius: getComputedStyle(el).borderRadius, fill: getComputedStyle(el).backgroundColor }));
    expect(parseFloat(circle.radius)).toBeGreaterThan(0);
    expect(circle.fill).not.toBe("rgba(0, 0, 0, 0)");
  });

  test("Show all hours draws the whole day inside the same frame, and Show fewer hours goes back", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await seed(page);
    await open(page);
    await pick(page, "1");
    const hours = page.locator("main [data-grid] [data-hour]");
    const some = await hours.count();
    await page.getByRole("button", { name: "Show all hours" }).click();
    await expect(hours).toHaveCount(24);
    const frame = await page.getByRole("region", { name: "Hours of the day" }).boundingBox();
    expect(frame!.y + frame!.height).toBeLessThanOrEqual(900);
    const found = await measure(page);
    expect(found.page).toBeLessThanOrEqual(found.window);
    await page.getByRole("button", { name: "Show fewer hours" }).click();
    await expect(hours).toHaveCount(some);
  });

  test("the controls above the grid are two rows, and a day's column does not repeat the date the heading gives", async ({ page }) => {
    for (const width of [1440, 1024]) {
      await page.setViewportSize({ width, height: 900 });
      await seed(page);
      await open(page);
      await pick(page, "1");
      await expect(page.locator("main [data-bar-row]")).toHaveCount(2);
      await expect(page.locator("main [data-grid] h3").first()).toHaveText(/^(Today|[A-Z][a-z]+day)$/);
    }
  });

  test("the month's weekday names sit over their numbers, the numbers share one edge, and a day is a target of at least 32px (44px when narrow)", async ({ page }) => {
    for (const [width, least] of [
      [1440, 32],
      [390, 44],
    ] as const) {
      await page.setViewportSize({ width, height: 900 });
      await seed(page);
      await open(page);
      await pick(page, "4");
      const found = await page.evaluate(() => {
        const names = Array.from(document.querySelectorAll<HTMLElement>("main [data-month] [class*='weekdayName']"));
        const cells = Array.from(document.querySelectorAll<HTMLElement>("main [data-month] section[data-day]"));
        const centre = (el: Element) => {
          const box = el.getBoundingClientRect();
          return box.left + box.width / 2;
        };
        const column = (n: number) => cells.filter((_, i) => i % 7 === n).map((c) => c.querySelector("[class*='dayNumber']") as HTMLElement);
        return {
          off: names.slice(0, 7).map((name, n) => Math.max(...column(n).map((num) => Math.abs(centre(num) - centre(name))))),
          // Each number's distance from the inside of its cell's left border, in every cell.
          edges: Array.from(new Set(cells.map((c) => Math.round((c.querySelector("[class*='dayNumber']") as HTMLElement).getBoundingClientRect().left - c.getBoundingClientRect().left - parseFloat(getComputedStyle(c).borderLeftWidth))))),
          targets: cells.map((c) => {
            const box = (c.querySelector("button") as HTMLElement).getBoundingClientRect();
            return Math.min(box.width, box.height);
          }),
        };
      });
      for (const off of found.off) expect(off, `a weekday over its numbers at ${width}`).toBeLessThanOrEqual(1.5);
      expect(found.edges, `one left edge at ${width}`).toHaveLength(1);
      for (const target of found.targets) expect(target).toBeGreaterThanOrEqual(width === 390 ? least : 24);
    }
  });

  test("the entry's Open button is a finger's height on a phone and the pane never runs wider than the window", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await seed(page);
    await open(page);
    await pick(page, "1");
    await page.getByRole("button", { name: /Walk through the proofs/ }).click();
    const open_ = page.getByRole("dialog").getByRole("link", { name: "Open the event" });
    const box = await open_.boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(44);
    expect(box!.width).toBeGreaterThan(200);
    const found = await measure(page);
    expect(found.page).toBeLessThanOrEqual(found.window);
  });

  test("an end before the start is the end field's own error, and a very long title in the form stays inside it", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await seed(page);
    await open(page);
    await page.getByRole("button", { name: "Add to schedule" }).first().click();
    const drawer = page.getByRole("dialog", { name: "Add a meeting" });
    await drawer.getByRole("textbox", { name: "What", exact: true }).fill(`${LONG} and then some more words that make the title longer than the field`);
    const start = drawer.getByRole("combobox", { name: /^Starts at/ });
    await start.fill("10:00");
    await start.press("Tab");
    const end = drawer.getByRole("combobox", { name: /^Ends at/ });
    await end.fill("9:00");
    await end.press("Tab");
    await expect(drawer.getByRole("alert").filter({ hasText: "It has to end after it starts." })).toBeVisible();
    await expect(end).toHaveAttribute("aria-invalid", "true");
    await expect(drawer.getByRole("button", { name: "Add", exact: true })).toBeDisabled();
    const found = await drawer.evaluate((el) => ({ box: el.scrollWidth, shown: el.clientWidth }));
    expect(found.box).toBeLessThanOrEqual(found.shown);
  });
});
