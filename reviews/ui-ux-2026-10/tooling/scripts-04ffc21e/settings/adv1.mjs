import { open, audit, go, mainText, info } from "./lib.mjs";
import fs from "node:fs";
const { browser, ctx, page } = await open({ scheme: "light" });
await go(page, "#settings/advanced");
const sums = page.locator("main details > summary");
console.log("topics:", await sums.allInnerTexts());
for (let i = 0; i < await sums.count(); i++) { await sums.nth(i).click(); await page.waitForTimeout(400); }
await page.waitForTimeout(800);
await audit(page, "adv-all-open");
const t = (await mainText(page)).split("Advanced\n").slice(-1)[0].replace(/\n(\d\d:\d\d\n)+/g, "\n[times]\n");
fs.writeFileSync(process.env.OUT + "/adv-text.txt", t);
console.log(t.slice(0, 9000));
console.log(await page.locator("main details input, main details select").evaluateAll(i => i.map(x => `${x.type} ${x.id} = ${x.value}`)));
await browser.close();
