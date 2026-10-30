import { open, go, audit, mainText, info } from "../../lib.mjs";
const { browser, page } = await open({});
await go(page, "#today");
const items = [
 ["Someone else's", "From: Priya Hart\nSubject: Re: Mum's 70th\n\nJordan, one more thing - remember Lantern House needs a deposit. Book the table for 8 by Friday November 6, and let me know if Uncle Ravi is coming.\nPriya", ""],
 ["Mine", "Notes from the school run\n- We need a babysitter for Saturday night\n- Sam Okoro will lend us the trailer on 2026-11-07\n- I will pick up the dry cleaning by 2026-10-30\n- To do: renew the car insurance before 2026-11-20\n- Decided: we skip the gym membership this year", ""],
];
for (const [who, text] of items) {
  await page.getByRole("button", { name: /Hand something in/ }).first().click(); await page.waitForTimeout(800);
  const d = page.locator("[role=dialog]");
  await d.getByLabel("Paste or type it here").fill(text);
  await d.getByRole("button", { name: who, exact: true }).or(d.getByRole("radio", { name: who, exact: true })).first().click();
  await d.getByRole("button", { name: "Hand in" }).click(); await page.waitForTimeout(2500);
}
for (let k = 0; k < 10; k++) { await page.waitForTimeout(4000); const t = await mainText(page); if (/Start the assistant/.test(t)) { await page.getByRole("button", { name: "Start", exact: true }).first().click(); console.log("pressed Start"); } else if (!/working|Reading/i.test(t)) break; }
await page.waitForTimeout(6000);
await page.reload(); await page.waitForTimeout(2500);
const show = page.getByRole("button", { name: /Show .* new/ }); if (await show.count()) { await show.first().click(); await page.waitForTimeout(1500); }
await audit(page, "h2-today", { full: true });
console.log(await mainText(page));
await browser.close();
