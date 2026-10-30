import { open, audit, go, mainText } from "./lib.mjs";
const { browser, ctx, page } = await open(); 
await go(page, "#work/followups");
await page.getByText("Theo Brandt", { exact: true }).first().click(); await page.waitForTimeout(1200);
await page.getByRole("button", { name: "Copy message" }).first().click(); await page.waitForTimeout(1000);
await audit(page, "f10-copy-no-permission", {full:false});
console.log(await page.locator("main button").evaluateAll(e=>e.map(x=>(x.getAttribute('aria-label')||x.textContent).trim()).join(" | ")));
await browser.close();
