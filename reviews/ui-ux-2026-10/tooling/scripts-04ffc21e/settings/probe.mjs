import { open, audit, go, mainText, info } from "./lib.mjs";
const { browser, ctx, page } = await open({path: process.argv[2] || ""});
console.log(await page.evaluate(() => [...document.querySelectorAll("[data-service]")].map(e => e.outerHTML.slice(0, 300))));
console.log(await page.locator("main button").evaluateAll(els => els.map(e => e.textContent.trim())));
await browser.close();
