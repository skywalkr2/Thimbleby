// Quick changes are never lost (sweep X01): several settings changed one after another, at any pace, all hold after a
// reload. The pace is the person's: the next edit starts while the one before is still being saved.
import { expect, test, type Page } from "@playwright/test";

const LOADED = { timeout: 20_000 };
// The month is set before the day, and stays above it: a day limit above the month's is refused.
const LABELS = ["Ask me before anything over", "Most to spend in a month", "Most to spend in a day"];
const STEPS = [0, 600, 300];

/** Amounts that differ from what the boxes hold now, so a change that was dropped can't look like one that held. */
const nextFields = async (page: Page) => {
  const held = await Promise.all(LABELS.map((label) => page.getByRole("textbox", { name: label }).inputValue()));
  let base = (Date.now() % 300) + 1;
  for (;;) {
    base += 1;
    const shown = STEPS.map((step) => `$${base + step}.00`);
    if (!shown.some((s) => held.includes(s))) break;
  }
  return LABELS.map((label, n) => {
    const amount = base + STEPS[n];
    return { label, typed: String(amount), shown: `$${amount}.00` };
  });
};

const box = (page: Page, label: string) => page.getByRole("textbox", { name: label });

/** How many saves of settings the page has sent and had answered. */
function watchSaves(page: Page) {
  const seen = { sent: 0, answered: 0, refused: 0 };
  page.on("request", (r) => {
    if (r.method() === "POST" && r.url().endsWith("/api/settings")) seen.sent += 1;
  });
  page.on("response", (r) => {
    if (r.request().method() === "POST" && r.url().endsWith("/api/settings")) {
      seen.answered += 1;
      if (r.status() >= 400) seen.refused += 1;
    }
  });
  return seen;
}

async function typeInto(page: Page, label: string, text: string, how: "tab" | "click") {
  await box(page, label).click();
  await box(page, label).fill(text);
  if (how === "tab") await page.keyboard.press("Tab");
  else await page.getByRole("heading", { level: 1 }).first().click();
}

for (const [gap, lag] of [[0, 0], [250, 400], [1500, 0]]) {
  for (const how of ["tab", "click"] as const) {
    test(`three settings changed ${gap} ms apart, answered after ${lag} ms, leaving each with ${how}, all hold after a reload`, async ({ page }) => {
      test.setTimeout(120_000);
      // How long the computer takes to answer: the next change may start before, while or after the one before is saved.
      if (lag) {
        await page.route("**/api/settings", async (route) => {
          await new Promise((done) => setTimeout(done, lag));
          await route.continue();
        });
      }
      const saves = watchSaves(page);
      await page.goto("?token=e2e-token#settings/ai");
      await expect(box(page, LABELS[0])).toBeVisible(LOADED);
      const fields = await nextFields(page);
      for (const f of fields) {
        await typeInto(page, f.label, f.typed, how);
        if (gap) await page.waitForTimeout(gap);
      }
      for (const f of fields) await expect(box(page, f.label)).toHaveValue(f.shown, LOADED);
      // Each change is its own save, and every one is answered before the page is read again.
      await expect.poll(() => saves.answered, { timeout: 60_000, message: "every change is saved" }).toBe(3);
      expect(saves.refused).toBe(0);
      await page.reload();
      await expect(box(page, LABELS[0])).toBeVisible(LOADED);
      for (const f of fields) await expect(box(page, f.label), `${f.label} after a reload`).toHaveValue(f.shown, LOADED);
    });
  }
}

