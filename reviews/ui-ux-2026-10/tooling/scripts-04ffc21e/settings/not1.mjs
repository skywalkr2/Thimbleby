import { open, audit, go, mainText } from "./lib.mjs";
const toasts = async (page) => (await page.locator("[role=status], [role=alert], [aria-live]").allInnerTexts().catch(()=>[])).filter(Boolean).join(" | ").replace(/\n/g," ");
{
const { browser, page } = await open();
await go(page, "#settings/today");
console.log("perm:", await page.evaluate(() => Notification.permission));
await page.getByRole("checkbox", { name: /Tell me when something needs me/ }).check(); await page.waitForTimeout(1500);
console.log("toasts:", await toasts(page));
await audit(page, "not-on-denied");
console.log((await mainText(page)).split("Ways to get a notice")[1]?.slice(0, 800));
await browser.close();
}
{
const { browser, ctx, page } = await open();
await ctx.grantPermissions(["notifications"], { origin: process.env.APP.replace(/\/$/, "") });
await page.reload(); await page.waitForTimeout(2000);
await go(page, "#settings/today");
console.log("perm2:", await page.evaluate(() => Notification.permission));
await audit(page, "not-on-granted");
console.log((await mainText(page)).split("Ways to get a notice")[1]?.slice(0, 800));
const btns = await page.locator("main button").evaluateAll(b => b.map(x => x.textContent.trim()).filter(Boolean));
console.log("buttons:", btns);
await browser.close();
}
