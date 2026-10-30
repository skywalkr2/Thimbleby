import { open, audit, go, mainText } from "./lib.mjs";
const { browser, ctx, page } = await open(); await go(page, "#work/followups");
await ctx.grantPermissions(["clipboard-read","clipboard-write"]);
await audit(page, "f01-followups");
console.log((await mainText(page)).slice(0,1500));
console.log(await page.locator("main button").evaluateAll(e=>e.map(x=>(x.getAttribute('aria-label')||x.textContent).trim()).join(" | ")));
await browser.close();
