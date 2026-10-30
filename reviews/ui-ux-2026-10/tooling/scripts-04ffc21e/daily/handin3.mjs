import { open, go, audit, mainText, info } from "../../lib.mjs";
const { browser, page } = await open({});
await go(page, "#today");
await page.getByRole("button", { name: /Hand something in/ }).first().click(); await page.waitForTimeout(800);
const d = page.locator("[role=dialog]");
await d.getByLabel("Paste or type it here").fill("From: Priya Hart\nSubject: Mum's 70th plan\n\nHi Jordan,\nPlease book a table for 8 at Willow Hall by Friday November 6.\nThe dinner is on Saturday November 14.\nShould we keep it a surprise?\nSomeone has to find out if Uncle Ravi is coming.\nLove, Priya");
await d.getByRole("button", { name: "Hand in" }).click(); await page.waitForTimeout(3000);
for (let k = 0; k < 10; k++) { await page.waitForTimeout(4000); const t = await mainText(page); if (/Start the assistant/.test(t)) { await page.getByRole("button", { name: "Start", exact: true }).first().click(); console.log("pressed Start"); } else break; }
await page.waitForTimeout(8000);
await page.reload(); await page.waitForTimeout(2500);
const show = page.getByRole("button", { name: /Show .* new/ }); if (await show.count()) { await show.first().click(); await page.waitForTimeout(1500); }
await audit(page, "h3-today", { full: true });
console.log(await mainText(page));
await browser.close();
