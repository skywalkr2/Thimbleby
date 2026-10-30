import { open, audit, go, mainText } from "./lib.mjs";
import { counts, lines } from "./lib2.mjs";
const { browser, page } = await open(); await go(page, "#today"); await page.waitForTimeout(1500);
const toast = async () => (await page.locator("[role=status],[role=alert]").allInnerTexts()).filter(Boolean).join(" / ");
const ln = page.locator("[data-queue-line]", { hasText: "Move them?" });
await ln.getByRole("button", { name: "Look" }).click(); await page.waitForTimeout(1500);
await page.getByRole("button", { name: "Move" }).nth(1).click(); await page.waitForTimeout(300);
console.log("toast:", await toast()); await page.waitForTimeout(800); console.log("toast2:", await toast());
await audit(page, "t30-moved", {full:false});
console.log("AFTER", await counts(page)); console.log((await lines(page)).join("\n"));
const t = await mainText(page); const i=t.indexOf("Move them?"); console.log(i>0? t.slice(i, i+900):"line gone");
const undo = page.getByRole("button", { name: "Undo" });
console.log("undo", await undo.count());
if (await undo.count()) { await undo.first().click(); await page.waitForTimeout(1500); console.log("AFTER UNDO", await counts(page)); console.log((await lines(page)).join("\n")); await audit(page,"t31-move-undone",{full:false});
  const ln2 = page.locator("[data-queue-line]", { hasText: "Move them?" });
  if (await ln2.count()) { await ln2.getByRole("button", { name: "Look" }).click(); await page.waitForTimeout(1200); await page.getByRole("button", { name: "Move" }).nth(1).click(); await page.waitForTimeout(1500); console.log("re-moved", await counts(page)); }
}
await browser.close();
