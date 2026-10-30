import { open, audit, go, mainText, info } from "./lib.mjs";
const { browser, ctx, page } = await open();
await go(page, "#settings/ai-compare");
await page.getByRole("button", { name: "Measure" }).click(); await page.waitForTimeout(2000);
console.log("after measure click:", (await mainText(page)).split("Compare what accounts can do")[1]?.slice(0, 1200));
console.log("dialog:", await page.locator("[role=dialog]").innerText().catch(()=>"none"));
await audit(page, "cmp-measure-click");
for (let i = 0; i < 20; i++) { await page.waitForTimeout(3000); const t = await mainText(page); if (!/Measuring|running|…/.test(t)) break; }
console.log("later:", (await mainText(page)).split("Compare what accounts can do")[1]?.slice(0, 2000));
await audit(page, "cmp-measured");
await page.getByRole("button", { name: "Back to settings" }).click(); await page.waitForTimeout(1500);
console.log("back went to:", page.url().split("#")[1]);
await browser.close();
