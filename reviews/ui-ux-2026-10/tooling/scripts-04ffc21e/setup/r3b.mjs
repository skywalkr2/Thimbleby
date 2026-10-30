import { open, audit, mainText, others, go } from "./lib.mjs";
const { browser, page } = await open({ path: "#setup" });
await page.getByRole("button", { name: "Set up Your promises" }).click().catch(async()=>{ await page.locator('li[data-step="promises"] button').click(); });
await page.waitForTimeout(2000);
console.log("== PROMISES (no mail)\n", await mainText(page));
await audit(page, "r3-03-promises-nomail");
await page.locator('button[data-screen="done"]').click(); await page.waitForTimeout(1500);
await page.getByRole("button", { name: "Go to Today" }).click(); await page.waitForTimeout(3000);
console.log("URL", page.url().split("#")[1]);
console.log("== TODAY\n", await page.locator("body").innerText());
await audit(page, "r3-04-today-all-skipped");
await browser.close();
for (const [w,h,scheme,tag] of [[1440,900,"dark","night"],[390,844,"light","phone"]]) { const { browser: b, page: p } = await open({ width:w, height:h, scheme, path: "#today" }); await audit(p, `r3-04-today-all-skipped-${tag}`); await b.close(); }
