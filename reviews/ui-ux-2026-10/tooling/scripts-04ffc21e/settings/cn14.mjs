import { open, audit, go, mainText, info } from "./lib.mjs";
const { browser, ctx, page } = await open();
await go(page, "#settings/connections");
page.on("response", async r => { if (r.request().method() !== "GET") console.log("RESP", r.request().method(), r.url().replace(/token=[^&]+/, "").slice(0, 120), r.status(), (await r.text().catch(()=>"")).slice(0, 300)); });
ctx.on("page", p => console.log("POPUP", p.url()));
await page.getByRole("button", { name: "Add another account" }).click(); await page.waitForTimeout(8000);
console.log("pages:", ctx.pages().map(p => p.url().slice(0, 100)));
console.log((await mainText(page)).split("Accounts")[1]?.split("Your inbox")[0].replace(/\n+/g, " / "));
await browser.close();
