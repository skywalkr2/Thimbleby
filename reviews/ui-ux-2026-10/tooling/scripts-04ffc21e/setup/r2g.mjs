import { open, audit, mainText } from "./lib.mjs";
const { browser, page } = await open({ path: "#setup" });
const boxes = page.locator("main fieldset").first().locator("input[type=checkbox]");
const st = async () => { const r = []; for (let i = 0; i < await boxes.count(); i++) r.push(await boxes.nth(i).isChecked()); return r.join(","); };
console.log("start (first fieldset):", await st());
for (let i = 0; i < 3; i++) { if (await boxes.nth(i).isChecked()) { await boxes.nth(i).click(); await page.waitForTimeout(1500); } }
await page.waitForTimeout(2000); await page.reload(); await page.waitForTimeout(2500);
console.log("after slow untick + reload:", await st());
// quick sequence: tick 0, tick 2, tick 1, untick 1
await boxes.nth(0).click(); await boxes.nth(2).click(); await boxes.nth(1).click(); await boxes.nth(1).click();
await page.waitForTimeout(300); console.log("screen right after:", await st());
await page.waitForTimeout(3000); console.log("screen after 3s:", await st());
await page.reload(); await page.waitForTimeout(2500);
console.log("after reload:", await st());
const t = await mainText(page); console.log(t.slice(t.indexOf("Your inbox is for"), t.indexOf("Your inbox is for")+100));
await browser.close();
