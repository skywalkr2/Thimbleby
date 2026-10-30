import { open, go, audit, mainText, info } from "../../lib.mjs";
const { browser, ctx, page } = await open({});
await go(page, "#work/handled");
await audit(page, "hd-main");
console.log("HANDLED:", (await mainText(page)).slice(0, 1500));
console.log(await page.locator("main button, main a, main [role=tab]").evaluateAll(els => els.map(e => (e.getAttribute("aria-label")||e.textContent.trim()).slice(0,50))));
const row = page.locator("main li, main [role=row]").nth(0);
await row.click({ position: { x: 300, y: 10 } }).catch(()=>{}); await page.waitForTimeout(1200);
await audit(page, "hd-row", { full: false });
console.log("ROW OPEN:", (await mainText(page)).slice(0, 2000));
const more = page.locator("main button[aria-label^='More actions']").first();
if (await more.count()) { await more.click(); await page.waitForTimeout(700); console.log("MENU:", (await page.locator("[role=menu]").allInnerTexts()).join(" | ")); await audit(page, "hd-menu", { full: false }); await page.keyboard.press("Escape"); }
await page.getByRole("button", { name: /Read, nothing to do/ }).click().catch(()=>page.getByText(/Read, nothing to do/).first().click()); await page.waitForTimeout(1200);
await audit(page, "hd-read");
console.log("READ TAB:", (await mainText(page)).slice(0, 1500));
await browser.close();
