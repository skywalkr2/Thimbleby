import { open, audit, go, mainText } from "./lib.mjs";
import { counts } from "./lib2.mjs";
const { browser, ctx, page } = await open(); await go(page, "#work/handled");
const toast = async () => (await page.locator("[role=status],[role=alert]").allInnerTexts()).filter(Boolean).join(" / ");
const grp = page.getByText(/Sales and promotions · 2/); if (await grp.count()) { await grp.click(); await page.waitForTimeout(600); }
await page.getByRole("button", { name: "Bring it in: Spring sale: everything half price" }).click(); await page.waitForTimeout(600);
console.log(await page.locator("main").innerText().then(t=>t.slice(-400))); await page.locator("main li button, main div button").filter({ hasText: /^Calloway Upholstery$/ }).last().click();
for (const w of [300, 1000, 2000]) { await page.waitForTimeout(w); console.log("toast", await toast()); }
await audit(page, "h11-brought-in");
console.log("AFTER", await counts(page)); console.log((await mainText(page)).split("Sender")[1]?.slice(0,700));
await page.waitForTimeout(15000);
await go(page, "#today"); await page.waitForTimeout(2000);
console.log("TODAY", await counts(page));
console.log((await page.locator("[data-queue-line]").allInnerTexts()).map(x=>x.replace(/\n+/g," | ")).join("\n"));
await audit(page, "h12-today-after-bringin");
await browser.close();
