import { open, go, audit, mainText, info } from "../../lib.mjs";
const { browser, page } = await open({});
await go(page, "#setup");
await page.getByRole("button", { name: "Go to Today" }).click(); await page.waitForTimeout(2500);
await audit(page, "e-today-first");
console.log(await page.locator("body").innerText());
await browser.close();
