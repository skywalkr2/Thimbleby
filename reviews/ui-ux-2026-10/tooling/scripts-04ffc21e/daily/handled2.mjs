import { open, go, audit, mainText, info } from "../../lib.mjs";
const { browser, ctx, page } = await open({});
await go(page, "#work/handled");
await page.getByRole("button", { name: /Sales and promotions/ }).click(); await page.waitForTimeout(1200);
await audit(page, "hd-group");
console.log("GROUP:", (await mainText(page)).slice(0, 2000));
console.log(await page.locator("main button, main a").evaluateAll(els => els.map(e => (e.getAttribute("aria-label")||e.textContent.trim()).slice(0,50))));
const more = page.locator("main button[aria-label^='More']").first();
if (await more.count()) { await more.click(); await page.waitForTimeout(700); console.log("MENU:", (await page.locator("[role=menu]").allInnerTexts()).join(" | ")); await audit(page, "hd-menu", { full: false }); await page.keyboard.press("Escape"); }
const item = page.locator("main li").filter({ hasNotText: "Sales and promotions" }).first();
await item.click({ position: { x: 200, y: 10 } }).catch(()=>{}); await page.waitForTimeout(1200);
await audit(page, "hd-item", { full: false });
console.log("ITEM:", (await mainText(page)).slice(0, 2500));
await page.getByRole("button", { name: "Bring it in" }).first().click().catch(e=>console.log("no bring it in")); await page.waitForTimeout(1500);
await audit(page, "hd-bring", { full: false });
console.log("AFTER BRING:", (await page.locator("body").innerText()).slice(-800));
await browser.close();
