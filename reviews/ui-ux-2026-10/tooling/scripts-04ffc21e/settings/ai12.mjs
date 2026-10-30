import { open, audit, go, mainText, info } from "./lib.mjs";
const { browser, ctx, page } = await open();
page.on("response", async r => { if (r.request().method() !== "GET") console.log("RESP", r.request().method(), r.url().replace(/token=[^&]+/, ""), r.status(), (await r.text().catch(()=>"")).slice(0, 400)); });
await go(page, "#settings/ai-compare");
await page.getByRole("button", { name: /Measure/ }).click(); await page.waitForTimeout(2500);
await page.getByRole("button", { name: "Test anyway" }).click(); await page.waitForTimeout(6000);
await browser.close();
