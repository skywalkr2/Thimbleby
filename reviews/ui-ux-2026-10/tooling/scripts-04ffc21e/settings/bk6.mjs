import { open, audit, go, mainText, info } from "./lib.mjs";
const inf = await info();
const toasts = async (page) => (await page.locator("[role=status], [role=alert]").allInnerTexts().catch(()=>[])).filter(Boolean).join(" | ").replace(/\n/g," ");
const { browser, ctx, page } = await open();
await go(page, "#settings/backups");
const f = page.locator("[id='setting-storage.sync.folder']");
for (const v of ["nonsense folder name", inf.workspace + "/inside", process.env.SYNC]) {
  await f.fill(v); await f.press("Tab"); await page.waitForTimeout(2500);
  const errs = await page.locator("main [role=alert]").allInnerTexts();
  console.log(JSON.stringify(v.slice(-40)), "=> val:", (await f.inputValue()).slice(-40), "| err:", errs.join(";"), "| toasts:", (await toasts(page)).slice(0, 400));
  await audit(page, "bk-sync-" + (v === process.env.SYNC ? "good" : v.startsWith("non") ? "nonsense" : "inside"), { full: false });
}
await page.reload(); await page.waitForTimeout(2500);
console.log("after reload:", await page.locator("[id='setting-storage.sync.folder']").inputValue());
console.log("synced section:", (await mainText(page)).split("Synced folder").slice(-1)[0].replace(/\n+/g, " / ").slice(0, 600));
await audit(page, "bk-sync-after-reload");
await browser.close();
