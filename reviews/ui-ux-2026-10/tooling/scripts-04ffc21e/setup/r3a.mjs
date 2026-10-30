import { open, audit, mainText, others } from "./lib.mjs";
const { browser, page } = await open();
await page.getByRole("button", { name: "Start" }).click(); await page.waitForTimeout(1500);
for (let i = 0; i < 9; i++) {
  const t = await mainText(page);
  const title = t.split("\n")[0];
  const skip = page.getByRole("button", { name: "I'll do this later" });
  console.log(`== ${title}: buttons=`, (await page.locator("main button").allInnerTexts()).filter(b => /later|Continue|Go to|Back up|Start/.test(b)).join(" / "));
  if (title === "Done") break;
  if (await skip.count()) { await skip.click(); await page.waitForTimeout(2500); }
  else { console.log("  no skip on", title); const c = page.locator("main").getByRole("button", { name: "Continue" }); if (await c.count()) { await c.last().click(); await page.waitForTimeout(2500); } else break; }
  if (i === 3) await audit(page, "r3-01-after-4-skips");
}
console.log(await audit(page, "r3-02-done-all-skipped"));
await others("r3-02-done-all-skipped");
await browser.close();
