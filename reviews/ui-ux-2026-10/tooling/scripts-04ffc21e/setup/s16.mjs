import { open, audit, mainText } from "./lib.mjs";
const { browser, page } = await open({ path: "#setup" });
const body = async () => { const t = await mainText(page); return t.slice(t.indexOf("Add a connection"), t.lastIndexOf("Back\n")); };
await page.getByRole("button", { name: "Another mail or calendar" }).click(); await page.waitForTimeout(1000);
console.log("== AMC\n", await body()); await audit(page, "r1-23-mail-another");
const opts = [["cal", /^A calendar/], ["capture", /^A capture folder/], ["feed", /^A news feed/], ["folder", /^A folder/], ["mailbox", /^Your mailbox/]];
for (const [n, re] of opts) {
  await page.getByRole("radio", { name: re }).click(); await page.waitForTimeout(900);
  console.log(`== ${n}\n`, await body()); await audit(page, `r1-23-mail-another-${n}`);
  // fill nonsense in every text input inside the form, then try Add connection
  const inputs = page.locator("main form input[type=text], main form input[type=url], main form input:not([type]), main form input[type=email], main form input[type=password]");
  const c = await inputs.count();
  for (let i = 0; i < c; i++) { const el = inputs.nth(i); if (await el.isVisible() && await el.isEditable()) await el.fill("zzz nonsense ???"); }
  await page.waitForTimeout(400);
  const add = page.getByRole("button", { name: /^Add connection|^Connect|^Add$/ }).last();
  console.log("add enabled:", await add.isEnabled().catch(()=>"?"));
  if (await add.isEnabled().catch(()=>false)) { await add.click(); await page.waitForTimeout(3500); }
  console.log(`== ${n} after nonsense\n`, await body()); await audit(page, `r1-23-mail-another-${n}-nonsense`);
  if (!(await page.getByRole("radio", { name: re }).count())) { console.log("form left; reopening"); await page.getByRole("button", { name: "Another mail or calendar" }).click().catch(()=>{}); await page.waitForTimeout(800); }
}
await browser.close();
