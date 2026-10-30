import { open, audit, go, mainText } from "./lib.mjs";
const { browser, page } = await open();
const visits = [["Calloway Upholstery","p01-side-calloway"],["Northwind Clinic","p02-side-northwind"],["Personal","p03-side-personal"],["Customer jobs","p04-group"],["Mrs Hale's wingback chair","p05-project-hale"]];
for (const [name, file] of visits) {
  await go(page, "#records/projects");
  await page.locator("main").getByRole("link", { name, exact: true }).first().click(); await page.waitForTimeout(2000);
  console.log(`=== ${name} -> ${page.url().split('#')[1]}`);
  await audit(page, file);
  console.log((await mainText(page)).slice(0,1800));
  console.log("BUTTONS:", await page.locator("main button, main a").evaluateAll(e=>e.map(x=>(x.getAttribute('aria-label')||x.textContent).trim()).filter(Boolean).join(" | ")));
}
await browser.close();
