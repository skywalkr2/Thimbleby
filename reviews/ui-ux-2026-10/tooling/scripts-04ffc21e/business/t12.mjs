import { open, audit, go, mainText } from "./lib.mjs";
import { counts, lines } from "./lib2.mjs";
const { browser, page } = await open(); await go(page, "#today");
const brief = page.locator("main section, main aside, main div").filter({ has: page.getByRole("heading", { name: "Morning brief" }) }).last();
// Show buttons in the brief
const shows = brief.getByRole("button", { name: "Show", exact: true });
console.log("show count", await shows.count());
if (await shows.count()) { await shows.first().click(); await page.waitForTimeout(1200); await audit(page, "t12-brief-show"); console.log("after Show url", page.url(), (await page.evaluate(()=>document.activeElement?.outerHTML.slice(0,200)))); }
await go(page, "#today");
await page.getByRole("button", { name: "Show this week's briefing" }).click(); await page.waitForTimeout(3000);
await audit(page, "t13-week-briefing");
console.log((await mainText(page)).slice(0,3000));
await browser.close();
