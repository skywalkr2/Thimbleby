import { open, audit, go, mainText, info } from "./lib.mjs";
const { browser, ctx, page } = await open();
await go(page, "#settings/connections");
ctx.on("page", p => { console.log("POPUP", p.url()); p.on("framenavigated", f => console.log("  nav", f.url().slice(0, 100))); });
console.log("state:", (await mainText(page)).split("Accounts")[1]?.split("Your inbox")[0].replace(/\n+/g, " / "));
await page.getByRole("button", { name: /^Sign in/ }).first().click();
for (let i = 0; i < 20; i++) { await page.waitForTimeout(3000); const t = await mainText(page); if (/Signed in as/.test(t)) { console.log("signed in after", i*3); break; } }
console.log("after:", (await mainText(page)).split("Accounts")[1]?.split("Your inbox")[0].replace(/\n+/g, " / "));
await audit(page, "cn-signin-again", { full: false });
await browser.close();
