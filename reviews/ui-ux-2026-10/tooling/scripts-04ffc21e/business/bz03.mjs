import { open, audit, go, mainText } from "./lib.mjs";
const { browser, page } = await open(); await go(page, "#setup");
await page.getByText("What it's for", {exact:true}).first().click(); await page.waitForTimeout(1500);
await page.getByRole("button", { name: "Add another business" }).click(); await page.waitForTimeout(1000);
await audit(page, "bz03-add-another");
console.log(await page.locator("main input, main textarea").evaluateAll(s=>s.map(x=>x.id+" "+x.type+" = "+(x.type==='checkbox'?x.checked:x.value))));
const t = await mainText(page); console.log(t.slice(t.indexOf("Add more projects"), t.indexOf("Add more projects")+1200));
await browser.close();
