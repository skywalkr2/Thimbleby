import { open, audit, go, mainText, info } from "./lib.mjs";
const { browser, ctx, page } = await open(); await go(page,"#setup");
const row = page.locator('[data-service="journey-mail"]');
ctx.on("page", p => console.log("popup", p.url()));
await row.getByRole("button", { name: /^(Connect|Sign in)/ }).click();
for (let i = 0; i < 70; i++) {
  await page.waitForTimeout(2000);
  if (await page.locator('[data-service="journey-mail"][data-signed-in]').count().catch(()=>0)) break;
  if (i % 10 == 9) console.log("waiting", i, (await mainText(page).catch(()=>"")).slice(0,150).replace(/\n/g," | "));
}
await page.waitForTimeout(2000);
await audit(page, "s09-mail-connected");
console.log(await mainText(page));
await browser.close();
