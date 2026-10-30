import { open, audit, go, mainText } from "./lib.mjs";
const { browser, page } = await open(); await go(page, "#today");
for (const tab of ["Personal","Northwind Clinic","Calloway Upholstery","All"]) {
  await page.locator("main").getByRole("radio", { name: tab, exact: true }).first().click();
  await page.waitForTimeout(1200);
  const lines = await page.locator("[data-queue-line]").allInnerTexts();
  console.log(`== ${tab} url=${page.url().split('#')[1]} lines=${lines.length}`);
  lines.forEach(l=>console.log("  -", l.replace(/\n+/g," | ").slice(0,160)));
  console.log("  header:", (await mainText(page)).split("\n").slice(0,8).join(" | "));
  await audit(page, `t02-today-tab-${tab.split(" ")[0]}`);
}
await browser.close();
