import { open, audit, mainText, others } from "./lib.mjs";
const { browser, page } = await open();
await page.getByRole("button", { name: "Rename" }).click();
await page.waitForTimeout(500);
console.log(await mainText(page));
await audit(page, "r1-03-you-rename-open");
// blank the name and save
const box = page.locator("main input").last();
await box.fill("");
await page.waitForTimeout(300);
await audit(page, "r1-03-you-rename-blank");
console.log("BLANK:", await mainText(page));
await page.getByRole("button", { name: /Cancel/ }).click().catch(e=>console.log("no cancel", e.message));
await page.waitForTimeout(400);
// time zone search
const tz = page.getByLabel("Your time zone");
await tz.fill("Pacific");
await page.waitForTimeout(800);
await audit(page, "r1-03-you-tz-pacific");
console.log("TZ:", await page.locator("[role=listbox], datalist, [role=option]").allInnerTexts().catch(()=>[]));
await tz.fill("nonsense zone");
await page.waitForTimeout(800);
await audit(page, "r1-03-you-tz-nonsense");
console.log("TZNON:", await mainText(page));
await browser.close();
