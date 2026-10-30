import { open, go, audit, mainText, info } from "../../lib.mjs";
const { browser, page } = await open({path: process.argv[3] || ""});
if (process.argv[4]) await go(page, process.argv[4]);
await audit(page, process.argv[2] || "peek");
console.log(await page.locator("body").innerText());
await browser.close();
