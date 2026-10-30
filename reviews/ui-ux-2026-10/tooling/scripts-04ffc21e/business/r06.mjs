import { open, audit, go, mainText } from "./lib.mjs";
const { browser, page } = await open(); await go(page, "#work/changed");
await page.locator("main li[data-row]", { hasText: "Your pasted notes" }).first().locator("button").first().click(); await page.waitForTimeout(1500);
await audit(page, "r06-pasted-detail");
const t = await mainText(page); const i = t.lastIndexOf("Your pasted notes"); console.log(t.slice(i, i+1000));
const links = page.locator("main a, main button").filter({ hasText: /Priya|note|Note/ });
console.log(await links.allInnerTexts());
const n = page.locator("main aside a, main [data-detail] a, main a[href*='note']").first();
const cand = page.locator("main a[href*='#records/note'], main a[href*='/note/']");
console.log("note links", await cand.count());
if (await cand.count()) { await cand.first().click(); await page.waitForTimeout(2000); console.log("URL", page.url()); await audit(page, "r07-note-page"); console.log((await mainText(page)).slice(0,2000)); const m = page.locator("main button[aria-label^='More actions']"); if (await m.count()) { await m.first().click(); await page.waitForTimeout(400); console.log("MENU", await page.locator("[role=menu] [role=menuitem]").allInnerTexts()); } }
await browser.close();
