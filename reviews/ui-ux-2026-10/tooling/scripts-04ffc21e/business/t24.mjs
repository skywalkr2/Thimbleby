import { open, audit, go, mainText } from "./lib.mjs";
import { counts, lines } from "./lib2.mjs";
const { browser, page } = await open(); await go(page, "#today"); await page.waitForTimeout(1500);
console.log("BEFORE", await counts(page));
const ln = page.locator("[data-queue-line]", { hasText: "Your inbox" });
await ln.getByRole("button", { name: "Look over" }).click(); await page.waitForTimeout(2000);
await page.getByRole("button", { name: "Not right: Get a printed agenda." }).click(); await page.waitForTimeout(800);
await page.locator("main textarea").fill("The agenda is already printed, this is not a to-do.");
await page.getByRole("button", { name: "Send back" }).click(); 
for (const w of [500,1500,3000]) { await page.waitForTimeout(w); console.log("toast", (await page.locator("[role=status],[role=alert]").allInnerTexts()).filter(Boolean)); }
await audit(page, "t24-sent-back");
console.log("AFTER", await counts(page));
console.log((await lines(page)).join("\n"));
await page.waitForTimeout(8000);
await page.reload(); await page.waitForTimeout(3000);
console.log("LATER", await counts(page));
console.log((await lines(page)).join("\n"));
await audit(page, "t25-after-sendback-reload");
await browser.close();
