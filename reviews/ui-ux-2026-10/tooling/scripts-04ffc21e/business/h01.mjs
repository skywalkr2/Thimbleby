import { open, audit, go, mainText } from "./lib.mjs";
const { browser, page } = await open(); await go(page, "#work/handled");
const toast = async () => (await page.locator("[role=status],[role=alert]").allInnerTexts()).filter(Boolean).join(" / ");
await page.getByText("Sales and promotions · 2").click(); await page.waitForTimeout(800);
await audit(page, "h01-expanded");
console.log((await mainText(page)).split("Sender")[1]);
console.log(await page.locator("main button").evaluateAll(e=>e.map(x=>(x.getAttribute('aria-label')||x.textContent).trim()).join(" | ")));
for (const g of ["Reason","Sender"]) { await page.getByRole("radio", { name: g }).or(page.getByRole("button", { name: g, exact:true })).first().click(); await page.waitForTimeout(800); await audit(page, `h02-by-${g}`); console.log(`BY ${g}:`, (await mainText(page)).split("Sender")[1]?.slice(0,500)); }
await page.getByLabel("Search by sender, subject, kind or reason").fill("neighbors"); await page.waitForTimeout(800);
console.log("SEARCH:", (await mainText(page)).split("Sender")[1]?.slice(0,400)); await audit(page, "h03-search");
await page.getByLabel("Search by sender, subject, kind or reason").fill("zzzz nothing"); await page.waitForTimeout(800);
console.log("SEARCH none:", (await mainText(page)).split("Sender")[1]?.slice(0,400)); await audit(page, "h04-search-none");
await page.getByRole("radio", { name: /Read, nothing to do/ }).or(page.getByRole("button", { name: /Read, nothing to do/ })).first().click(); await page.waitForTimeout(1000);
await audit(page, "h05-read-nothing"); console.log("READ TAB:", (await mainText(page)).slice(0,800));
await browser.close();
