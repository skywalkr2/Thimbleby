import { open, audit, mainText, others, info } from "./lib.mjs";
const { browser, page } = await open({ path: "#setup" });
await page.getByRole("button", { name: "Continue" }).click(); await page.waitForTimeout(2500);
console.log(await audit(page, "r1-50-done-day"));
await others("r1-50-done");
await browser.close();
