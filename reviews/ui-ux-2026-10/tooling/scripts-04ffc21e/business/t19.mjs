import { open, audit, go, mainText } from "./lib.mjs";
const { browser, page } = await open(); await go(page, "#today"); await page.waitForTimeout(3000);
const toast = async () => (await page.locator("[role=status], [role=alert]").allInnerTexts()).filter(Boolean).join(" / ");
console.log("brief:", (await mainText(page)).match(/(Morning brief|This week's briefing)[\s\S]{0,300}/)?.[0]);
await page.getByRole("button", { name: "Not this week" }).click(); await page.waitForTimeout(400); console.log("toast-early:", await toast()); await page.waitForTimeout(1500);
await audit(page, "t19-not-this-week", {full:false});
console.log("toast:", await toast());
console.log("brief:", (await mainText(page)).match(/(Morning brief|This week's briefing)[\s\S]{0,300}/)?.[0]);
const undo = page.getByRole("button", { name: "Undo" }); console.log("undo", await undo.count());
if (await undo.count()) { await undo.first().click(); await page.waitForTimeout(1500); console.log("after undo:", (await mainText(page)).match(/(Morning brief|This week's briefing)[\s\S]{0,300}/)?.[0]); }
await browser.close();
