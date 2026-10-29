// The first day (promise P77): a fresh workspace after setup with a business, read as a person reads it on the first
// evening. On every main screen, three or more parts in a row that each show only a "nothing yet" message is a screen that
// looks unfinished. What counts as a part, and as empty, is in `partsOnScreen` (first-day-helpers.ts): a named region, or a
// heading with what follows it, whose only content is an empty-state message.
// The server (`--first-day`) holds nothing but the business, an empty project in it and one run waiting for the first go.
import { expect, test } from "@playwright/test";
import { emptyRuns, LOADED, openScreen, partsOnScreen, screens, setUpWithBusiness, SIDE, type FirstDay } from "./first-day-helpers";

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

// What the review of the first-day captures found (part B of promise P77). Each is a person's path on the fresh workspace.
test.describe("the first day, read as a person reads it", () => {
  test.beforeAll(async ({ request }) => {
    day = await setUpWithBusiness(request);
  });

  test.beforeEach(async ({ page }) => {
    await page.goto("?token=e2e-token");
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible(LOADED);
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  // F1: setup made these records; the person changed none of them.
  test("setup's own writes are the records being set up and never a change the person made", async ({ page }) => {
    for (const [hash, heading] of [
      [`records/project/${encodeURIComponent(day.side)}`, SIDE],
      [`records/project/${encodeURIComponent(day.project)}`, "First catalog"],
      [`records/person/${encodeURIComponent(day.person)}`, /./],
    ] as const) {
      await openScreen(page, hash, heading);
      const activity = page.getByRole("region", { name: "Activity", exact: true });
      await expect(activity).toBeVisible(LOADED);
      const text = (await activity.innerText()).replace(/\s+/g, " ");
      expect(text, hash).not.toMatch(/changed|target date|why they matter|the organization of/i);
      // One line for the record being made, and nothing more.
      await expect(activity.getByRole("listitem")).toHaveCount(1);
    }
  });

  // F2 and F3: a flag that is off says nothing, and the heading's name is not said again under it.
  test("Details leave out a flag that is off, and do not say the name the heading says", async ({ page }) => {
    await openScreen(page, `records/project/${encodeURIComponent(day.project)}`, "First catalog");
    const project = page.getByRole("region", { name: "Details", exact: true });
    await expect(project).toBeVisible(LOADED);
    await expect(project.getByText("Area", { exact: true })).toHaveCount(0);
    await expect(project.getByText("No", { exact: true })).toHaveCount(0);
    await expect(project.getByText("First catalog", { exact: true })).toHaveCount(0);

    await openScreen(page, `records/project/${encodeURIComponent(day.side)}`, SIDE);
    const business = page.getByRole("region", { name: "Details", exact: true });
    await expect(business).toBeVisible(LOADED);
    await expect(business.getByText(SIDE, { exact: true })).toHaveCount(0);
    // The business is its organization too, on one page: there is no second page to link to.
    await expect(business.getByRole("link", { name: "Your business" })).toHaveCount(0);

    await openScreen(page, `records/person/${encodeURIComponent(day.person)}`, /./);
    const person = page.getByRole("region", { name: "Your details", exact: true });
    await expect(person).toBeVisible(LOADED);
    await expect(person.getByText("Full name", { exact: true })).toHaveCount(0);
  });

  // F4: with no mailbox and no calendar, Today's side column still has the Schedule card, so the queue is not left in two
  // thirds of the width with a blank column beside it.
  test("at 1440 Today's queue and its side column fill the width, with a Schedule card that says nothing is on and offers a calendar", async ({ page }) => {
    await openScreen(page, "today", "Today");
    const rail = page.getByRole("group", { name: "Briefing, schedule and mail" });
    const schedule = rail.getByRole("region", { name: "Schedule" });
    await expect(schedule).toBeVisible(LOADED);
    await expect(schedule.getByText(/^Nothing on your calendar/)).toBeVisible();
    await expect(schedule.getByRole("link", { name: "Connect a calendar" })).toHaveAttribute("href", /#settings\/connections$/);
    await expect(page.locator("main [data-skeleton]")).toHaveCount(0, LOADED);
    const boxes = await page.evaluate(() => {
      const main = document.querySelector("main")!;
      const box = (el: Element | null) => (el ? el.getBoundingClientRect() : null);
      const queue = box(main.querySelector("[data-region]"));
      const side = box(main.querySelector('[role="group"][aria-label="Briefing, schedule and mail"]'));
      const area = box(main)!;
      return { main: { left: area.left, right: area.right, width: area.width }, queue, side };
    });
    expect(boxes.queue, "the queue").not.toBeNull();
    expect(boxes.side, "the side column").not.toBeNull();
    expect(boxes.side!.height).toBeGreaterThan(40);
    // Everything from the queue's left edge to the side column's right edge, against the main area: no blank third.
    const blank = boxes.main.width - (boxes.side!.right - boxes.queue!.left);
    expect(blank, `blank width beside the queue: ${Math.round(blank)} of ${Math.round(boxes.main.width)}`).toBeLessThanOrEqual(boxes.main.width / 3);
    expect(boxes.side!.left).toBeGreaterThanOrEqual(boxes.queue!.right - 1);
  });

  // F5: a filter with one choice besides "All" is noise.
  test("People offers no Organization filter while there is one organization", async ({ page }) => {
    await openScreen(page, "records/people", "People");
    await expect(page.getByRole("region", { name: "Organizations", exact: true })).toBeVisible(LOADED);
    await expect(page.getByRole("combobox", { name: "Organization" })).toHaveCount(0);
  });

  // F6: a fold shows that it is one, and tabs over nothing are not drawn.
  test("Follow-ups with nothing to follow up draws no tabs, and the message style is a fold with a visible control", async ({ page }) => {
    await openScreen(page, "work/followups", "Follow-ups");
    await expect(page.getByText(/Nobody is waiting on anything from you/)).toBeVisible(LOADED);
    for (const name of ["By person", "By project", "To send", "Later", "Waiting on them"]) await expect(page.getByRole("button", { name })).toHaveCount(0);
    const fold = page.locator("summary", { hasText: "How your messages start and end" });
    await expect(fold).toBeVisible(LOADED);
    const control = await fold.evaluate((el) => {
      const before = getComputedStyle(el, "::before");
      return { content: before.content, width: before.width, listStyle: getComputedStyle(el).display };
    });
    expect(control.content).toBe('""');
    expect(parseFloat(control.width)).toBeGreaterThan(0);
    // Open, the control turns (a different transform).
    const closed = await fold.evaluate((el) => getComputedStyle(el, "::before").transform);
    await fold.click();
    const opened = await fold.evaluate((el) => getComputedStyle(el, "::before").transform);
    expect(opened).not.toBe(closed);
  });
});
