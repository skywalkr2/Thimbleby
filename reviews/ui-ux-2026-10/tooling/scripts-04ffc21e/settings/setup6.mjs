import { open, audit, go, mainText, info } from "./lib.mjs";
const inf = await info();
const { browser, ctx, page } = await open(); await go(page, "#setup");
for (let i = 0; i < 30; i++) { const t = await mainText(page); if (!/0 of 8|Looking over your mail: \d/.test(t)) break; await page.waitForTimeout(4000); }
console.log("=== promises\n" + (await mainText(page)).slice(0, 2000));
await audit(page, "setup-promises-done");
await page.getByRole("button", { name: "Continue" }).click(); await page.waitForTimeout(2500);
console.log("=== backups\n" + (await mainText(page)).slice(0, 1500));
await page.getByLabel("Folder", { exact: true }).fill(inf.backup_folder);
await page.getByRole("button", { name: /Back up now/ }).click(); await page.waitForTimeout(6000);
console.log("=== backups after\n" + (await mainText(page)).slice(0, 1500));
await audit(page, "setup-backups");
await browser.close();
