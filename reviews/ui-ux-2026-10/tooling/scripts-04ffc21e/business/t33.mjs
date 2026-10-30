import { open, audit, go, mainText } from "./lib.mjs";
import { counts, lines } from "./lib2.mjs";
const { browser, page } = await open(); await go(page, "#today"); await page.waitForTimeout(2000);
const ln = page.locator("[data-queue-line]", { hasText: "Move them" });
await ln.getByRole("button").first().click(); await page.waitForTimeout(1500);
await audit(page, "t33-move-single", {full:false});
await page.getByRole("button", { name: "Move", exact: true }).first().click(); await page.waitForTimeout(2000);
console.log("after move", await counts(page));
// Changed look over
await page.locator("[data-queue-line]", { hasText: "what changed" }).getByRole("button", { name: "Look over" }).click(); await page.waitForTimeout(2000);
console.log("URL after Changed look over:", page.url());
await audit(page, "t34-changed-lookover");
console.log((await mainText(page)).slice(0,2500));
await browser.close();
