// usage: sidecheck.mjs hash rowSelector
import { open, audit, go, mainText } from "./lib.mjs";
const [hash, rowSel="main li, main [data-row], main tr"] = process.argv.slice(2);
const { browser, page } = await open(); await go(page, hash);
const radios = page.locator("main [role=radiogroup][aria-label='Show'] [role=radio], main [role=radiogroup] [role=radio]");
const names = await radios.allInnerTexts();
console.log("radios:", names.map(n=>n.replace(/\n/g," ")));
for (const n of ["All","Personal","Northwind Clinic","Calloway Upholstery"]) {
  const r = page.locator("main [role=radio]").filter({ hasText: n }).first();
  if (!(await r.count())) { console.log("no radio", n); continue; }
  await r.click(); await page.waitForTimeout(1200);
  const rows = await page.locator(rowSel).allInnerTexts();
  console.log(`== ${n}: ${rows.length} rows`); rows.slice(0,30).forEach(x=>console.log("   ", x.replace(/\n+/g," | ").slice(0,120)));
}
await page.locator("main [role=radio]").filter({ hasText: "All" }).first().click();
await browser.close();
