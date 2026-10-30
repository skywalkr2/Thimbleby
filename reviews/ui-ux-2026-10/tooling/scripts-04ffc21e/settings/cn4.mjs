import { open, audit, go, mainText, info } from "./lib.mjs";
const toasts = async (page) => (await page.locator("[role=status], [role=alert]").allInnerTexts().catch(()=>[])).filter(Boolean).join(" | ").replace(/\n/g," ");
const { browser, ctx, page } = await open();
await go(page, "#today"); console.log("today:", (await mainText(page)).slice(0, 700).replace(/\n/g, " / "));
await go(page, "#settings/connections");
const menus = page.locator("main button[aria-haspopup]");
console.log("menus:", await menus.evaluateAll(b => b.map(x => x.getAttribute("aria-label"))));
// account menu
await menus.first().click(); await page.waitForTimeout(600);
console.log("ACCOUNT MENU:", await page.locator("[role=menu]").innerText().catch(()=>"none"));
await page.keyboard.press("Escape");
// inbox row menu
await menus.nth(1).click(); await page.waitForTimeout(600);
console.log("INBOX MENU:", await page.locator("[role=menu]").innerText().catch(()=>"none"));
await audit(page, "cn-inbox-menu", { full: false });
await page.keyboard.press("Escape");
await browser.close();
