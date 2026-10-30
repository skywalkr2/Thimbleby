import { open, go, audit, mainText, info } from "../../lib.mjs";
const { browser, page } = await open({});
await go(page, "#today");
await page.keyboard.press("/"); await page.waitForTimeout(800);
await page.getByRole("link", { name: "Keep track of something of your own" }).or(page.getByRole("button", { name: "Keep track of something of your own" })).first().click(); await page.waitForTimeout(1500);
await audit(page, "ask-keeptrack", { full: false });
console.log("KEEP TRACK:", page.url().split("#")[1], (await page.locator("body").innerText()).slice(-1500));
await page.keyboard.press("Escape");
// talk to reginald on person page
await go(page, "#records/person/PER-3");
console.log("PERSON3:", (await mainText(page)).slice(0, 300));
await page.getByLabel("What do you want to know, or have done?").fill("Remind me to return Sam's ladder on Saturday morning.");
await page.getByRole("button", { name: "Send" }).click(); await page.waitForTimeout(3000);
await audit(page, "talk-sent", { full: false });
console.log("TALK:", (await mainText(page)).slice(0, 1500));
await browser.close();
