import { open, audit, go, mainText } from "./lib.mjs";
import { counts } from "./lib2.mjs";
const { browser, page } = await open(); await go(page, "#today");
await page.getByRole("button", { name: "Hand something in" }).click(); await page.waitForTimeout(1200);
await audit(page, "hi01-hand-in", {full:false});
const d = page.locator("[role=dialog]").last();
console.log((await d.innerText().catch(()=>"none")).slice(0,1200));
console.log(await page.locator("[role=dialog] input, [role=dialog] select, [role=dialog] textarea").evaluateAll(s=>s.map(x=>x.tagName+" "+(x.labels?.[0]?.textContent||x.getAttribute('aria-label')||x.id)+" = "+(x.tagName==='SELECT'?x.options[x.selectedIndex]?.text+" ["+[...x.options].map(o=>o.text).join("/")+"]":x.value))));
await browser.close();
