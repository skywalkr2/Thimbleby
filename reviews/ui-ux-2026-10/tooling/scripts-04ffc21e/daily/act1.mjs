import { open, go, audit, mainText, info } from "../../lib.mjs";
const { browser, ctx, page } = await open({});
await ctx.grantPermissions(["clipboard-read", "clipboard-write"]);
await go(page, "#today");
const S = async (name) => { await page.waitForTimeout(1200); await audit(page, name, { full: false }); };
// Read the answer
await page.getByRole("button", { name: "Read", exact: true }).click(); await S("a-read-answer");
console.log("AFTER READ:", (await page.locator("body").innerText()).slice(0, 2500));
await page.keyboard.press("Escape"); await page.waitForTimeout(500);
await go(page, "#today");
// Morning brief
await page.getByRole("button", { name: "Show this week's briefing" }).click(); await S("a-brief-show");
console.log("BRIEF:", (await page.locator("[role=dialog]").allInnerTexts()).join("\n").slice(0, 2000) || (await mainText(page)).slice(0, 1500));
await page.keyboard.press("Escape"); await go(page, "#today");
await page.getByRole("button", { name: "Show", exact: true }).click(); await S("a-brief-show-ontoday");
console.log("SHOW:", (await mainText(page)).slice(0, 800));
await go(page, "#today");
await page.getByRole("button", { name: "Remind me" }).first().click(); await S("a-remind-me");
console.log("REMIND:", (await page.locator("body").innerText()).slice(-800));
await browser.close();
