import { open, audit, go, mainText } from "./lib.mjs";
const toasts = async (page) => (await page.locator("[role=status], [role=alert]").allInnerTexts().catch(()=>[])).filter(Boolean).join(" | ").replace(/\n/g," ");
const { browser, ctx, page } = await open();
await go(page, "#settings/today");
console.log("vals:", await page.locator("main select").evaluateAll(s => s.map(x => x.value).slice(0, 6)));
console.log("radio:", await page.locator("input[type=radio]:checked").evaluateAll(r => r.map(x => x.closest("label")?.innerText || x.value)));
console.log("resets:", await page.getByRole("button", { name: /^Reset/ }).evaluateAll(b => b.map(x => x.getAttribute("aria-label"))));
const r = page.getByRole("button", { name: /^Reset: Working hours/ });
if (await r.count()) { await r.click(); await page.waitForTimeout(1500); console.log("after WH reset", await page.locator("main select").evaluateAll(s => s.map(x => x.value).slice(0, 6)), await toasts(page)); }
// try a night shift
const sels = page.locator("main select");
await sels.nth(2).selectOption("22:00"); await page.waitForTimeout(1200);
await sels.nth(3).selectOption("06:00"); await page.waitForTimeout(1200);
console.log("night shift:", await toasts(page));
await page.reload(); await page.waitForTimeout(2500);
console.log("vals after:", await page.locator("main select").evaluateAll(s => s.map(x => x.value).slice(0, 6)));
await page.getByRole("radio", { name: /Nowhere/ }).click(); await page.waitForTimeout(1200);
console.log(await toasts(page));
// phone width + dark
await browser.close();
