import { open, audit, go, mainText, info } from "./lib.mjs";
const { browser, ctx, page } = await open();
await go(page, "#today");
console.log("btn bg:", await page.locator("header button", { hasText: "Hand something in" }).evaluate(b => getComputedStyle(b).backgroundColor));
console.log("logo img:", await page.locator("header img").evaluateAll(i => i.map(x => x.src + " ok=" + (x.naturalWidth > 0))));
await audit(page, "ap-reloaded-today", { full: false });
// user menu theme switch
await page.locator("header").getByRole("button", { name: /DW|Dana|account|menu/i }).last().click(); await page.waitForTimeout(800);
console.log("USER MENU:", await page.locator("[role=menu], [role=dialog]").innerText().catch(()=>"none"));
await audit(page, "usermenu-open", { full: false });
await browser.close();
