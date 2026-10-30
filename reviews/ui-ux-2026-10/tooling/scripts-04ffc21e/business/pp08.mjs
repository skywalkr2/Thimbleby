import { open, audit, go, mainText } from "./lib.mjs";
const { browser, page } = await open();
await go(page, "#records/people");
await page.getByRole("button", { name: "More actions for Jun Park" }).click(); await page.waitForTimeout(400);
await page.getByRole("menuitem", { name: "Remove" }).click(); await page.waitForTimeout(1500);
await audit(page, "pp08-remove-person", {full:false});
console.log((await mainText(page)).includes("Jun Park") ? "still listed" : "gone");
const u = page.getByRole("button", { name: "Undo" }); console.log("undo", await u.count());
if (await u.count()) { await u.first().click(); await page.waitForTimeout(1500); console.log((await mainText(page)).includes("Jun Park") ? "back after undo" : "not back"); }
await page.getByRole("button", { name: "More actions for Owen Marsh" }).click(); await page.waitForTimeout(400);
await page.getByRole("menuitem", { name: "Mark as left" }).click(); await page.waitForTimeout(1500);
await audit(page, "pp09-mark-left", {full:false});
console.log("LEFT:", (await mainText(page)).match(/Owen Marsh[^\n]*\n?[^\n]*/)?.[0]);
const u2 = page.getByRole("button", { name: "Undo" }); if (await u2.count()) { await u2.first().click(); await page.waitForTimeout(1000); }
await browser.close();
