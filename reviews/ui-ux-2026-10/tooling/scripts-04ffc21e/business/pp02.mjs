import { open, audit, go, mainText } from "./lib.mjs";
const { browser, page } = await open();
await go(page, "#records/person/PER-2");
await page.getByRole("button", { name: "Edit details" }).click(); await page.waitForTimeout(1200);
const d = page.locator("[role=dialog]").last();
await audit(page, "pp02-maya-edit");
console.log((await d.innerText()).slice(0,2500));
console.log(await d.locator("input, select, textarea").evaluateAll(s=>s.map(x=>x.tagName+" "+x.type+" "+(x.labels?.[0]?.textContent||x.getAttribute('aria-label')||x.id)+" = "+(x.tagName==='SELECT'?x.options[x.selectedIndex]?.text+" ["+[...x.options].map(o=>o.text).join("/")+"]":(x.type==='checkbox'?x.checked:x.value)))));
await browser.close();
