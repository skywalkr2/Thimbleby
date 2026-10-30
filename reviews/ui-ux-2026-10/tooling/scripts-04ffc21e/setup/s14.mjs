import { open, audit, mainText, info, go } from "./lib.mjs";
const { browser, page } = await open();
console.log("landed:", page.url().split("#")[1]);
await page.getByRole("button", { name: "Continue setup" }).click(); await page.waitForTimeout(2000);
console.log("after continue:", page.url().split("#")[1], (await mainText(page)).slice(0,60));
await page.reload(); await page.waitForTimeout(2500);
console.log("after reload:", page.url().split("#")[1], (await page.locator("body").innerText()).slice(0,120).replace(/\n/g," | "));
await audit(page, "r1-20-mail-after-reload");
// "..." menu next to Continue setup on Today
await go(page, "#today");
await page.locator("button[aria-label]").filter({ hasText: "" }).first();
const more = page.getByRole("button", { name: /more|options|…|menu/i }).first();
console.log("menu btn:", await more.getAttribute("aria-label").catch(()=>null));
await browser.close();
