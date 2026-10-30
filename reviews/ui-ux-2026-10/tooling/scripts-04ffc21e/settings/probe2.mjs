import { open, audit, go, mainText, info } from "./lib.mjs";
const { browser, ctx, page } = await open();
await go(page, "#" + process.env.H);
console.log((await mainText(page)).slice(0, 2500));
console.log(await page.locator("main button").evaluateAll(b => b.map(x => `"${x.textContent.trim()}" aria=${x.getAttribute("aria-label")}`)));
await audit(page, "probe-" + process.env.H.replace(/\W/g, "-"));
await browser.close();
