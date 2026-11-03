// What changed with titles that wrap to two lines: every row takes the height of its own content, so no row draws over the
// one before it, and the heading of the open change sits inside its side panel. The history is served from here, so the
// titles are the length the check needs and nothing else in the workspace matters.
import { expect, test, type Page } from "@playwright/test";

const LOADED = { timeout: 20_000 };
// A row's title is cut to its first words (design 7.7, "Titles are short"), so a title only takes a second line when its words are long
// ones: seven long words fill more than the width of the list at both widths.
const LONG = "Extraordinarily comprehensive internationalization documentation reorganization recommendations considerations implementations";

/** A change the assistant stopped on, titled by a note with a long topic: its row has a two-line title and a meta line. */
const change = (n: number) => ({
  id: `REQ-${n}`,
  version: 1,
  state: "failed",
  created_at: "2026-10-30T09:00:00Z",
  dismissed: false,
  first_go: false,
  stage_task: false,
  refused: false,
  changeset: null,
  note: null,
  source: null,
  source_title: null,
  waiting: null,
  title: { kind: "note", topic: `${LONG} (${n})` },
});

async function serveHistory(page: Page) {
  await page.route("**/api/changes", (route) => route.fulfill({ json: Array.from({ length: 12 }, (_, i) => change(i + 1)) }));
}

for (const width of [1280, 600]) {
  test(`What changed: rows with a two-line title do not overlap, at ${width}px`, async ({ page }) => {
    await serveHistory(page);
    await page.setViewportSize({ width, height: 800 });
    await page.goto("?token=e2e-token");
    await page.evaluate(() => {
      window.location.hash = "work/changed";
    });
    await expect(page.getByRole("heading", { level: 1, name: "What changed" })).toBeVisible(LOADED);
    const lists = page.locator("ol").filter({ has: page.locator("[data-row]") }).first();
    await expect(lists.locator("> [data-row]")).toHaveCount(12, LOADED);
    const rows = await lists.locator("> [data-row]").evaluateAll((els) =>
      els.map((e) => {
        const r = e.getBoundingClientRect();
        const title = e.querySelector("[id^='t-']")?.getBoundingClientRect();
        const meta = [...e.querySelectorAll("p")].pop()?.getBoundingClientRect();
        return { top: r.top, bottom: r.bottom, titleHeight: title?.height ?? 0, metaBottom: meta?.bottom ?? 0 };
      }),
    );
    // The title really wraps to more than one line, or the check proves nothing.
    expect(rows[0].titleHeight).toBeGreaterThan(30);
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i].top, `row ${i + 1} starts below row ${i}`).toBeGreaterThanOrEqual(rows[i - 1].bottom - 0.5);
    }
    // Each row is tall enough to hold its own last line.
    for (const row of rows) expect(row.bottom).toBeGreaterThanOrEqual(row.metaBottom - 0.5);
  });
}

test("What changed: the open change's heading sits inside its side panel, also once the page is scrolled", async ({ page }) => {
  await serveHistory(page);
  await page.setViewportSize({ width: 1280, height: 700 });
  await page.goto("?token=e2e-token");
  await page.evaluate(() => {
    window.location.hash = "work/changed";
  });
  const pane = page.locator("[data-detail-pane]");
  await expect(pane).toBeVisible(LOADED);
  const heading = pane.getByRole("heading", { level: 2 }).first();
  await expect(heading).toBeVisible(LOADED);
  const inside = async () => {
    const p = (await pane.boundingBox())!;
    const h = (await heading.boundingBox())!;
    expect(h.height).toBeGreaterThan(30);
    expect(h.y).toBeGreaterThanOrEqual(p.y);
    expect(h.y + h.height).toBeLessThanOrEqual(p.y + p.height);
    // Nothing else (the page's header) is drawn over the heading's first line.
    const top = await heading.evaluate((el) => {
      const r = el.getBoundingClientRect();
      const hit = document.elementFromPoint(r.left + 4, r.top + 4);
      return hit !== null && el.contains(hit);
    });
    expect(top, "the heading's top is not covered").toBe(true);
  };
  await inside();
  await page.mouse.move(400, 400);
  await page.mouse.wheel(0, 300);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(100);
  await inside();
});
