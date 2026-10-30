import { open, audit, go, mainText } from "./lib.mjs";
const { browser, page } = await open();
for (const name of ["Maya Okafor","Theo Brandt","Robin Calloway","Hattie Hale"]) {
  await go(page, "#records/people");
  await page.locator("main").getByRole("link", { name, exact: true }).first().click(); await page.waitForTimeout(1200); await page.getByRole("button", { name: `Open ${name}'s page` }).or(page.getByRole("link", { name: `Open ${name}'s page` })).first().click(); await page.waitForTimeout(2000);
  console.log(`=== ${name} -> ${page.url().split('#')[1]}`);
  await audit(page, `pp-${name.split(" ")[0]}`);
  console.log((await mainText(page)).slice(0,2200));
  console.log("BUTTONS:", await page.locator("main button, main a").evaluateAll(e=>e.map(x=>(x.getAttribute('aria-label')||x.textContent).trim()).filter(Boolean).join(" | ")));
}
await browser.close();
