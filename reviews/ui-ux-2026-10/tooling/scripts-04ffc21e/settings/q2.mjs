import { open, audit, go, mainText, info } from "./lib.mjs";
const { browser, ctx, page } = await open();
await go(page, "#settings/you");
for (const w of ["independent", "sample", "reading"]) { await page.locator("#settings-search").fill(w); await page.waitForTimeout(900); console.log(w, "=>", ((await mainText(page)).split("Journey mail")[1] || "").replace(/\n+/g, " / ").slice(0, 300)); }
// quality: enter counts
await go(page, "#quality");
const nums = page.locator("main input[type=number], main input[inputmode=numeric]");
console.log("num inputs:", await nums.count(), await page.locator("main input").evaluateAll(i => i.map(x => x.type + " " + (document.querySelector(`label[for="${x.id}"]`)?.innerText || ""))));
const ins = page.locator("main input:not([type=date])");
await ins.nth(0).fill("5"); await ins.nth(1).fill("9");
await page.getByRole("button", { name: "Save" }).click(); await page.waitForTimeout(1500);
console.log("after save 5/9:", ((await mainText(page)).split("Promises the app missed")[1] || "").replace(/\n+/g, " / ").slice(0, 400));
await audit(page, "quality-count-bad", { full: false });
await browser.close();
