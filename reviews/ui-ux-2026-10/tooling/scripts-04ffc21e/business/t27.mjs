import { open, audit, go, mainText } from "./lib.mjs";
import { counts, lines } from "./lib2.mjs";
const { browser, page } = await open(); await go(page, "#today"); await page.waitForTimeout(1500);
const toast = async () => (await page.locator("[role=status],[role=alert]").allInnerTexts()).filter(Boolean).join(" / ");
console.log("BEFORE", await counts(page));
let ln = page.locator("[data-queue-line]", { hasText: "Your inbox" });
await ln.getByRole("button", { name: "Look over" }).click(); await page.waitForTimeout(1500);
await page.getByRole("button", { name: "All looks good" }).click(); await page.waitForTimeout(700);
console.log("toast:", await toast());
await audit(page, "t27-all-good", {full:false});
console.log("AFTER", await counts(page)); console.log((await lines(page)).join("\n"));
const undo = page.getByRole("button", { name: "Undo" });
if (await undo.count()) { await undo.first().click(); await page.waitForTimeout(1500); console.log("AFTER UNDO", await counts(page)); console.log((await lines(page)).join("\n")); }
// now accept calendar and sent
for (const txt of ["Your calendar","Your sent mail","Your inbox"]) {
  ln = page.locator("[data-queue-line]", { hasText: txt });
  await ln.getByRole("button", { name: "Look over" }).click(); await page.waitForTimeout(1500);
  await page.getByRole("button", { name: "All looks good" }).click(); await page.waitForTimeout(1500);
  console.log("accepted", txt, await counts(page));
}
console.log((await lines(page)).join("\n"));
await audit(page, "t28-after-accepts");
await browser.close();
