import { open, audit, go, mainText } from "./lib.mjs";
import { counts, lines } from "./lib2.mjs";
const { browser, page } = await open(); await go(page, "#today"); await page.waitForTimeout(1500);
const m = page.locator("main button[aria-label^='More actions']");
const labs = await m.evaluateAll(e=>e.map(x=>x.getAttribute('aria-label')));
console.log(labs);
for (let i=0;i<labs.length;i++){ await m.nth(i).click(); await page.waitForTimeout(500); console.log(labs[i], "->", await page.locator("[role=menu] [role=menuitem]").allInnerTexts()); await page.keyboard.press("Escape"); await page.waitForTimeout(200); }
// Fabric delivery menu: try Move/Cancel
const fm = page.getByRole("button", { name: /More actions for Fabric delivery/ });
if (await fm.count()) { await fm.click(); await page.waitForTimeout(400); const items = await page.locator("[role=menu] [role=menuitem]").allInnerTexts(); await audit(page, "t40-schedule-entry-menu", {full:false});
  const mv = page.getByRole("menuitem", { name: /Move|Change/ }).first(); if (await mv.count()) { await mv.click(); await page.waitForTimeout(1200); await audit(page, "t41-schedule-entry-move"); console.log("MOVE UI:", (await mainText(page)).match(/Fabric delivery[\s\S]{0,600}/)?.[0]); } }
console.log("BEFORE CHECK", await counts(page));
await page.getByRole("button", { name: "Check now" }).click(); await page.waitForTimeout(500);
await audit(page, "t42-check-now", {full:false});
await page.waitForTimeout(8000);
console.log("AFTER CHECK", await counts(page));
console.log((await mainText(page)).match(/Came in[\s\S]{0,500}/)?.[0]);
await browser.close();
