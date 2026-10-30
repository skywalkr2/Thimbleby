import { open, audit, go, mainText } from "./lib.mjs";
const { browser, page } = await open(); await go(page, "#records/action/ACT-1");
const sel = page.locator("main select").first();
console.log(await sel.evaluate(s=>[...s.options].map(o=>o.text)));
await sel.selectOption({label:"Calloway Upholstery"}); await page.waitForTimeout(1200);
await audit(page, "r10-todo-move", {full:false});
console.log((await mainText(page)).slice(0,700));
await browser.close();
