import { open, audit, go, mainText } from "./lib.mjs";
const { browser, page } = await open(); await go(page, process.argv[2]);
const sel = process.argv[3] || "body"; const n = +process.argv[4]||4000;
console.log((await page.locator(sel).first().evaluate((e)=>e.outerHTML)).replace(/class="[^"]*"/g,"").replace(/<svg.*?<\/svg>/g,"").slice(0,n));
await browser.close();
