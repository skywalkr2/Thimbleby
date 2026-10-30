import { open, go, audit, mainText, info } from "../../lib.mjs";
const { browser, page } = await open({});
await go(page, "#schedule");
const addE = async (what, day, time) => {
  await page.getByRole("button", { name: "Add to schedule" }).first().click(); await page.waitForTimeout(800);
  const d = page.locator("[role=dialog]");
  await d.getByLabel("What").fill(what);
  await d.getByLabel("Day").fill(day);
  if (time) await d.getByLabel(/Time/).fill(time);
  await d.getByRole("button", { name: "Add", exact: true }).click(); await page.waitForTimeout(2000);
  if (await d.count() && await d.isVisible()) { console.log("DIALOG STILL OPEN:", await d.innerText()); await page.keyboard.press("Escape"); }
};
await addE("Dentist check-up", "2026-10-30", "10:00");
await addE("Parent-teacher conference", "2026-11-03", "16:30");
await addE("Take Mum to the market", "2026-10-29", "");
await audit(page, "sc-after-add");
console.log((await mainText(page)).slice(0, 1500));
// open an entry
const ev = page.getByText("Dentist check-up").first();
await ev.click(); await page.waitForTimeout(1200);
await audit(page, "sc-entry-open", { full: false });
console.log("ENTRY:", (await page.locator("[role=dialog]").allInnerTexts()).join("\n") || (await mainText(page)).slice(-1200));
console.log("BTNS:", await page.locator("[role=dialog] button, [role=dialog] a").evaluateAll(els => els.map(e => (e.getAttribute("aria-label")||e.textContent.trim()).slice(0,40))));
await page.keyboard.press("Escape");
await page.getByRole("button", { name: "Month", exact: true }).click(); await page.waitForTimeout(1000);
await audit(page, "sc-month-filled", { full: false });
await page.getByRole("button", { name: "Day", exact: true }).click(); await page.waitForTimeout(1000);
await page.getByRole("button", { name: /Next day/ }).click().catch(()=>{}); await page.waitForTimeout(800);
await page.getByRole("button", { name: /Next day/ }).click().catch(()=>{}); await page.waitForTimeout(800);
await audit(page, "sc-day-fri", { full: false });
console.log("DAY:", (await mainText(page)).slice(0, 800));
await go(page, "#today");
await audit(page, "sc-today", { full: false });
await browser.close();
