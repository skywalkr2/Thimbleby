import { open, audit, go, mainText, info } from "./lib.mjs";
const { browser, ctx, page } = await open();
const gap = Number(process.env.GAP || 800);
await go(page, "#settings/ai");
const ids = ["Ask me before anything over", "Most to spend in a day", "Most to spend in a month"];
const f0 = page.getByRole("textbox", { name: ids[0] });
await f0.click(); await page.keyboard.press("Control+A"); await page.keyboard.type("0.3");
await page.keyboard.press("Tab"); await page.waitForTimeout(gap); await page.keyboard.press("Control+A"); await page.keyboard.type("4");
await page.keyboard.press("Tab"); await page.waitForTimeout(gap); await page.keyboard.press("Control+A"); await page.keyboard.type("50");
await page.keyboard.press("Tab"); await page.waitForTimeout(4000);
console.log("gap", gap, "msgs:", (await page.locator("body").innerText()).match(/(Saved\.[^\n]*|[^\n]*elsewhere[^\n]*)/gi));
console.log("screen:", await page.locator("main input[type=text]").evaluateAll(i => i.slice(0, 3).map(x => x.value)));
await page.reload(); await page.waitForTimeout(2500);
console.log("persisted:", await page.locator("main input[type=text]").evaluateAll(i => i.slice(0, 3).map(x => x.value)));
for (let i = 0; i < 3; i++) { const r = page.getByRole("button", { name: /^Reset/ }); if (await r.count()) { await r.first().click(); await page.waitForTimeout(2000); } }
await page.reload(); await page.waitForTimeout(2000);
console.log("reset to:", await page.locator("main input[type=text]").evaluateAll(i => i.slice(0, 3).map(x => x.value)));
await browser.close();
