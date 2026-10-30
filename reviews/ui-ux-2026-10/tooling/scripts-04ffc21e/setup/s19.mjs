import { open, audit, mainText } from "./lib.mjs";
const { browser, ctx, page } = await open({ path: "#setup" });
const row = page.locator('[data-service="journey-mail"]');
ctx.on("page", async p => { console.log("popup:", p.url().slice(0,80)); await p.waitForTimeout(1500).catch(()=>{}); await p.screenshot({ path: process.env.OUT + "/r1-27-mail-popup.png" }).catch(()=>{}); });
await row.getByRole("button", { name: /^Sign in/ }).click();
for (let i = 0; i < 40; i++) { if (await row.getAttribute("data-signed-in").catch(()=>null) !== null) break; await page.waitForTimeout(3000); }
console.log("signed-in attr:", await row.getAttribute("data-signed-in").catch(()=>null));
await page.waitForTimeout(2000);
const t = await mainText(page); console.log(t.slice(t.indexOf("Services you can connect")));
await audit(page, "r1-28-mail-signed-in");
await browser.close();
