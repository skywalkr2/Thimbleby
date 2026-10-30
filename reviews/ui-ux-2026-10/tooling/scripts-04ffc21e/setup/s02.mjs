import { open, audit, mainText, others } from "./lib.mjs";
const { browser, page } = await open();
await page.getByRole("button", { name: "Start" }).click();
await page.waitForTimeout(1500);
console.log(await audit(page, "r1-02-you-day"));
await others("r1-02-you");
// phone: open the Steps list
{ const { browser: b, page: p } = await open({ width: 390, height: 844 });
  await p.getByRole("button", { name: "Steps" }).click(); await p.waitForTimeout(500);
  await audit(p, "r1-02-you-phone-steps-open"); await b.close(); }
await browser.close();
