import { open, audit, go, mainText } from "./lib.mjs";
const { browser, page } = await open(); await go(page, "#today"); await page.waitForTimeout(1500);
const ln = page.locator("[data-queue-line]", { hasText: "Your inbox" });
await ln.getByRole("button", { name: "Look over" }).click(); await page.waitForTimeout(2000);
await audit(page, "t22-inbox-lookover");
const box = page.locator("main section").first();
console.log((await mainText(page)).split("Look over what was found in Your inbox")[1]?.slice(0,3000));
console.log(await page.locator("main button").evaluateAll(e=>e.map(x=>(x.getAttribute('aria-label')||x.textContent).trim()).filter(Boolean).join(" | ")));
await browser.close();
