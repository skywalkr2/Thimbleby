import { open, go, audit, mainText, info } from "../../lib.mjs";
const { browser, page } = await open();
await audit(page, "s01-welcome");
await page.getByRole("button", { name: "Start" }).click(); await page.waitForTimeout(1200);
await audit(page, "s02-you");
console.log(await page.locator("body").innerText());
await browser.close();
