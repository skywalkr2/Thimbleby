import { open, audit, go, mainText } from "./lib.mjs";
const toasts = async (page) => (await page.locator("[role=status], [role=alert]").allInnerTexts().catch(()=>[])).filter(Boolean).join(" | ").replace(/\n/g," ");
const { browser, ctx, page } = await open();
await go(page, "#settings/ai");
const f = page.getByRole("textbox", { name: "Ask me before anything over" });
for (const v of ["1.5", "$1.50", "1,50", "abc", "-3", "0", "1000000", " 0.25 "]) {
  await f.fill(v); await f.press("Tab"); await page.waitForTimeout(1300);
  const err = await page.locator("main [role=alert], main .error, main [id$=-error]").allInnerTexts().catch(()=>[]);
  console.log(JSON.stringify(v), "=> shown:", await f.inputValue(), "| err:", err.join(" ; "), "| toasts:", (await toasts(page)).slice(0, 300));
  if (v === "abc" || v === "1,50" || v === "1000000") await audit(page, "ai-money-" + v.replace(/\W/g, "_"), { full: false });
}
await page.reload(); await page.waitForTimeout(2500);
console.log("after reload:", await page.getByRole("textbox", { name: "Ask me before anything over" }).inputValue());
const day = page.getByRole("textbox", { name: "Most to spend in a day" });
const mon = page.getByRole("textbox", { name: "Most to spend in a month" });
await day.fill("50"); await day.press("Tab"); await page.waitForTimeout(1300);
await mon.fill("5"); await mon.press("Tab"); await page.waitForTimeout(1300);
console.log("day 50 month 5:", await day.inputValue(), await mon.inputValue(), "|", await toasts(page));
await audit(page, "ai-money-day-gt-month", { full: false });
// put back
for (const r of await page.getByRole("button", { name: /^Reset: (Ask me|Most to spend)/ }).all()) { await r.click(); await page.waitForTimeout(1000); }
console.log("after reset:", await f.inputValue(), await day.inputValue(), await mon.inputValue());
await browser.close();
