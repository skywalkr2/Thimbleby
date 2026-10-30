import { open, audit, go, mainText } from "./lib.mjs";
const { browser, page } = await open(); await go(page, "#today");
const card = page.locator("main").locator("section,div").filter({ has: page.getByRole("heading", { name: /briefing|Morning brief/ }) }).last();
if (await page.getByRole("button", { name: "Show this week's briefing" }).count()) { await page.getByRole("button", { name: "Show this week's briefing" }).click(); await page.waitForTimeout(2500); }
console.log("CARD:", (await card.innerText()).replace(/\n+/g," | "));
if (await page.getByRole("button", { name: "Set goals" }).count()) { await page.getByRole("button", { name: "Set goals" }).click(); await page.waitForTimeout(800); }
await page.getByPlaceholder("Goal 1").fill("Finish the cafe booth seating").catch(e=>console.log("g1",e.message.slice(0,80)));
await page.getByRole("button", { name: "Confirm goals" }).click(); await page.waitForTimeout(1500);
console.log("AFTER CONFIRM 1:", (await card.innerText()).replace(/\n+/g," | "));
await audit(page, "t16-goals-confirm1");
await page.getByRole("button", { name: "Draft the message" }).click(); await page.waitForTimeout(6000);
await audit(page, "t17-draft-message");
console.log("AFTER DRAFT:", (await card.innerText()).replace(/\n+/g," | "));
await browser.close();
