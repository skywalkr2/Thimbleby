import { open, audit, go, mainText } from "./lib.mjs";
const { browser, ctx, page } = await open();
await go(page, "#settings/ai");
console.log("vals:", await page.locator("main input[type=text]").evaluateAll(i => i.map(x => x.value)));
const labels = await page.getByRole("button", { name: /^Reset/ }).evaluateAll(b => b.map(x => x.getAttribute("aria-label")));
console.log(labels);
for (let i = 0; i < labels.length; i++) { await page.getByRole("button", { name: /^Reset/ }).first().click(); await page.waitForTimeout(1200); }
await page.reload(); await page.waitForTimeout(2500);
console.log("vals after:", await page.locator("main input[type=text]").evaluateAll(i => i.map(x => x.value)));
await browser.close();
