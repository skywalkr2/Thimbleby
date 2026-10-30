import { open, audit, go, mainText } from "./lib.mjs";
const { browser, page } = await open();
await go(page, "#records/project/PRJ-3");
await page.getByRole("link", { name: /The notes list that the budget/ }).first().click(); await page.waitForTimeout(2000);
console.log("FACT URL", page.url()); await audit(page, "r01-fact-page");
console.log((await mainText(page)).slice(0,2000));
console.log("BUTTONS:", await page.locator("main button, main a").evaluateAll(e=>e.map(x=>(x.getAttribute('aria-label')||x.textContent).trim()).filter(Boolean).join(" | ")));
const m = page.locator("main button[aria-label^='More actions']"); 
if (await m.count()) { await m.first().click(); await page.waitForTimeout(500); console.log("MENU:", await page.locator("[role=menu] [role=menuitem]").allInnerTexts()); await page.keyboard.press("Escape"); }
// source link
const src = page.locator("main a").filter({ hasText: /calendar entry|email|from/i }).first();
if (await src.count()) { await src.click(); await page.waitForTimeout(2000); console.log("SOURCE URL", page.url()); await audit(page, "r02-source-page"); console.log((await mainText(page)).slice(0,2000)); console.log("BUTTONS:", await page.locator("main button, main a").evaluateAll(e=>e.map(x=>(x.getAttribute('aria-label')||x.textContent).trim()).filter(Boolean).join(" | "))); }
await browser.close();
