import { open, audit, go, mainText, info } from "./lib.mjs";
const inf = await info();
const { browser, ctx, page } = await open(); await go(page, "#setup"); console.log((await mainText(page)).slice(0,600));
const log = async (n) => { console.log("=== " + n + "\n" + (await page.locator("main").innerText()).slice(0, 2000)); };
ctx.on("page", p => console.log("popup opened", p.url()));
await page.locator('[data-service="journey-mail"]').getByRole("button", { name: /^Connect/ }).click();
for (let i = 0; i < 60; i++) {
  await page.waitForTimeout(3000);
  const ok = await page.locator('[data-service="journey-mail"][data-signed-in]').count().catch(() => 0);
  if (ok) { console.log("signed in after", i * 3, "s"); break; }
}
await page.waitForTimeout(2000);
await log("mail after connect");
await audit(page, "setup-mail-connected");
await browser.close();
