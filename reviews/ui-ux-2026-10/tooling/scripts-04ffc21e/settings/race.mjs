import { open, audit, go, mainText, info } from "./lib.mjs";
const { browser, ctx, page } = await open();
await go(page, "#settings/ai");
const ids = ["Ask me before anything over", "Most to spend in a day", "Most to spend in a month"];
const vals = ["0.2", "3", "40"];
for (let i = 0; i < 3; i++) { const f = page.getByRole("textbox", { name: ids[i] }); await f.fill(vals[i]); await f.press("Tab"); await page.waitForTimeout(250); }
await page.waitForTimeout(3000);
console.log("msgs:", (await page.locator("body").innerText()).match(/(Saved\.[^\n]*|[^\n]*changed elsewhere[^\n]*|[^\n]*look again[^\n]*|[^\n]*refused[^\n]*|[^\n]*Try again[^\n]*)/gi));
await audit(page, "race-quick-edits", { full: false });
await page.reload(); await page.waitForTimeout(2500);
console.log("persisted:", await page.locator("main input[type=text]").evaluateAll(i => i.slice(0, 3).map(x => x.value)));
const r = page.getByRole("button", { name: /^Reset/ });
console.log("resets:", await r.count());
for (let i = 0; i < 3; i++) { if (await r.count()) { await r.first().click(); await page.waitForTimeout(300); } }
await page.waitForTimeout(3000);
console.log("msgs2:", (await page.locator("body").innerText()).match(/(Saved\.[^\n]*|[^\n]*changed elsewhere[^\n]*|[^\n]*look again[^\n]*)/gi));
await page.reload(); await page.waitForTimeout(2500);
console.log("after quick resets:", await page.locator("main input[type=text]").evaluateAll(i => i.slice(0, 3).map(x => x.value)));
await browser.close();
