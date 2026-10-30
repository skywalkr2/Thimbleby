import { open, audit, go, mainText } from "./lib.mjs";
import { counts } from "./lib2.mjs";
const { browser, ctx, page } = await open(); await go(page, "#work/handled");
const toast = async () => (await page.locator("[role=status],[role=alert]").allInnerTexts()).filter(Boolean).join(" / ");
console.log("BEFORE", await counts(page));
const grp = page.getByText(/Sales and promotions · 2/); if (await grp.count()) { await grp.click(); await page.waitForTimeout(600); }
await page.getByRole("button", { name: "Bring it in: Spring sale: everything half price" }).click(); await page.waitForTimeout(600);
console.log("toast:", await toast());
await audit(page, "h09-bring-in", {full:false});
await page.waitForTimeout(1500);
console.log("AFTER", await counts(page)); console.log((await mainText(page)).split("Sender")[1]?.slice(0,700));
await page.getByRole("button", { name: "More actions for Three neighbors posted today" }).click(); await page.waitForTimeout(500);
await page.getByRole("menuitem", { name: /Always set aside/ }).click(); await page.waitForTimeout(800);
console.log("toast2:", await toast());
await audit(page, "h10-always-set-aside");
console.log((await mainText(page)).split("Sender")[1]?.slice(0,900));
await browser.close();
