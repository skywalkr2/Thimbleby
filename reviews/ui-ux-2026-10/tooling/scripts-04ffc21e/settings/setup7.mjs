import { open, audit, go, mainText, info } from "./lib.mjs";
const { browser, ctx, page } = await open(); await go(page, "#setup");
await page.getByRole("button", { name: "Continue" }).click(); await page.waitForTimeout(2500);
console.log("=== done\n" + (await mainText(page)).slice(0, 1500));
await audit(page, "setup-done");
await page.getByRole("button", { name: "Go to Today" }).click(); await page.waitForTimeout(3000);
await audit(page, "today-after-setup");
console.log((await page.locator("body").innerText()).slice(0, 2500));
await browser.close();
