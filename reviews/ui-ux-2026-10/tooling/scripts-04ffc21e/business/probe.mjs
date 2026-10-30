import { open, audit, go, mainText, info } from "./lib.mjs";
const { browser, page } = await open();
if (process.argv[2]) await go(page, process.argv[2]);
if (process.argv[3]) await audit(page, process.argv[3]);
console.log(page.url());
console.log(await mainText(page));
console.log(await page.locator("[data-service]").evaluateAll(e=>e.map(x=>x.outerHTML.slice(0,300))));
await browser.close();
