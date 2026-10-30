import { open, audit, go, mainText, info } from "./lib.mjs";
const { browser, ctx, page } = await open(); await go(page, "#setup");
ctx.on("page", p => console.log("popup opened", p.url().slice(0,80)));
await page.getByRole("button", { name: /^Sign in to Example mail/ }).click();
for (let i = 0; i < 40; i++) {
  await page.waitForTimeout(3000);
  const ok = await page.locator('[data-signed-in]').count().catch(() => 0);
  if (ok) { console.log("signed in after", i * 3, "s"); break; }
}
await page.waitForTimeout(2000);
console.log((await mainText(page)).slice(0, 2500));
await audit(page, "setup-mail-signedin");
await browser.close();
