import { open, audit, go, mainText } from "./lib.mjs";
const toasts = async (page) => (await page.locator("[role=status], [role=alert]").allInnerTexts().catch(()=>[])).filter(Boolean).join(" | ").replace(/\n/g," ");
const { browser, ctx, page } = await open();
await ctx.addInitScript(() => {
  let perm = "default";
  class N { constructor(t, o) { window.__notes = (window.__notes||[]).concat([[t, o && o.body]]); } static get permission() { return perm; } static requestPermission() { perm = "granted"; return Promise.resolve("granted"); } close(){} addEventListener(){} }
  window.Notification = N;
});
await page.reload(); await page.waitForTimeout(2000);
await go(page, "#settings/today");
console.log("perm:", await page.evaluate(() => Notification.permission));
await audit(page, "not-default-perm");
let t = await mainText(page); console.log(t.split("Ways to get a notice")[1]?.slice(0, 600));
const btns = await page.locator("main button").evaluateAll(b => b.map(x => x.textContent.trim()).filter(Boolean));
console.log("buttons:", btns);
const allow = page.getByRole("button", { name: /Allow|Turn on|Try|Send a test/i });
console.log("allow-like:", await allow.allInnerTexts());
if (await allow.count()) { await allow.first().click(); await page.waitForTimeout(1500); console.log("after allow:", (await mainText(page)).split("Ways to get a notice")[1]?.slice(0, 600), await toasts(page)); await audit(page, "not-after-allow"); }
const tries = page.getByRole("button", { name: /Try|test/i });
console.log("try-like:", await tries.allInnerTexts());
if (await tries.count()) { await tries.first().click(); await page.waitForTimeout(1500); console.log("notes:", await page.evaluate(() => window.__notes), await toasts(page)); }
// More links
const mores = page.getByRole("button", { name: "More", exact: true });
for (let i = 0; i < await mores.count(); i++) { await mores.nth(i).click(); await page.waitForTimeout(300); }
await page.locator("summary", { hasText: "More settings" }).click(); await page.waitForTimeout(800);
await audit(page, "not-more-open");
t = await mainText(page); console.log("MORE OPEN:", t.split("More settings")[1]?.replace(/\n(\d\d:\d\d\n)+/g, "\n[times]\n").slice(0, 3000));
await browser.close();
