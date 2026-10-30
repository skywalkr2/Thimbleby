import { open, audit, go, mainText } from "./lib.mjs";
const { browser, page } = await open(); await go(page, "#work/open");
await page.getByRole("button", { name: "More actions for Get a catering quote." }).click(); await page.waitForTimeout(400);
await page.getByRole("menuitem", { name: "Reassign…" }).click(); await page.waitForTimeout(1000);
await page.locator("main select").nth(1).selectOption({label:"Theo Brandt"}); await page.waitForTimeout(800);
await audit(page, "o04-reassign-picked", {full:false});
console.log(await page.locator("main").innerText().then(t=>{const i=t.indexOf("Get a catering");return t.slice(i,i+400)}));
const btns = await page.locator("main button").allInnerTexts(); console.log(btns.filter(b=>/Reassign|Save|Apply|Cancel/.test(b)));
const sv = page.locator("main button").filter({hasText:/^(Reassign|Save|Apply)$/});
if (await sv.count()) { await sv.first().click(); await page.waitForTimeout(1500); }
await audit(page, "o05-reassigned", {full:false});
console.log(await page.locator("main").innerText().then(t=>{const i=t.indexOf("Get a catering");return t.slice(i,i+300)}));
// Edit…
await page.getByRole("button", { name: "More actions for Send the headcount by 2026-11-04." }).click(); await page.waitForTimeout(400);
await page.getByRole("menuitem", { name: "Edit…" }).click(); await page.waitForTimeout(1200);
await audit(page, "o06-edit");
console.log("EDIT:", await page.locator("main").innerText().then(t=>{const i=t.indexOf("Send the headcount");return t.slice(i,i+900)}));
console.log(await page.locator("main select").evaluateAll(s=>s.map(x=>x.getAttribute('aria-label')+"|"+x.id+": "+[...x.options].map(o=>o.text).join(" / "))));
console.log(await page.locator("main input, main textarea").evaluateAll(s=>s.map(x=>x.type+" "+x.id+" = "+x.value)));
await browser.close();
