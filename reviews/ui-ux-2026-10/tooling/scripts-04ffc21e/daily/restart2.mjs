import { open, go, audit, mainText, info } from "../../lib.mjs";
const { browser, page } = await open({});
await go(page, "#today");
await page.getByRole("button", { name: /App status/ }).click(); await page.waitForTimeout(800);
await page.getByRole("button", { name: "Restart now" }).click();
for (let i = 0; i < 8; i++) { await page.waitForTimeout(2500); await audit(page, `rs-restart-${i}`, { full: false }); const t = (await page.locator("body").innerText()).slice(0, 400).replace(/\n+/g," | "); console.log(i, t); if (/Connected/.test(t) && i > 1) break; }
await browser.close();
