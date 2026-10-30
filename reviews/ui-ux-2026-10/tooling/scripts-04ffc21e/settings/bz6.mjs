import { open, audit, go, mainText, info } from "./lib.mjs";
const { browser, ctx, page } = await open();
await go(page, "#settings/you");
await page.getByRole("button", { name: "Open the setup guide" }).click(); await page.waitForTimeout(2000);
console.log("url:", page.url().split("#")[1]);
console.log((await page.locator("body").innerText()).slice(0, 1500));
await audit(page, "setup-guide-from-settings");
const step = page.getByRole("button", { name: /What it's for/ }).or(page.getByRole("link", { name: /What it's for/ }));
console.log("step ctrls:", await step.count());
if (await step.count()) { await step.first().click(); await page.waitForTimeout(1500); console.log("STEP:", (await mainText(page)).slice(0, 1500)); await audit(page, "setup-guide-whatfor"); }
await browser.close();
