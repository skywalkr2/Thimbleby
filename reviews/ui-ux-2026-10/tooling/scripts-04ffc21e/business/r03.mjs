import { open, audit, go, mainText } from "./lib.mjs";
const { browser, page } = await open();
await go(page, "#records/fact/FACT-2");
await page.getByRole("button", { name: /from a calendar entry/ }).click(); await page.waitForTimeout(2000);
console.log("URL", page.url()); await audit(page, "r03-fact-source");
console.log((await mainText(page)).slice(0,2500));
console.log("BUTTONS:", await page.locator("main button, main a, [role=dialog] button").evaluateAll(e=>e.map(x=>(x.getAttribute('aria-label')||x.textContent).trim()).filter(Boolean).join(" | ")));
await browser.close();
