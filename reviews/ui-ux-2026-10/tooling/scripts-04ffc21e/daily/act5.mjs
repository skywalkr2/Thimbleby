import { open, go, audit, mainText, info } from "../../lib.mjs";
const { browser, page } = await open({});
await go(page, "#today");
const toasts = async () => (await page.locator("[role=status], [role=alert]").allInnerTexts().catch(()=>[])).filter(Boolean).join(" || ");
const line = (t) => page.locator("[data-queue-line]").filter({ hasText: t }).first();
let L = line("Look over 4 to-dos");
await L.getByRole("button", { name: "Look over", exact: true }).click(); await page.waitForTimeout(1000);
await L.getByRole("button", { name: /^Not right: Lend us/ }).click(); await page.waitForTimeout(800);
await L.locator("textarea").first().fill("Sam is lending the trailer to us, so the to-do is mine: pick up the trailer from Sam on Nov 7.");
await audit(page, "a5-notright-filled", { full: false });
await L.getByRole("button", { name: "Send back" }).click(); await page.waitForTimeout(2000);
await audit(page, "a5-sentback", { full: false });
console.log("SENT BACK toasts:", await toasts(), "\n", (await mainText(page)).slice(0, 1500));
await page.waitForTimeout(8000);
await page.reload(); await page.waitForTimeout(2000);
console.log("AFTER RELOAD\n", (await mainText(page)).slice(0, 1800));
// All looks good on Priya email
L = line("Look over 3 things");
if (await L.count()) {
  await L.getByRole("button", { name: "Look over", exact: true }).click(); await page.waitForTimeout(1000);
  await L.getByRole("button", { name: "All looks good" }).click(); await page.waitForTimeout(1500);
  await audit(page, "a5-alllooksgood", { full: false });
  console.log("ALL GOOD toasts:", await toasts(), "\n", (await mainText(page)).slice(0, 1200));
  const u = page.getByRole("button", { name: "Undo" }).last();
  if (await u.count()) { await u.click(); await page.waitForTimeout(1800); await audit(page, "a5-alllooksgood-undo", { full: false }); console.log("UNDO:", await toasts(), "\n", (await mainText(page)).slice(0, 1200)); }
}
await browser.close();
