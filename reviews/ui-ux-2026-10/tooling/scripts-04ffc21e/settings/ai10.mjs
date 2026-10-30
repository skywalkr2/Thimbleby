import { open, audit, go, mainText, info } from "./lib.mjs";
const { browser, ctx, page } = await open();
await go(page, "#settings/ai-compare");
await page.getByRole("button", { name: /Measure/ }).click(); await page.waitForTimeout(2500);
console.log("1:", (await mainText(page)).split("Compare what accounts can do")[1]?.slice(0, 600));
const b = page.getByRole("button", { name: /Measure/ });
console.log("btn:", await b.innerText());
await b.click(); await page.waitForTimeout(4000);
console.log("2:", (await mainText(page)).split("Compare what accounts can do")[1]?.slice(0, 1500));
await audit(page, "cmp-measure-2");
for (let i = 0; i < 30; i++) { await page.waitForTimeout(4000); const t = await mainText(page); if (!/Measuring|so far|running/i.test(t)) break; }
console.log("3:", (await mainText(page)).split("Compare what accounts can do")[1]?.slice(0, 2500));
await audit(page, "cmp-measure-3");
await go(page, "#settings/ai");
console.log("AI page:", (await mainText(page)).split("AI accounts")[1]?.split("Choose which")[0]);
await browser.close();
