import { open, audit, mainText } from "./lib.mjs";
const { browser, page } = await open({ path: "#setup" });
await page.waitForTimeout(60000); await page.reload(); await page.waitForTimeout(2500);
const t = await mainText(page); console.log(t.slice(t.indexOf("Set aside")));
await audit(page, "r1-24-mail-nonsense-after-1min");
await browser.close();
