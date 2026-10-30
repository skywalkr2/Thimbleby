import { open, audit, go, mainText, info } from "./lib.mjs";
const { browser, ctx, page } = await open();
await go(page, "#settings/ai");
for (let i = 0; i < 4; i++) { const r = page.getByRole("button", { name: /^Reset: (Ask|Most)/ }); if (!(await r.count())) break; await r.first().click(); await page.waitForTimeout(3500); }
await page.reload(); await page.waitForTimeout(2000);
console.log(await page.locator("main input[type=text]").evaluateAll(i => i.slice(0, 3).map(x => x.value)));
await browser.close();
