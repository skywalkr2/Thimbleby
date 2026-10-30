import { open, audit, go, mainText } from "./lib.mjs";
const { browser, page } = await open(); await go(page, "#work/changed");
const toast = async () => (await page.locator("[role=status],[role=alert]").allInnerTexts()).filter(Boolean).join(" / ");
// click venue list row
await page.locator("main li[data-row]", { hasText: "Email from Maya Okafor · Venue list" }).locator("button").first().click(); await page.waitForTimeout(1500);
await audit(page, "w02-venue-detail");
const pane = page.locator("main aside, main [data-detail], main [role=complementary]").last();
console.log("PANE:", (await pane.innerText().catch(()=>"?")).slice(0,1500));
await page.getByRole("button", { name: "More actions for Bring the floor plan." }).first().click().catch(()=>{});
await page.locator("main li[data-row]", { hasText: "Moved to Calloway" }).first().locator("button").first().click(); await page.waitForTimeout(1200);
await page.getByRole("button", { name: "More actions for Bring the floor plan." }).first().click(); await page.waitForTimeout(500);
await page.getByRole("menuitem", { name: "Change this" }).click(); await page.waitForTimeout(1500);
await audit(page, "w03-change-this");
console.log("AFTER CHANGE THIS:", page.url()); 
const t = await mainText(page); const i = t.indexOf("Bring the floor plan"); console.log(t.slice(i-200, i+1200));
await browser.close();
