import { open, audit, go, mainText, info } from "./lib.mjs";
const toast = async (page) => (await page.locator("body").innerText()).match(/(Saved[^\n]*|Removed[^\n]*|Turned[^\n]*|Read[^\n]*now[^\n]*)\n/g);
const { browser, ctx, page } = await open();
await go(page, "#settings/connections");
const menus = page.locator("main button[aria-haspopup]");
// restore privacy
await menus.nth(1).click(); await page.waitForTimeout(500);
await page.getByRole("menuitem", { name: "Change" }).click(); await page.waitForTimeout(1200);
const opts = await page.locator("main select").evaluateAll(s => s.map(x => [...x.options].map(o => o.text)));
await page.locator("main select").nth(opts.findIndex(o => o.some(t => /Like what/.test(t)))).selectOption({ index: 0 });
await page.getByRole("button", { name: "Save changes" }).click(); await page.waitForTimeout(2000);
// remove last dup
let n = await menus.count(); await menus.nth(n - 1).click(); await page.waitForTimeout(500);
await page.getByRole("menuitem", { name: "Remove" }).click(); await page.waitForTimeout(1500);
// read now on calendar
await menus.nth(2).click(); await page.waitForTimeout(500);
await page.getByRole("menuitem", { name: "Read now" }).click(); await page.waitForTimeout(4000);
console.log("cal after read now:", (await mainText(page)).split("Your calendar")[1]?.split("Your sent mail")[0].replace(/\n+/g, " / "));
await menus.nth(2).click(); await page.waitForTimeout(500);
await page.getByRole("menuitem", { name: "Look at the last day" }).click(); await page.waitForTimeout(3000);
console.log("after last day: url", page.url().split("#")[1], (await mainText(page)).slice(0, 400).replace(/\n+/g, " / "));
await audit(page, "cn-last-day", { full: false });
await go(page, "#settings/connections");
await menus.nth(3).click(); await page.waitForTimeout(500);
await page.getByRole("menuitem", { name: "Turn off" }).click(); await page.waitForTimeout(2000);
console.log("sent after off:", (await mainText(page)).split("Your sent mail")[1]?.slice(0, 300).replace(/\n+/g, " / "));
await audit(page, "cn-turned-off", { full: false });
await menus.nth(3).click(); await page.waitForTimeout(500);
console.log("sent menu now:", await page.locator("[role=menu]").innerText());
await page.getByRole("menuitem", { name: /Turn on/ }).click().catch(()=>console.log("no turn on")); await page.waitForTimeout(2000);
console.log("sent after on:", (await mainText(page)).split("Your sent mail")[1]?.slice(0, 300).replace(/\n+/g, " / "));
await browser.close();
