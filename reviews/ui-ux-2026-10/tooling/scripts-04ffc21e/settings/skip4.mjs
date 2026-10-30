import { open, audit, go, mainText } from "./lib.mjs";
const { browser, page } = await open();
await go(page, "#settings/connections");
await page.getByRole("button", { name: "Ask how to add one" }).click(); await page.waitForTimeout(1500);
await page.locator("button[type=submit]", { hasText: "Ask" }).click(); await page.waitForTimeout(6000);
console.log((await page.locator("aside, [role=complementary], [role=dialog]").allInnerTexts()).join(" || ").slice(0, 1200));
await audit(page, "skip-ask-pressed", { full: false });
await browser.close();
