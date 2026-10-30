import { open, go, audit, mainText, info } from "../../lib.mjs";
const { browser, ctx, page } = await open({});
ctx.on("page", p => console.log("POPUP opened", p.url().slice(0,120)));
await go(page, "#setup");
await page.waitForTimeout(1000);
console.log((await mainText(page)).slice(0, 200));
const row = page.locator('[data-service="journey-mail"]');
await row.getByRole("button", { name: /Sign in to Example mail/ }).click();
for (let i = 0; i < 40; i++) {
  await page.waitForTimeout(3000);
  const rr = page.locator('[data-service="journey-mail"]');
  if (await rr.count() && await rr.getAttribute("data-signed-in") !== null) { console.log("signed in after", i*3, "s"); break; }
}
await audit(page, "m-signed-in");
console.log("AFTER:", (await mainText(page)).slice(0, 1500));
await page.getByRole("button", { name: "Continue" }).click(); await page.waitForTimeout(2000);
await audit(page, "m-promises");
console.log("NEXT:", (await mainText(page)).slice(0, 1500));
await browser.close();
