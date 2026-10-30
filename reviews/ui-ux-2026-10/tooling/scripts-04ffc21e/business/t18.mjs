import { open, audit, go, mainText } from "./lib.mjs";
const { browser, page } = await open(); await go(page, "#today");
const toast = async () => (await page.locator("[role=status], [role=alert]").allInnerTexts()).filter(Boolean).join(" / ");
await page.getByRole("button", { name: "Close for today" }).click(); await page.waitForTimeout(1500);
await audit(page, "t18-close-for-today");
console.log("toast:", await toast());
const t = await mainText(page); console.log("has brief?", /briefing|Morning brief/.test(t), t.match(/(Morning brief|This week's briefing)[\s\S]{0,300}/)?.[0]);
const undo = page.getByRole("button", { name: "Undo" }); console.log("undo", await undo.count());
if (await undo.count()) { await undo.first().click(); await page.waitForTimeout(1500); }
console.log("after undo has brief?", /briefing|Morning brief/.test(await mainText(page)));
await page.getByRole("button", { name: "Not this week" }).click(); await page.waitForTimeout(1500);
await audit(page, "t19-not-this-week");
console.log("toast:", await toast());
const t2 = await mainText(page); console.log("has brief?", t2.match(/(Morning brief|This week's briefing)[\s\S]{0,300}/)?.[0]);
await page.reload(); await page.waitForTimeout(2500);
const t3 = await mainText(page); console.log("after reload", t3.match(/(Morning brief|This week's briefing)[\s\S]{0,300}/)?.[0]);
await audit(page, "t20-after-not-this-week-reload");
await browser.close();
