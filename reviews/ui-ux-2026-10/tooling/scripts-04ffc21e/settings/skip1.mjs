import { open, audit, go, mainText } from "./lib.mjs";
const { browser, page } = await open();
await audit(page, "skip-00-welcome");
console.log(await page.locator("body").innerText());
console.log(await page.locator("button, a").evaluateAll(els => els.map(e => e.textContent.trim()).filter(Boolean)));
await browser.close();
