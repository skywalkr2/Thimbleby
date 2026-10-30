import { open, go, audit, mainText, info } from "../../lib.mjs";
const { browser, page } = await open({});
await go(page, "#records/people");
await page.getByRole("link", { name: "Priya Hart" }).click(); await page.waitForTimeout(1500);
await audit(page, "p-d-person-page");
console.log(page.url().split("#")[1], "\n", await mainText(page));
console.log(await page.locator("main button, main a").evaluateAll(els => els.map(e => (e.getAttribute("aria-label")||e.textContent.trim()).slice(0,40))));
await browser.close();
