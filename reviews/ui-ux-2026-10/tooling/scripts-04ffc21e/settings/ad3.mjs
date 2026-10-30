import { open, audit, go, mainText, info } from "./lib.mjs";
const { browser, ctx, page } = await open();
await go(page, "#settings/addons");
await page.getByRole("tab", { name: "Installed" }).click(); await page.waitForTimeout(1000);
await page.getByRole("button", { name: "Restart now" }).first().click();
for (let i=0;i<30;i++){ await page.waitForTimeout(2000); const t = await page.locator("header").innerText(); if (!/Restart to finish|Restarting/.test(t)) break; }
await page.waitForTimeout(3000);
await page.reload(); await page.waitForTimeout(3000);
await page.getByRole("tab", { name: "Installed" }).click(); await page.waitForTimeout(1000);
console.log("installed after restart:", (await mainText(page)).split("Installed\n")[1]?.slice(0, 500));
console.log("btns:", await page.locator("main button").evaluateAll(b => b.map(x => x.textContent.trim()).filter(Boolean)));
await audit(page, "ad-off-restarted", { full: false });
console.log("settings nav:", (await page.locator("main nav").innerText()).replace(/\n/g, " / "));
await go(page, "#settings/connections"); console.log("conn:", (await mainText(page)).split("Accounts")[1]?.replace(/\n+/g, " / ").slice(0, 900));
await audit(page, "ad-off-conn2");
await go(page, "#today"); console.log("today:", (await mainText(page)).slice(0, 500).replace(/\n+/g, " / "));
await browser.close();
