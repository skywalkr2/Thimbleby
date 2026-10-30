import { open, audit, go, mainText } from "./lib.mjs";
const { browser, page } = await open(); await go(page, "#setup");
await page.getByText("What it's for", {exact:true}).first().click(); await page.waitForTimeout(1500);
await audit(page, "bz02-whatfor-revisit");
console.log((await mainText(page)).slice(0,2500));
console.log(await page.locator("main input, main textarea").evaluateAll(s=>s.map(x=>x.id+" "+x.type+" = "+(x.type==='checkbox'?x.checked:x.value))));
await browser.close();
