import { open, audit, go, mainText } from "./lib.mjs";
const { browser, page } = await open(); await go(page, "#work/open");
await page.getByText("Get a catering quote.", { exact: true }).click(); await page.waitForTimeout(2000);
console.log(page.url());
await audit(page, "o01-todo-click");
console.log((await mainText(page)).slice(0,3000));
console.log(await page.locator("main button, main select, main a, main textarea, main input").evaluateAll(e=>e.map(x=>x.tagName+":"+(x.getAttribute('aria-label')||x.textContent||x.placeholder||x.value).trim().slice(0,40)).join(" | ")));
await browser.close();
