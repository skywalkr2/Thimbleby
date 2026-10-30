// usage: menus.mjs hash [clickFirstLineButton] -> opens every "More actions" menu in main and lists items
import { open, audit, go, mainText } from "./lib.mjs";
const [hash, pre, prefix="menu"] = process.argv.slice(2);
const { browser, page } = await open(); await go(page, hash);
if (pre) { await page.locator("main").getByRole("button", { name: pre }).first().click(); await page.waitForTimeout(1500); }
const menus = page.locator("main button[aria-label^='More actions']");
const n = await menus.count();
for (let i=0;i<n;i++){
  const m = menus.nth(i); const lab = await m.getAttribute("aria-label");
  await m.click(); await page.waitForTimeout(600);
  const items = await page.locator("[role=menu] [role=menuitem], [role=menu] [role=menuitemradio]").allInnerTexts();
  console.log(`${lab}\n   -> ${items.join(" | ")}`);
  if (i===0) await audit(page, `${prefix}-open`, {full:false});
  await page.keyboard.press("Escape"); await page.waitForTimeout(300);
}
await browser.close();
