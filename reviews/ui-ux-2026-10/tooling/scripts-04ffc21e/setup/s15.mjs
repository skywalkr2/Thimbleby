import { open, audit, mainText, info, go } from "./lib.mjs";
const { browser, page } = await open({ path: "#setup" });
const body = async () => { const t = await mainText(page); return t.slice(t.indexOf("Services you can connect"), t.indexOf("Back\n")); };
await page.getByText("What it can access").click(); await page.waitForTimeout(500);
console.log("== ACCESS\n", await body()); await audit(page, "r1-21-mail-access");
await page.getByText("What it can access").click();
const sel = page.getByLabel("Mail service");
for (const opt of ["Gmail", "Yahoo Mail", "iCloud Mail", "Fastmail", "Another mailbox"]) {
  await sel.selectOption({ label: opt }); await page.waitForTimeout(900);
  console.log(`== ${opt}\n`, await body()); await audit(page, `r1-22-mail-apppw-${opt.replace(/\W+/g, "")}`);
}
await browser.close();
