import { open, audit, go, mainText, info } from "./lib.mjs";
const toasts = async (page) => (await page.locator("[role=status], [role=alert]").allInnerTexts().catch(()=>[])).filter(Boolean).join(" | ").replace(/\n/g," ");
const { browser, ctx, page } = await open();
await go(page, "#settings/backups");
const sec = async () => (await mainText(page)).split("Backup key")[1]?.split("Synced folder")[0].replace(/\n+/g, " / ");
console.log("now:", await sec());
await page.locator("header").getByText("Connected").click(); await page.waitForTimeout(600);
await page.getByRole("button", { name: "Back up now" }).click(); await page.waitForTimeout(6000);
console.log("pop after backup:", (await page.locator("[role=dialog]").innerText().catch(()=>"")).replace(/\n+/g," / "), "|", await toasts(page));
await audit(page, "bk-backup-now", { full: false });
await page.keyboard.press("Escape");
// turn off auto backups and check header
await page.getByRole("checkbox", { name: "Back up automatically" }).uncheck(); await page.waitForTimeout(1500);
console.log("auto off:", await toasts(page));
await go(page, "#today"); console.log("hdr:", (await page.locator("header").innerText()).replace(/\n/g," / "));
await go(page, "#settings/backups");
await page.getByRole("checkbox", { name: "Back up automatically" }).check(); await page.waitForTimeout(1500);
// synced folder: choose a folder button
await page.getByRole("button", { name: /^Choose a folder…/ }).click(); await page.waitForTimeout(1500);
console.log("chooser:", (await page.locator("[role=dialog]").innerText().catch(()=>"none")).slice(0, 800));
await audit(page, "bk-choose-folder");
await page.keyboard.press("Escape"); await page.waitForTimeout(500);
await page.getByRole("button", { name: /^Choose a folder$/ }).click(); await page.waitForTimeout(1500);
console.log("chooser2:", (await page.locator("[role=dialog]").innerText().catch(()=>"none")).slice(0, 800));
await audit(page, "bk-choose-folder2");
await page.keyboard.press("Escape");
await browser.close();
