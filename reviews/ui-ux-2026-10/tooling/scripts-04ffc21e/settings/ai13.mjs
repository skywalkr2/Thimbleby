import { open, audit, go, mainText, info } from "./lib.mjs";
const { browser, ctx, page } = await open();
await go(page, "#settings/ai");
await page.getByRole("button", { name: /^Test Another/ }).click(); await page.waitForTimeout(5000);
await go(page, "#today");
console.log("today head:", (await mainText(page)).slice(0, 300).replace(/\n/g, " / "));
await page.locator("header").getByText("Connected").click(); await page.waitForTimeout(800);
console.log("POP:", (await page.locator("[role=dialog]").innerText().catch(()=>"")).replace(/\n+/g, " / "));
await page.keyboard.press("Escape");
// user menu theme switch instant?
await page.locator("header button").last().click(); await page.waitForTimeout(500);
await page.getByRole("menuitemradio", { name: "Light" }).or(page.getByRole("menuitem", { name: "Light" })).first().click(); await page.waitForTimeout(800);
console.log("bg after menu light:", await page.evaluate(() => getComputedStyle(document.body).backgroundColor));
await go(page, "#settings/appearance");
console.log("settings shows theme:", await page.locator("[id='setting-ui.theme']").inputValue());
await audit(page, "ap-after-menu-light", { full: false });
await browser.close();
