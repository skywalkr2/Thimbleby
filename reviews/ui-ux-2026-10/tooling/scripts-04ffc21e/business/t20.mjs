import { open, audit, go, mainText } from "./lib.mjs";
const { browser, page } = await open(); await go(page, "#today"); await page.waitForTimeout(2500);
await page.locator("[data-section] button").first().click(); await page.waitForTimeout(1500);
console.log(page.url());
console.log("focused:", await page.evaluate(()=>document.activeElement?.textContent?.slice(0,120)));
await audit(page, "t21-brief-show-clash", {full:false});
await browser.close();
