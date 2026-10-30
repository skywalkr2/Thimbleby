import { open, audit, go, mainText } from "./lib.mjs";
import { counts } from "./lib2.mjs";
const { browser, ctx, page } = await open(); await go(page, "#work/handled");
const toast = async () => (await page.locator("[role=status],[role=alert]").allInnerTexts()).filter(Boolean).join(" / ");
await page.getByLabel("Search by sender, subject, kind or reason").fill(""); 
await page.getByRole("radio", { name: /Read, nothing to do/ }).first().click(); await page.waitForTimeout(1000);
console.log("READ TAB empty search:", (await mainText(page)).split("Sender")[1]?.slice(0,600));
await audit(page, "h06-read-tab-clear");
await page.getByRole("radio", { name: /Set aside before reading/ }).first().click(); await page.waitForTimeout(1000);
await page.getByRole("radio", { name: "Kind" }).first().click().catch(()=>{});
const grp = page.getByText(/Sales and promotions · 2/); if (await grp.count()) { await grp.click(); await page.waitForTimeout(600); }
await page.getByRole("button", { name: "More actions for Three neighbors posted today" }).click(); await page.waitForTimeout(500);
console.log("MENU:", await page.locator("[role=menu] [role=menuitem]").allInnerTexts());
await audit(page, "h07-handled-menu", {full:false});
const popupP = ctx.waitForEvent("page", {timeout: 5000}).catch(()=>null);
await page.getByRole("menuitem", { name: /Open the message/ }).click().catch(e=>console.log("no open msg"));
const pop = await popupP; await page.waitForTimeout(1500);
console.log("after open msg url", page.url(), pop ? "popup:"+pop.url() : "no popup");
if (!pop) { await audit(page, "h08-open-message"); console.log((await mainText(page)).slice(0,1000)); }
await browser.close();