test("three Resets pressed one right after another all hold after a reload", async ({ page }) => {
  test.setTimeout(120_000);
  const saves = watchSaves(page);
  await page.goto("?token=e2e-token#settings/ai");
  await expect(box(page, LABELS[0])).toBeVisible(LOADED);
  const fields = await nextFields(page);
  for (const f of fields) await typeInto(page, f.label, f.typed, "tab");
  await expect.poll(() => saves.answered, { timeout: 60_000 }).toBe(3);
  const resets = LABELS.map((label) => page.getByRole("button", { name: `Reset: ${label}` }));
  for (const reset of resets) await expect(reset).toBeVisible(LOADED);
  const before = saves.answered;
  // The day goes back first, so it is never above the month's limit on the way.
  for (const reset of [...resets].reverse()) await reset.click();
  await expect.poll(() => saves.answered - before, { timeout: 60_000, message: "every Reset is saved" }).toBe(3);
  expect(saves.refused).toBe(0);
  await page.reload();
  await expect(box(page, LABELS[0])).toBeVisible(LOADED);
  for (const label of LABELS) await expect(page.getByRole("button", { name: `Reset: ${label}` }), `${label} is back to its default`).toHaveCount(0);
});

test("a field still being typed in when the save before it is answered keeps the cursor and is saved too", async ({ page }) => {
  test.setTimeout(120_000);
  const saves = watchSaves(page);
  // The computer answers after a while, so each save finishes while the next field is being typed in.
  await page.route("**/api/settings", async (route) => {
    await new Promise((done) => setTimeout(done, 700));
    await route.continue();
  });
  await page.goto("?token=e2e-token#settings/ai");
  await expect(box(page, LABELS[0])).toBeVisible(LOADED);
  const fields = await nextFields(page);
  for (const f of fields) {
    await box(page, f.label).click();
    await box(page, f.label).fill("");
    await box(page, f.label).pressSequentially(f.typed, { delay: 400 });
    await expect(box(page, f.label), "the cursor stays where the person is typing").toBeFocused();
    await page.keyboard.press("Tab");
  }
  await expect.poll(() => saves.answered, { timeout: 60_000, message: "every change is saved" }).toBe(3);
  expect(saves.refused).toBe(0);
  await page.reload();
  await expect(box(page, LABELS[0])).toBeVisible(LOADED);
  for (const f of fields) await expect(box(page, f.label), `${f.label} after a reload`).toHaveValue(f.shown, LOADED);
});

// A reload while saves are still on their way loses nothing (sweep X01, X75): what was typed is kept for the tab, comes back
// and is saved, and a save under way says so.
test("three quick edits and a reload before the first save is answered keep all three, and a save under way says Saving", async ({ page }) => {
  test.setTimeout(180_000);
  // The computer answers slowly, so the reload comes while the saves are still on their way.
  await page.route("**/api/settings", async (route) => {
    if (route.request().method() === "POST") await new Promise((done) => setTimeout(done, 2_500));
    await route.continue();
  });
  await page.goto("?token=e2e-token#settings/ai");
  await expect(box(page, LABELS[0])).toBeVisible(LOADED);
  const fields = await nextFields(page);
  for (const f of fields) {
    await box(page, f.label).click();
    await box(page, f.label).fill(f.typed);
    await page.keyboard.press("Tab");
  }
  // Saving is said at once, on the page and on the row, not only after the answer.
  await expect(page.locator("[data-save-status]")).toHaveText("Saving…");
  await expect(page.locator(`[data-key="ai.budgets.per_day_usd"] [data-saving]`)).toBeVisible();
  await page.reload();
  await expect(box(page, LABELS[0])).toBeVisible(LOADED);
  // Whatever was on its way when the page went is saved now: the computer holds all three.
  const keys = ["ai.budgets.confirm_above_usd", "ai.budgets.per_month_usd", "ai.budgets.per_day_usd"];
  await expect
    .poll(
      async () => {
        const view = (await (await page.request.get("api/settings", { headers: { Authorization: "Bearer e2e-token" } })).json()) as { items: Array<{ key: string; value: unknown }> };
        return keys.map((key) => view.items.find((i) => i.key === key)?.value);
      },
      { timeout: 90_000, message: "all three changes were saved" },
    )
    .toEqual(fields.map((f) => Number(f.typed)));
  await page.reload();
  await expect(box(page, LABELS[0])).toBeVisible(LOADED);
  for (const f of fields) await expect(box(page, f.label), `${f.label} after a second reload`).toHaveValue(f.shown, LOADED);
});
