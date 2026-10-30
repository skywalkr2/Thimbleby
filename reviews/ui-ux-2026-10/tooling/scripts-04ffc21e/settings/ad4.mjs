import { open, audit, go, mainText, info } from "./lib.mjs";
const { browser, ctx, page } = await open();
await go(page, "#settings/addons");
await page.getByRole("tab", { name: "Installed" }).click(); await page.waitForTimeout(1000);
await page.getByRole("button", { name: /^Turn on/ }).click(); await page.waitForTimeout(3000);
console.log("after on:", (await mainText(page)).split("Installed\n")[1]?.slice(0, 300));
const r = page.getByRole("button", { name: "Restart now" });
if (await r.count()) { await r.first().click(); for (let i=0;i<30;i++){ await page.waitForTimeout(2000); const t = await page.locator("header").innerText(); if (!/Restart to finish|Restarting/.test(t)) break; } }
await page.waitForTimeout(4000); await page.reload(); await page.waitForTimeout(3000);
await go(page, "#settings/connections"); console.log("conn:", (await mainText(page)).split("Accounts")[1]?.replace(/\n+/g, " / ").slice(0, 500));
// For developers / catalogs: available tab
await go(page, "#settings/addons");
await page.getByRole("button", { name: "Refresh" }).click(); await page.waitForTimeout(3000);
console.log("after refresh:", (await mainText(page)).split("Catalog")[1]?.slice(0, 300));
await page.getByRole("button", { name: "Add another catalog" }).click(); await page.waitForTimeout(1000);
console.log("add catalog ui:", (await mainText(page)).split("Catalog")[1]?.slice(0, 600));
await audit(page, "ad-add-catalog");
await browser.close();
