import { open, audit, go, mainText } from "./lib.mjs";
import { counts, lines } from "./lib2.mjs";
const { browser, page } = await open(); await go(page, "#today"); await page.waitForTimeout(2500);
console.log("NOW", await counts(page)); console.log((await lines(page)).join("\n"));
await audit(page, "t32-after-undo-reload", {full:false});
await browser.close();
