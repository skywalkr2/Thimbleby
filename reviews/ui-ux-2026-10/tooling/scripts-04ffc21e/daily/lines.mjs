import { open, go, audit, mainText, info } from "../../lib.mjs";
const pre = process.argv[2] || "l";
const { browser, page } = await open({});
await go(page, "#today");
const lines = page.locator("[data-queue-line]");
const n = await lines.count(); console.log("lines", n);
for (let i = 0; i < n; i++) {
  const l = lines.nth(i);
  console.log("\n######## LINE", i, (await l.innerText()).replace(/\n+/g, " | "));
  console.log("line buttons:", await l.locator("button, a").evaluateAll(els => els.map(e => (e.getAttribute("aria-label")||e.textContent.trim()).slice(0,40))));
  await l.click({ position: { x: 200, y: 10 } }); await page.waitForTimeout(1200);
  const insp = page.locator("[data-queue-inspector]");
  if (await insp.count()) {
    console.log("INSPECTOR:", (await insp.innerText()).slice(0, 1500));
    console.log("insp buttons:", await insp.locator("button, a").evaluateAll(els => els.map(e => (e.getAttribute("aria-label")||e.textContent.trim()).slice(0,40))));
  }
  await audit(page, `${pre}-line${i}-open`, { full: false });
  const more = l.locator("button[aria-label*='More'], button[aria-label*='more'], button:has-text('…')").first();
  if (await more.count()) { await more.click(); await page.waitForTimeout(700); console.log("MENU:", (await page.locator("[role=menu]").allInnerTexts()).join(" | ")); await audit(page, `${pre}-line${i}-menu`, { full: false }); await page.keyboard.press("Escape"); }
  else { const m2 = page.locator("[data-queue-inspector] button[aria-label*='ore']").first(); if (await m2.count()) { await m2.click(); await page.waitForTimeout(700); console.log("INSP MENU:", (await page.locator("[role=menu]").allInnerTexts()).join(" | ")); await audit(page, `${pre}-line${i}-menu`, { full: false }); await page.keyboard.press("Escape"); } }
}
await browser.close();
