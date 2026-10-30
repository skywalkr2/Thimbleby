import { open, go, audit, mainText, info } from "../../lib.mjs";
const { browser, page } = await open({});
await go(page, "#today");
await page.waitForTimeout(3000);
console.log(await mainText(page));
const show = page.getByRole("button", { name: /Show .* new/ });
if (await show.count()) { await show.first().click(); await page.waitForTimeout(1500); }
await audit(page, "h-d-today-lines", { full: true });
console.log("=== \n" + await mainText(page));
await browser.close();
