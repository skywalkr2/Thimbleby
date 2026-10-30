import { open, go, audit, mainText, info } from "../../lib.mjs";
const { browser, page } = await open({});
await go(page, "#today");
await page.locator("[data-queue-line]").first().click(); await page.waitForTimeout(1000);
await audit(page, "h-d-start-line-open", { full: false });
console.log(await mainText(page));
await page.getByRole("button", { name: "Start", exact: true }).first().click();
for (let k = 0; k < 12; k++) { await page.waitForTimeout(5000); const t = await mainText(page); if (!/Start the assistant/.test(t) && !/working|reading/i.test(t)) break; }
await audit(page, "h-d-after-start", { full: true });
console.log("=== AFTER START\n" + await mainText(page));
await browser.close();
