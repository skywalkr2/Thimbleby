import { open, go, audit, mainText, info } from "../../lib.mjs";
const { browser, ctx, page } = await open({});
await go(page, "#settings/addons");
await audit(page, "m-addons", { full: false });
console.log("ADDONS:", (await mainText(page)).slice(0, 1500));
await go(page, "#setup");
const r = page.getByRole("row").filter({ hasText: "Mail and calendar" }).getByRole("button", { name: "Set up" });
if (await r.count()) await r.click(); else await page.getByRole("button", { name: "Set up" }).first().click();
await page.waitForTimeout(1500);
const row = page.locator('[data-service="journey-mail"]');
console.log("row count", await row.count());
await row.getByRole("button", { name: /^Connect/ }).click();
for (let i = 0; i < 60; i++) {
  await page.waitForTimeout(3000);
  const rr = page.locator('[data-service="journey-mail"]');
  if (await rr.count() && await rr.getAttribute("data-signed-in") !== null) { console.log("signed in after", i*3, "s"); break; }
  if (i % 5 === 0) { console.log(i, (await page.locator("body").innerText().catch(()=>"")).slice(0, 400).replace(/\n+/g, " | ")); await audit(page, `m-wait-${i}`, { full: false }).catch(()=>{}); }
}
await audit(page, "m-connected");
console.log("AFTER:", (await mainText(page)).slice(0, 2500));
await browser.close();
