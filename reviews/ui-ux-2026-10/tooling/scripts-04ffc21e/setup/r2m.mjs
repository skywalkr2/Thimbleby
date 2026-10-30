import { open, audit, mainText } from "./lib.mjs";
const { browser, page } = await open({ path: "#setup" });
await page.getByRole("button", { name: "Finish later" }).click(); await page.waitForTimeout(2500);
console.log("URL", page.url().split("#")[1]); const t = await mainText(page); console.log(t.slice(0, 400));
const line = page.getByText(/Setup \d of/);
console.log("setup line:", await line.count());
if (await line.count()) {
  const menu = page.getByRole("button", { name: /more|options|setup line|…/i });
  const btns = await page.locator("main button").evaluateAll(els => els.slice(0,6).map(e => (e.getAttribute("aria-label") || e.textContent).trim()));
  console.log(btns);
}
await audit(page, "r2-18-today-after-finish-later");
await browser.close();
