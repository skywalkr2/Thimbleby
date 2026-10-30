import { open, go, audit, mainText, info } from "../../lib.mjs";
const { browser, page } = await open({});
for (const v of process.argv.slice(2)) { await go(page, v); console.log("=====", v, "\n" + (await mainText(page)).slice(0, 2500)); }
await page.getByRole("button", { name: /^Reginald/ }).first().click(); await page.waitForTimeout(800);
console.log("== REGINALD POPOVER\n", (await page.locator("[role=dialog]").allInnerTexts()).join("\n"));
await audit(page, "h-d-reginald-pop", { full: false });
await browser.close();
