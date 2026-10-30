import { open, audit, go, mainText, info } from "./lib.mjs";
for (const [tag, opts] of [["d", { scheme: "light" }], ["p", { width: 390, height: 844 }]]) {
const { browser, ctx, page } = await open(opts);
await go(page, "#settings/you");
const dlg = async () => (await page.locator("[role=dialog], [role=menu]").allInnerTexts()).join(" || ").slice(0, 1500);
// keyboard help
await page.locator("body").click({ position: { x: 5, y: 600 } }).catch(()=>{});
await page.keyboard.press("Shift+?"); await page.waitForTimeout(1000);
console.log(tag, "SHORTCUTS:", await dlg()); await audit(page, `hd-${tag}-shortcuts`, { full: false });
await page.keyboard.press("Escape"); await page.waitForTimeout(400);
// help button
const help = page.getByRole("button", { name: "Help" });
if (await help.count()) { await help.first().click(); await page.waitForTimeout(1000); console.log(tag, "HELP:", await dlg()); await audit(page, `hd-${tag}-help`, { full: false }); await page.keyboard.press("Escape"); }
// feedback
const fb = page.getByRole("button", { name: /Missed something/ });
if (await fb.count()) { await fb.first().click(); await page.waitForTimeout(1000); console.log(tag, "FEEDBACK:", await dlg()); await audit(page, `hd-${tag}-feedback`, { full: false }); await page.keyboard.press("Escape"); }
// user menu
await page.locator("header button").last().click(); await page.waitForTimeout(800);
console.log(tag, "USERMENU:", await dlg()); await audit(page, `hd-${tag}-usermenu`, { full: false });
await page.keyboard.press("Escape");
await browser.close();
}
