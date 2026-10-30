import { open, audit, go, mainText } from "./lib.mjs";
const { browser, page } = await open(); await go(page, "#work/open");
await page.getByRole("button", { name: "More actions for Get a catering quote." }).click(); await page.waitForTimeout(400);
await page.getByRole("menuitem", { name: "Reassign…" }).click(); await page.waitForTimeout(1200);
await audit(page, "o03-reassign");
const dlg = page.locator("[role=dialog]");
console.log("dialog?", await dlg.count(), (await dlg.first().innerText().catch(()=>"(none)")).slice(0,800));
console.log(await page.locator("[role=dialog] select, main select").evaluateAll(s=>s.map(x=>x.id+": "+[...x.options].map(o=>o.text).join(" / "))));
await browser.close();
