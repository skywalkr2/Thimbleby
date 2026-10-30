import { open, audit, go, mainText } from "./lib.mjs";
import { counts, lines } from "./lib2.mjs";
const { browser, page } = await open(); await go(page, "#today");
const clash = page.locator("[data-queue-line]", { hasText: "Sort out the clash" });
await clash.locator("div[title]").first().click(); await page.waitForTimeout(1500);
await audit(page, "t09-clash-clicked");
console.log((await mainText(page)).slice(0,1500));
await clash.getByRole("button", { name: "It's fine" }).click(); await page.waitForTimeout(1500);
await audit(page, "t10-clash-fine");
console.log("AFTER", await counts(page));
const st = await page.locator("[role=status], [role=alert], .toast").allInnerTexts(); console.log("STATUS", st);
const undo = page.getByRole("button", { name: /^Undo/ });
console.log("undo buttons", await undo.count());
if (await undo.count()) { await undo.first().click(); await page.waitForTimeout(1500); console.log("AFTER UNDO", await counts(page)); console.log((await lines(page)).join("\n")); await audit(page,"t11-clash-undo"); }
await browser.close();
