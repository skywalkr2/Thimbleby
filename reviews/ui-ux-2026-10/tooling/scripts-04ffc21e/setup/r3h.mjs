import { open, audit, mainText } from "./lib.mjs";
const { browser, page } = await open({ path: "#setup" });
await page.locator('button[data-screen="promises"]').click(); await page.waitForTimeout(2000);
console.log("== PROMISES, AI but no mail\n", await mainText(page));
await audit(page, "r3-10-promises-ai-nomail");
await page.locator('button[data-screen="people"]').click(); await page.waitForTimeout(2000);
console.log("== PEOPLE no mail\n", await mainText(page));
await audit(page, "r3-11-people-nomail");
await browser.close();
