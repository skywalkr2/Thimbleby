import { open, audit, go, mainText, info } from "./lib.mjs";
const toasts = async (page) => (await page.locator("[role=status], [role=alert]").allInnerTexts().catch(()=>[])).filter(Boolean).join(" | ").replace(/\n/g," ");
const { browser, ctx, page } = await open();
await go(page, "#settings/connections");
for (const folder of ["Nonsense folder 123", "Archive"]) {
  await page.getByRole("button", { name: "Choose what to read" }).click(); await page.waitForTimeout(1500);
  await page.getByRole("radio", { name: "Example mail" }).click(); await page.waitForTimeout(1500);
  const f = page.locator("[id$='-setting-folder']");
  await f.fill(folder);
  await page.getByRole("button", { name: "Add connection" }).click(); await page.waitForTimeout(5000);
  console.log("ADD", folder, "=>", await toasts(page), "|", (await page.locator("main [role=alert]").allInnerTexts()).join(";"));
  await audit(page, "cn-add-" + folder.replace(/\W/g, ""));
  console.log("LIST:", (await mainText(page)).split("Add another account")[1]?.replace(/\n+/g, " / ").slice(0, 1600));
  if (await page.getByRole("button", { name: "Cancel" }).count()) await page.getByRole("button", { name: "Cancel" }).click();
  await page.waitForTimeout(800);
}
await browser.close();
