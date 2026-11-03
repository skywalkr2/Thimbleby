// Signing an account in through the stand-in service's own page, as a person does: the app opens the service's sign-in in a
// window of its own, the window lists the made-up accounts as links, and picking one sends the window back to the app.
import type { Page } from "playwright-core";

/** Signs in one account from the Connections screen (the first through "Sign in", the others through "Add another account"). */
export async function chromiumSignIn(page: Page, address: string, first: boolean): Promise<void> {
  const section = page.locator("section", { has: page.locator("#sign-ins-title") }).first();
  const button = first
    ? section.getByRole("button", { name: "Sign in to Example mail", exact: true })
    : section.getByRole("button", { name: "Add another account to Example mail", exact: true });
  const [popup] = await Promise.all([page.waitForEvent("popup", { timeout: 30_000 }), button.click()]);
  await popup.getByRole("link", { name: address, exact: true }).click();
  await popup.waitForEvent("close", { timeout: 30_000 }).catch(() => undefined);
  await section.getByText(address).first().waitFor({ timeout: 60_000, state: "visible" });
}
