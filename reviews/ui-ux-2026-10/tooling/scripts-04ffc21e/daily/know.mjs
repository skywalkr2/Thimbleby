import { open, go, audit, mainText, info } from "../../lib.mjs";
const { browser, page } = await open({});
await go(page, "#records/knowledge");
console.log("BEFORE:", (await mainText(page)).slice(0, 2000));
await page.getByLabel("A word").fill("the Barn");
await page.getByLabel("What it means").fill("Our holiday cottage in the hills, owned with Priya.");
await page.getByRole("button", { name: "Add word" }).click(); await page.waitForTimeout(2000);
await audit(page, "k-after-word");
console.log("AFTER:", (await mainText(page)).slice(0, 2500));
// empty meaning
await page.getByLabel("A word").fill("Pri");
await page.getByRole("button", { name: "Add word" }).click(); await page.waitForTimeout(2000);
console.log("AFTER2:", (await mainText(page)).slice(0, 2500));
await audit(page, "k-after-word2");
await browser.close();
