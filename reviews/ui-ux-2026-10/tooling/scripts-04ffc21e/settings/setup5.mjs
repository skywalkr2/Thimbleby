import { open, audit, go, mainText, info } from "./lib.mjs";
const inf = await info();
const { browser, ctx, page } = await open(); await go(page, "#setup");
for (const n of ["Salt Orchard", "Brightline Tutoring"]) await page.getByRole("checkbox", { name: n }).check();
await page.waitForTimeout(800);
await page.getByRole("button", { name: "Continue" }).click(); await page.waitForTimeout(2500);
console.log("=== promises\n" + (await mainText(page)).slice(0, 1500));
await audit(page, "setup-promises");
await page.getByRole("button", { name: "Start" }).click();
for (let i = 0; i < 40; i++) { await page.waitForTimeout(3000); const t = await mainText(page); if (/Continue/.test(t) && !/Reading|reading now/i.test(t)) break; }
console.log("=== promises after\n" + (await mainText(page)).slice(0, 1500));
await audit(page, "setup-promises-after");
await browser.close();
