import { open, audit, go, mainText, info } from "./lib.mjs";
const { browser, ctx, page } = await open(); await go(page,"#setup");
if (await page.getByText("Set them separately").count()) { await page.getByText("Set them separately").click(); await page.waitForTimeout(800); }
const cb = page.locator("main input[type=checkbox]");
for (const i of [0,2,5,6,8]) { await cb.nth(i).check(); await page.waitForTimeout(500); }
await audit(page, "s12-mail-sides-set");
await page.getByRole("button", { name: "Continue" }).click(); await page.waitForTimeout(2000);
await audit(page, "s13-promises");
console.log(await mainText(page));
await browser.close();
