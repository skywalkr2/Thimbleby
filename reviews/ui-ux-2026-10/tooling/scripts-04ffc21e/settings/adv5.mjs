import { open, audit, go, mainText, info } from "./lib.mjs";
const { browser, ctx, page } = await open();
await go(page, "#settings/advanced");
for (const name of ["What the assistant learns", "Follow-ups and reminders", "Filing", "Mail", "Meetings"]) { await page.locator("main").getByText(name, { exact: true }).first().click(); await page.waitForTimeout(300); }
console.log("resets:", await page.getByRole("button", { name: /^Reset/ }).evaluateAll(b => b.map(x => x.getAttribute("aria-label"))));
const r = page.getByRole("button", { name: /^Reset/ });
while (await r.count()) { const lbl = await r.first().getAttribute("aria-label"); await r.first().click(); await page.waitForTimeout(2000); console.log("clicked", lbl, "left", await r.count()); if ((await r.first().getAttribute("aria-label").catch(()=>null)) === lbl) { console.log("STUCK on", lbl); break; } }
console.log((await page.locator("body").innerText()).match(/Saved\.[^\n]*/g));
await browser.close();
