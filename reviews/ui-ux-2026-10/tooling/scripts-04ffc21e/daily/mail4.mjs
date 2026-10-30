import { open, go, audit, mainText, info } from "../../lib.mjs";
const { browser, ctx, page } = await open({});
await go(page, "#setup");
for (let i = 0; i < 6; i++) {
  const t = await mainText(page);
  console.log("STEP:", t.split("\n")[0]);
  const g = page.getByRole("button", { name: "Go to Today" });
  if (await g.count()) { await g.click(); break; }
  await page.getByRole("button", { name: "Continue" }).click(); await page.waitForTimeout(1800);
}
await page.waitForTimeout(3000);
for (let k = 0; k < 10; k++) { const t = await mainText(page); if (/Start the assistant/.test(t)) { await audit(page, "m-today-start-line"); console.log("START LINE:", t.slice(0, 800)); await page.getByRole("button", { name: "Start", exact: true }).first().click(); console.log("pressed Start"); await page.waitForTimeout(15000); } else break; }
await page.reload(); await page.waitForTimeout(3000);
const show = page.getByRole("button", { name: /Show .* new/ }); if (await show.count()) { await show.first().click(); await page.waitForTimeout(1500); }
await audit(page, "m-today-after");
console.log(await mainText(page));
await browser.close();
