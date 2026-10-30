import { open, audit, go, mainText } from "./lib.mjs";
import { counts, lines } from "./lib2.mjs";
const { browser, page } = await open(); await go(page, "#today");
console.log("BEFORE", await counts(page));
await page.getByRole("button", { name: "Hand something in" }).click(); await page.waitForTimeout(1200);
const d = page.locator("[role=dialog]").last();
await d.getByLabel("Paste or type it here").fill("Priya Shah from the cafe called. To do: finish the booth seating by 2026-12-01. Question: should we use vinyl or leather? Decided: the cafe pays half up front.");
await d.getByLabel("Where does it belong?").selectOption({label:"Customer jobs › Cafe booth seating"});
await d.getByRole("button", { name: "Hand in" }).click(); await page.waitForTimeout(1500);
await audit(page, "hi02-handed-in", {full:false});
for (let i=0;i<15;i++){ await page.waitForTimeout(4000); const l = await lines(page); if (l.some(x=>/Priya|booth|Look over/.test(x)) && !l.some(x=>/With Reginald|Working/.test(x))) break; }
console.log("AFTER", await counts(page));
console.log((await lines(page)).join("\n"));
await audit(page, "hi03-today-after-handin");
await browser.close();
