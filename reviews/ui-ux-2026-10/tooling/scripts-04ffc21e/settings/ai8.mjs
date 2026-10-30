import { open, audit, go, mainText, info } from "./lib.mjs";
const { browser, ctx, page } = await open();
await go(page, "#settings/ai"); await page.waitForTimeout(8000);
console.log("MAIN:", (await mainText(page)).split("AI accounts")[1]?.split("Choose which")[0]);
await audit(page, "ai-two-accounts-later", { full: false });
// open menu of second account
const menus = page.locator("main button[aria-haspopup]");
console.log("menu btns:", await menus.count());
await menus.nth(1).click(); await page.waitForTimeout(700);
console.log("menu2:", await page.locator("[role=menu]").innerText().catch(()=>"none"));
await page.getByRole("menuitem", { name: /^Rename/ }).click(); await page.waitForTimeout(800);
await audit(page, "ai-rename", { full: false });
console.log("after rename click:", (await page.locator("[role=dialog]").innerText().catch(()=>"no dialog")).slice(0, 400));
await page.keyboard.press("Escape");
await menus.nth(1).click(); await page.waitForTimeout(700);
await page.getByRole("menuitem", { name: /^Remove/ }).click(); await page.waitForTimeout(1200);
console.log("after remove click:", (await page.locator("[role=dialog], [role=alertdialog]").innerText().catch(()=>"no dialog")).slice(0, 600));
await audit(page, "ai-remove-confirm", { full: false });
const confirm = page.locator("[role=dialog], [role=alertdialog]").getByRole("button", { name: /Remove/ });
if (await confirm.count()) { await confirm.first().click(); await page.waitForTimeout(2000); }
console.log("toasts:", (await page.locator("[role=status],[role=alert]").allInnerTexts()).join(" | "));
console.log("MAIN after:", (await mainText(page)).split("AI accounts")[1]?.split("Choose which")[0]);
const undo = page.getByRole("button", { name: "Undo" });
console.log("undo present:", await undo.count());
await browser.close();
