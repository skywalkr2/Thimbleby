// Driving the app's own list to pick from (ui/Select): a button that opens a listbox in a panel of its own, not the browser's
// select, so Playwright's `selectOption` can't reach it. These open the list, read or click its choices and leave it closed.
import type { Locator } from "@playwright/test";

/** The panel of the list that is open, and its choices. */
const panel = (select: Locator) => select.page().locator("[data-select-panel]");
const optionsOf = (select: Locator) => panel(select).locator('[role="option"]');

/** The choices a list holds, in order, as their values and their words. The list is opened to read them and closed again. */
export async function choicesOf(select: Locator): Promise<Array<{ value: string; label: string; group: string | null }>> {
  await select.click();
  const found = await optionsOf(select).evaluateAll((items) =>
    items.map((item) => {
      // A choice in a group names it: the group's heading is the label the group points at.
      const owner = item.closest('[role="group"]')?.getAttribute("aria-labelledby");
      return { value: item.getAttribute("data-value") ?? "", label: (item.textContent ?? "").trim(), group: owner ? ((document.getElementById(owner)?.textContent ?? "").trim() || null) : null };
    }),
  );
  await select.page().keyboard.press("Escape");
  await panel(select).waitFor({ state: "detached" });
  return found;
}

/** The words of the choice the list shows now. */
export const shown = (select: Locator) => select.innerText().then((text) => text.trim());

/** Picks a choice: by its value (a plain string, as `selectOption` took it), or by its words (`{ label }`). */
export async function choose(select: Locator, pick: string | { label: string }): Promise<void> {
  await select.click();
  const options = optionsOf(select);
  if (typeof pick === "string") {
    const byValue = options.and(select.page().locator(`[data-value="${pick.replace(/"/g, '\\"')}"]`));
    if (await byValue.count()) await byValue.first().click();
    else await options.filter({ hasText: pick }).first().click();
  } else {
    await options.filter({ hasText: new RegExp(`^\\s*${pick.label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`) }).first().click();
  }
  await panel(select).waitFor({ state: "detached" });
}
