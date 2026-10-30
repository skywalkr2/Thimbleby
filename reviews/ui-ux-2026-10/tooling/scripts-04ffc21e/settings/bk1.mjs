import { open, audit, go, mainText, info } from "./lib.mjs";
const { browser, ctx, page } = await open();
await go(page, "#settings/backups");
await page.locator("summary", { hasText: "More settings" }).click(); await page.waitForTimeout(800);
await page.getByRole("button", { name: "Where it is kept instead" }).click(); await page.waitForTimeout(600);
await audit(page, "bk-more-open");
console.log((await mainText(page)).split("Backups\n")[1]?.slice(0, 5000));
console.log("inputs:", await page.locator("main input, main select").evaluateAll(i => i.map(x => `${x.type} ${x.id} = ${x.value}`)));
await browser.close();
