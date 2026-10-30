import { open, audit, go, mainText, info } from "./lib.mjs";
const { browser, ctx, page } = await open();
await go(page, "#settings/addons");
for (const v of ["my catalog", "http://example.com/catalog.yaml", "https://nowhere.invalid/catalog.yaml"]) {
  if (!(await page.getByRole("textbox", { name: "Catalog address" }).count())) { await page.getByRole("button", { name: "Add another catalog" }).click(); await page.waitForTimeout(600); }
  await page.getByRole("textbox", { name: "Catalog address" }).fill(v);
  await page.getByRole("button", { name: "Add catalog" }).click().catch(()=>console.log("  add disabled")); await page.waitForTimeout(4000);
  console.log(JSON.stringify(v), "=>", (await page.locator("main [role=alert]").allInnerTexts()).join(";"), "|", (await mainText(page)).split("Catalog\n")[1]?.replace(/\n+/g, " / ").slice(0, 400));
  await audit(page, "ad-cat-" + v.replace(/\W/g, "").slice(0, 20), { full: false });
}
await browser.close();
