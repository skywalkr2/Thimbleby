import { open, go, audit, mainText, info } from "../../lib.mjs";
const inf = await info();
const { browser, page } = await open();
const step = async (n) => { await page.waitForTimeout(1000); await audit(page, n); console.log((await mainText(page)).slice(0, 1500)); };
await page.getByLabel("Your full name").fill("Jordan Ellis Hart");
await page.getByRole("button", { name: "Continue" }).click(); await step("s03-whatfor");
await page.getByRole("button", { name: "Continue" }).click(); await step("s04-ai");
await browser.close();
