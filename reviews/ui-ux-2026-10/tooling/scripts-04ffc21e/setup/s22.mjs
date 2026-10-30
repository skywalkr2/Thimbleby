import { open, audit, mainText, others } from "./lib.mjs";
const { browser, page } = await open({ path: "#setup" });
await page.getByRole("button", { name: "Continue" }).first().click(); await page.waitForTimeout(2500);
console.log(await audit(page, "r1-31-promises-day"));
await others("r1-31-promises");
await browser.close();
