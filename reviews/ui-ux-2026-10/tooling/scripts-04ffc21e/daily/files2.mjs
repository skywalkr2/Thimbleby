import { open, go, audit, mainText, info } from "../../lib.mjs";
const { browser, page } = await open({});
await go(page, "#records/files");
await page.getByRole("button", { name: "Add a file" }).click(); await page.waitForTimeout(800);
const d = page.locator("[role=dialog]");
await d.locator("input[type=file]").setInputFiles(process.env.OUT + "/../files/home-insurance.txt");
await d.getByLabel(/Description/).fill("Home insurance policy, renews in November");
await page.waitForTimeout(500);
await d.getByRole("button", { name: "Add" }).click(); await page.waitForTimeout(2500);
await audit(page, "f-after-add");
console.log((await mainText(page)).slice(0, 1500));
const link = page.locator("main a").first();
if (await link.count()) { await link.click(); await page.waitForTimeout(1800); await audit(page, "f-record"); console.log("FILE REC", page.url().split("#")[1], "\n", (await mainText(page)).slice(0, 2000)); }
await browser.close();
