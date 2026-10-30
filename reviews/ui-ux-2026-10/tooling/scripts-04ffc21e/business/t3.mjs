import { open, audit, go, mainText } from "./lib.mjs";
const { browser, page } = await open(); await go(page, "#today");
await page.locator("main").getByRole("radio", { name: "Northwind Clinic", exact: true }).click();
await page.waitForTimeout(1500);
console.log(await page.locator("main [role=radio]").evaluateAll(e=>e.map(x=>x.textContent+"="+x.getAttribute("aria-checked"))));
console.log(page.url());
console.log((await mainText(page)).slice(0,1500));
await page.screenshot({path: process.env.OUT+"/t03-northwind.png"});
await browser.close();
