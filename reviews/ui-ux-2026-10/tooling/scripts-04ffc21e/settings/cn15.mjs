import { open, audit, go, mainText, info } from "./lib.mjs";
const { browser, ctx, page } = await open();
await go(page, "#settings/connections");
await page.getByRole("button", { name: "Sign out" }).click(); await page.waitForTimeout(1500);
console.log("dialog:", await page.locator("[role=dialog],[role=alertdialog]").innerText().catch(()=>"none"));
console.log("after click:", (await mainText(page)).split("Accounts")[1]?.split("Your inbox")[0].replace(/\n+/g, " / "));
await audit(page, "cn-signout-ask", { full: false });
const conf = page.getByRole("button", { name: /^Sign out/ });
console.log("signout btns:", await conf.allInnerTexts());
if (await conf.count() > 1) { await conf.last().click(); } 
await page.waitForTimeout(3000);
console.log("after confirm:", (await mainText(page)).split("Accounts")[1]?.replace(/\n+/g, " / ").slice(0, 1500));
await audit(page, "cn-signed-out");
console.log("hdr:", (await page.locator("header").innerText()).replace(/\n/g, " / "));
const signin = page.getByRole("button", { name: /^Sign in/ });
console.log("sign in btns:", await signin.allInnerTexts());
if (await signin.count()) { await signin.first().click(); await page.waitForTimeout(10000); }
console.log("after sign in:", (await mainText(page)).split("Accounts")[1]?.split("Your inbox")[0].replace(/\n+/g, " / "));
await browser.close();
