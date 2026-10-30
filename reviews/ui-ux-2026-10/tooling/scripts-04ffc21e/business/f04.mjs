import { open, audit, go, mainText } from "./lib.mjs";
const { browser, ctx, page } = await open(); 
await go(page, "#work/followups");
await page.getByText("Theo Brandt", { exact: true }).first().click(); await page.waitForTimeout(1200);
await page.getByRole("button", { name: "More actions for Theo Brandt" }).click(); await page.waitForTimeout(500);
console.log("MENU:", await page.locator("[role=menu] [role=menuitem]").allInnerTexts());
await page.keyboard.press("Escape");
await page.getByRole("radio", { name: "Table" }).or(page.getByRole("button", { name: "Table", exact: true })).first().click(); await page.waitForTimeout(800);
await audit(page, "f04-table");
await page.getByRole("radio", { name: "By project" }).or(page.getByRole("button", { name: "By project", exact: true })).first().click(); await page.waitForTimeout(1200);
await audit(page, "f05-by-project");
console.log("BYPROJECT:", (await mainText(page)).slice(0,900));
await page.locator("main").getByText("By person",{exact:true}).click(); await page.waitForTimeout(800);
for (const tab of ["Later","Waiting on them"]) { await page.locator("main").getByText(tab,{exact:true}).first().click(); await page.waitForTimeout(1000); await audit(page, `f06-tab-${tab.split(" ")[0]}`); console.log(`TAB ${tab}:`, (await mainText(page)).split("Waiting on them")[1]?.slice(0,500)); }
await page.locator("main").getByText("How your messages start and end").click(); await page.waitForTimeout(800);
await audit(page, "f07-message-style");
console.log("STYLE:", (await mainText(page)).split("How your messages start and end")[1]?.slice(0,900));
await browser.close();
