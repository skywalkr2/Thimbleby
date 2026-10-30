import { open, audit, go, mainText } from "./lib.mjs";
const { browser, ctx, page } = await open();
await go(page, "#settings/ai");
console.log(await page.getByRole("button", { name: /^Reset/ }).evaluateAll(b => b.map(x => x.getAttribute("aria-label"))));
const r = page.getByRole("button", { name: "Reset: Most to spend in a month" });
if (await r.count()) { await r.click(); await page.waitForTimeout(2000); console.log("toasts:", (await page.locator("[role=status],[role=alert]").allInnerTexts()).join("|")); await audit(page, "ai-reset-month", {full:false}); }
await page.reload(); await page.waitForTimeout(2500);
console.log("vals after:", await page.locator("main input[type=text]").evaluateAll(i => i.map(x => x.value)));
await browser.close();
