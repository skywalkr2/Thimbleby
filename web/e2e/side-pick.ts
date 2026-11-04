// Picks a choice of the side filter the way a person does: from the strip of choices when it is drawn, else from the one button's sheet.
// A few short names are a strip; more than five choices, or a long name, are the button and its sheet at every width.
import { expect, type Locator, type Page } from "@playwright/test";

const LOADED = { timeout: 20_000 };

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Whichever of the two the page draws: the strip of choices, or the button that opens the sheet. */
export const sideFilter = (page: Page): Locator => page.getByRole("radiogroup", { name: "Show" }).or(page.getByRole("button", { name: /^Side: / })).first();

/** Chooses a side (or "All") by the name the filter shows. */
export async function pickSide(page: Page, name: string): Promise<void> {
  const choice = new RegExp(`^${escape(name)}(,|$)`);
  await expect(sideFilter(page)).toBeVisible(LOADED);
  const strip = page.getByRole("radiogroup", { name: "Show" }).first();
  if (await strip.isVisible().catch(() => false)) {
    await strip.getByRole("radio", { name: choice }).click();
    return;
  }
  await page.getByRole("button", { name: /^Side: / }).first().click();
  await page.getByRole("dialog", { name: "Show one side" }).getByRole("button", { name: choice }).click();
}

/** Whether the filter now shows this side as the pick. */
export async function expectPicked(page: Page, name: string): Promise<void> {
  const strip = page.getByRole("radiogroup", { name: "Show" }).first();
  if (await strip.isVisible().catch(() => false)) {
    await expect(strip.getByRole("radio", { name: new RegExp(`^${escape(name)}(,|$)`), checked: true })).toBeVisible();
    return;
  }
  await expect(page.getByRole("button", { name: `Side: ${name}` })).toBeVisible();
}
