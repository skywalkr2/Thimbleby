import { open, audit, go, mainText } from "./lib.mjs";
const { browser, page } = await open();
await go(page, "#schedule");
await page.getByText("Venue walk-through").first().click(); await page.waitForTimeout(1500);
await audit(page, "sc01-entry-details");
const t = await mainText(page); const i = t.indexOf("Venue walk-through"); console.log("DETAIL:", t.slice(i, i+1500));
console.log("BUTTONS:", await page.locator("main button, main a, [role=dialog] button").evaluateAll(e=>e.map(x=>(x.getAttribute('aria-label')||x.textContent).trim()).filter(Boolean).join(" | ")));
await page.keyboard.press("Escape");
for (const v of ["Day","Week","Month"]) { await page.locator("main").getByText(v, {exact:true}).first().click(); await page.waitForTimeout(1200); await audit(page, `sc02-view-${v}`); }
await page.locator("main").getByText("Month", {exact:true}).first().click(); await page.waitForTimeout(800);
await page.getByRole("button", { name: /next/i }).or(page.locator("main button").nth(2)).first().click(); await page.waitForTimeout(1200);
await audit(page, "sc03-month-next");
for (const s of ["Personal","Northwind Clinic","Calloway Upholstery","All"]) { await page.locator("main [role=radio]").filter({hasText:s}).first().click(); await page.waitForTimeout(800); const tt = await mainText(page); console.log(s, "has walk-through:", tt.includes("Venue walk-through"), "offsite:", tt.includes("Offsite day")); }
await browser.close();
