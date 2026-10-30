import { open, go, audit, mainText, info } from "../../lib.mjs";
const { browser, ctx, page } = await open({});
await go(page, "#today");
await page.getByRole("button", { name: "Connect a mailbox" }).click(); await page.waitForTimeout(2000);
await audit(page, "m-connect-from-today", { full: false });
console.log("URL", page.url().split("#")[1], "\n", (await mainText(page)).slice(0, 1800));
const row = page.locator('[data-service="journey-mail"]');
console.log("row count", await row.count());
ctx.on("page", p => console.log("POPUP opened", p.url()));
await row.getByRole("button", { name: /^Connect/ }).click();
for (let i = 0; i < 60; i++) {
  await page.waitForTimeout(3000);
  const r = page.locator('[data-service="journey-mail"]');
  if (await r.count() && await r.getAttribute("data-signed-in") !== null) { console.log("signed in after", i*3, "s"); break; }
  if (i % 5 === 0) { console.log(i, (await page.locator("body").innerText().catch(()=>"")).slice(0, 300).replace(/\n+/g, " | ")); await audit(page, `m-wait-${i}`, { full: false }).catch(()=>{}); }
}
await audit(page, "m-connected", { full: false });
console.log("AFTER:", (await mainText(page)).slice(0, 2000));
await browser.close();
