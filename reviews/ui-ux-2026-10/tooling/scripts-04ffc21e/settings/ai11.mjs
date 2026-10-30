import { open, audit, go, mainText, info } from "./lib.mjs";
const { browser, ctx, page } = await open();
await go(page, "#settings/ai-compare");
await page.getByRole("button", { name: /Measure/ }).click(); await page.waitForTimeout(2500);
await page.getByRole("button", { name: "Test anyway" }).click(); await page.waitForTimeout(3000);
console.log("A:", (await mainText(page)).split("Compare what accounts can do")[1]?.slice(0, 1200));
await audit(page, "cmp-test-anyway");
for (let i = 0; i < 40; i++) { await page.waitForTimeout(5000); const t = await mainText(page); if (!/Measuring|so far|running|of \d+/i.test(t)) break; }
console.log("B:", (await mainText(page)).split("Compare what accounts can do")[1]?.slice(0, 2500));
await audit(page, "cmp-after");
console.log("hdr:", (await page.locator("header").innerText()).replace(/\n/g, " / "));
await browser.close();
