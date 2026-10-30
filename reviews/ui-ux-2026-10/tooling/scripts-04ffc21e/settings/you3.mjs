import { open, audit, go, mainText } from "./lib.mjs";
const { browser, page } = await open();
await go(page, "#settings/you");
const toast = async () => (await page.locator("[role=status], [role=alert]").allInnerTexts().catch(()=>[])).filter(Boolean).join(" | ");
// header warning pill
const pill = page.locator("header").getByText("Penny", { exact: true });
console.log("pill count", await pill.count());
await pill.first().hover(); await page.waitForTimeout(800);
await audit(page, "hdr-penny-hover", { full: false });
await pill.first().click().catch(e => console.log("click fail", e.message.slice(0,80))); await page.waitForTimeout(1000);
await audit(page, "hdr-penny-click", { full: false });
console.log("after pill click:", (await page.locator("[role=dialog], [role=menu], [role=tooltip], [popover]").allInnerTexts()).join(" || "));
await page.keyboard.press("Escape");
const rs = page.locator("header").getByText("Restart to finish");
await rs.click(); await page.waitForTimeout(1000);
await audit(page, "hdr-restart-click", { full: false });
console.log("restart click:", (await page.locator("[role=dialog], [role=menu], [popover], [role=tooltip]").allInnerTexts()).join(" || "));
await browser.close();
