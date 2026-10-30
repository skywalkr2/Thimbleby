import { open, audit, go, mainText, info } from "./lib.mjs";
const { browser, ctx, page } = await open();
await go(page, "#" + (process.env.H || "settings/you"));
await page.locator("header").getByText("Restart to finish").click(); await page.waitForTimeout(600);
await page.getByRole("button", { name: "Restart now" }).first().click();
for (let i=0;i<30;i++){ await page.waitForTimeout(2000); const t = await page.locator("header").innerText(); if (!/Restart to finish|Restarting/.test(t)) break; }
await page.keyboard.press("Escape"); await page.waitForTimeout(3000);
console.log("hdr:", (await page.locator("header").innerText()).replace(/\n/g," / "));
console.log((await mainText(page)).split("Backups\n").slice(-1)[0].replace(/\n+/g," / ").slice(0, 1500));
await audit(page, "after-restart-" + (process.env.H || "you").replace(/\W/g, "-"));
await browser.close();
