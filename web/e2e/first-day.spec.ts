// The first day (promise P77): a fresh workspace after setup with a business, read as a person reads it on the first
// evening. On every main screen, three or more parts in a row that each show only a "nothing yet" message is a screen that
// looks unfinished. What counts as a part, and as empty, is in `partsOnScreen` (first-day-helpers.ts): a named region, or a
// heading with what follows it, whose only content is an empty-state message.
// The server (`--first-day`) holds nothing but the business, an empty project in it and one run waiting for the first go.
import { expect, test } from "@playwright/test";
import { emptyRuns, openScreen, partsOnScreen, screens, setUpWithBusiness, type FirstDay } from "./first-day-helpers";

const WIDTHS = [390, 1440];

let day: FirstDay;

test.describe("the first day", () => {
  test.beforeAll(async ({ request }) => {
    day = await setUpWithBusiness(request);
  });

  test("no main screen shows three or more empty parts in a row", async ({ page }) => {
    test.setTimeout(180_000);
    await page.goto("?token=e2e-token");
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible({ timeout: 20_000 });
    const rows: string[] = [];
    const failures: string[] = [];
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 900 });
      for (const screen of screens(day)) {
        await openScreen(page, screen.hash, screen.heading);
        const parts = await partsOnScreen(page);
        rows.push(`${screen.name} at ${width}: ${parts.map((p) => `${p.empty ? "[empty] " : ""}${p.name}`).join(" | ")}`);
        for (const run of emptyRuns(parts)) failures.push(`${screen.name} at ${width}: ${run.join(", ")}`);
      }
    }
    console.log(rows.join("\n"));
    expect(failures).toEqual([]);
  });

  // The check itself must see a run when there is one: three parts of each kind, added to a screen, are found; a part with a
  // row in it ends the run.
  test("the check finds a run of empty parts, of either kind, and a part with content ends it", async ({ page }) => {
    await page.goto("?token=e2e-token");
    await openScreen(page, "records/knowledge", "Knowledge");
    await page.evaluate(() => {
      const main = document.querySelector("main")!;
      const add = (html: string) => main.insertAdjacentHTML("beforeend", html);
      for (const n of [1, 2, 3]) add(`<section aria-labelledby="x${n}"><h2 id="x${n}">Region ${n}</h2><button>Add</button><p class="empty">Nothing yet.</p></section>`);
      add(`<section aria-labelledby="y1"><h2 id="y1">Region with a row</h2><ul><li>One</li></ul></section>`);
      add(`<div><h3>Part A</h3><p class="empty">Nothing yet.</p><h3>Part B</h3><div data-empty=""><p>Nothing yet.</p></div><h3>Part C</h3><p class="empty">Nothing yet.</p></div>`);
    });
    const runs = emptyRuns(await partsOnScreen(page));
    expect(runs).toEqual([["Region 1", "Region 2", "Region 3"], ["Part A", "Part B", "Part C"]]);
  });
});
