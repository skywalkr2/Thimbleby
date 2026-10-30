import { open, audit, go, mainText, info } from "./lib.mjs";
const toasts = async (page) => (await page.locator("[role=status], [role=alert]").allInnerTexts().catch(()=>[])).filter(Boolean).join(" | ").replace(/\n/g," ");
const { browser, ctx, page } = await open();
await go(page, "#settings/connections");
const menus = page.locator("main button[aria-haspopup]");
await menus.nth(1).click(); await page.waitForTimeout(600);
await page.getByRole("menuitem", { name: "Change" }).click(); await page.waitForTimeout(1500);
const sels = page.locator("main form select, main select");
const priv = await page.locator("main select").evaluateAll(s => s.map(x => [...x.options].map(o => o.text)));
console.log("selects opts:", JSON.stringify(priv));
// privacy select: the one containing 'Like what it serves'
const idx = priv.findIndex(o => o.some(t => /Like what it serves/.test(t)));
await page.locator("main select").nth(idx).selectOption({ index: 1 });
await page.getByRole("button", { name: "Save changes" }).click(); await page.waitForTimeout(2500);
console.log("after save privacy:", await toasts(page));
console.log("inbox row:", (await mainText(page)).split("Your inbox")[1]?.split("Your calendar")[0].replace(/\n+/g, " / "));
// remove last duplicate
const n = await menus.count();
await menus.nth(n - 1).click(); await page.waitForTimeout(500);
await page.getByRole("menuitem", { name: "Remove" }).click(); await page.waitForTimeout(1500);
console.log("remove ->", await toasts(page), "| dialog:", await page.locator("[role=dialog],[role=alertdialog]").innerText().catch(()=>"none"));
await audit(page, "cn-remove", { full: false });
const conf = page.locator("main, [role=dialog]").getByRole("button", { name: /^Remove/ });
console.log("confirm buttons:", await conf.allInnerTexts());
await browser.close();
