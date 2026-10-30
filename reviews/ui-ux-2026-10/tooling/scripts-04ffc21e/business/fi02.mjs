import { open, audit, go, mainText } from "./lib.mjs";
const { browser, page } = await open();
await go(page, "#records/files");
await page.getByRole("button", { name: "Add a file" }).click(); await page.waitForTimeout(1000);
const d = page.locator("[role=dialog]").last();
await d.locator("input[type=file]").setInputFiles(process.env.OUT + "/../hale-quote.txt");
await d.getByLabel(/Where does it belong/).selectOption({label:"Customer jobs › Mrs Hale's wingback chair"});
await d.getByLabel(/Description/).fill("Quote I sent Hattie");
await d.getByRole("button", { name: "Add" }).click(); await page.waitForTimeout(2500);
await audit(page, "fi02-file-added");
console.log((await mainText(page)).slice(0,1200));
const link = page.locator("main a, main button").filter({ hasText: /hale-quote|Quote/ }).first();
if (await link.count()) { await link.click(); await page.waitForTimeout(2000); console.log("URL", page.url()); await audit(page, "fi03-file-page"); console.log((await mainText(page)).slice(0,2000)); console.log("BUTTONS:", await page.locator("main button, main a").evaluateAll(e=>e.map(x=>(x.getAttribute('aria-label')||x.textContent).trim()).filter(Boolean).join(" | "))); }
await browser.close();
