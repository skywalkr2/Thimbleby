import { open, audit, go, mainText } from "./lib.mjs";
const { browser, page } = await open(); await go(page, "#today");
const line = page.locator("[data-queue-line]").first();
await line.getByRole("button", { name: "Pick" }).click(); await page.waitForTimeout(1500);
const sel = page.locator("main select").first();
console.log(await sel.evaluate(s=>[...s.querySelectorAll("option,optgroup")].map(o=>o.tagName+":"+(o.label||o.text))));
// menus
const menus = page.locator("main [aria-haspopup], main button[aria-label*='More'], main button:has-text('…')");
console.log("menus", await menus.count(), await menus.evaluateAll(e=>e.map(x=>x.getAttribute('aria-label')||x.textContent)));
await browser.close();
