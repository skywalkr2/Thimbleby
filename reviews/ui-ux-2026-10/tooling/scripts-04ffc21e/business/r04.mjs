import { open, audit, go, mainText } from "./lib.mjs";
const { browser, page } = await open();
await go(page, "#today");
await page.getByText("Ask Reginald or search…").click(); await page.waitForTimeout(500);
await page.keyboard.type("Venue list"); await page.waitForTimeout(2000);
await audit(page, "r04-search", {full:false});
const opts = await page.locator("[role=option], [role=listbox] li, [role=dialog] li").allInnerTexts(); console.log("OPTIONS:", opts.map(o=>o.replace(/\n+/g," | ")));
const note = page.locator("[role=option]").filter({ hasText: /Note|note/ }).first();
if (await note.count()) { await note.click(); await page.waitForTimeout(2000); console.log("URL", page.url()); await audit(page, "r05-note-page"); console.log((await mainText(page)).slice(0,2000)); console.log("BUTTONS:", await page.locator("main button, main a").evaluateAll(e=>e.map(x=>(x.getAttribute('aria-label')||x.textContent).trim()).filter(Boolean).join(" | "))); }
await browser.close();
