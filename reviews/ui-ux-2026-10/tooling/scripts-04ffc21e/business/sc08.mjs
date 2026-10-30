import { open, audit, go, mainText } from "./lib.mjs";
const { browser, page } = await open();
await go(page, "#schedule");
await page.getByText("Fabric delivery from Owen").first().click(); await page.waitForTimeout(1200);
await page.locator("main").getByText("Open", {exact:true}).last().click(); await page.waitForTimeout(2000);
console.log("URL", page.url());
await audit(page, "sc08-own-entry-page");
console.log((await mainText(page)).slice(0,2500));
console.log("BUTTONS:", await page.locator("main button, main a").evaluateAll(e=>e.map(x=>(x.getAttribute('aria-label')||x.textContent).trim()).filter(Boolean).join(" | ")));
const m = page.locator("main button[aria-label^='More actions']"); 
if (await m.count()) { await m.first().click(); await page.waitForTimeout(500); console.log("MENU:", await page.locator("[role=menu] [role=menuitem]").allInnerTexts()); }
await browser.close();
