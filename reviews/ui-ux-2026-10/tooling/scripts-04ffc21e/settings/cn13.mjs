import { open, audit, go, mainText, info } from "./lib.mjs";
const { browser, ctx, page } = await open();
await go(page, "#settings/connections");
const menus = page.locator("main button[aria-haspopup]");
for (const label of ["Your mailbox (address and app password)", "A calendar (its private link)"]) {
  await page.locator(`main button[aria-label="More actions for ${label}"]`).click(); await page.waitForTimeout(500);
  await page.getByRole("menuitem", { name: "Remove" }).click(); await page.waitForTimeout(1500);
}
console.log("rows now:", await menus.evaluateAll(b => b.map(x => x.getAttribute("aria-label"))));
// Add another account
await page.getByRole("button", { name: "Add another account" }).click(); await page.waitForTimeout(3000);
console.log("pages:", ctx.pages().map(p => p.url().slice(0, 80)));
console.log("after add another:", (await mainText(page)).split("Accounts")[1]?.split("Your inbox")[0].replace(/\n+/g, " / "));
console.log("dialog:", await page.locator("[role=dialog]").innerText().catch(()=>"none"));
await audit(page, "cn-add-account", { full: false });
await browser.close();
