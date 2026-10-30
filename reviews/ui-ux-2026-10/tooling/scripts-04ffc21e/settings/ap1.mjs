import { open, audit, go, mainText, info } from "./lib.mjs";
const { browser, ctx, page } = await open();
await go(page, "#settings/appearance");
await page.locator("summary", { hasText: "More settings" }).click(); await page.waitForTimeout(800);
await audit(page, "ap-more");
console.log((await mainText(page)).split("Appearance\n").slice(-1)[0].slice(0, 3000));
console.log(await page.locator("main input, main select").evaluateAll(i => i.map(x => `${x.type} ${x.id} = ${x.value}`)));
await browser.close();
