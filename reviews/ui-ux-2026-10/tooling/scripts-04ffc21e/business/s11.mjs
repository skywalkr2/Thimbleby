import { open, audit, go, mainText, info } from "./lib.mjs";
const { browser, ctx, page } = await open(); await go(page,"#setup");
if (await page.getByRole("button", { name: "Set up" }).count()) { await page.getByRole("button", { name: "Set up" }).click(); await page.waitForTimeout(1500); }
const cb = page.locator("main input[type=checkbox]");
await cb.nth(2).check(); await cb.nth(3).check();
await page.getByRole("button", { name: "Add these" }).click(); await page.waitForTimeout(1500);
await audit(page, "s20-people-added-suggest");
console.log(await mainText(page));
async function add(name, side, how) {
  await page.getByLabel("Side").selectOption({label: side}); await page.waitForTimeout(300);
  await page.getByLabel("Name", {exact:true}).fill(name);
  await page.getByLabel("Who they are").selectOption({label: how}); await page.waitForTimeout(300);
  await page.getByRole("button", { name: "Add", exact: true }).click(); await page.waitForTimeout(1200);
}
await add("Hattie Hale", "Calloway Upholstery", "customer");
await add("Owen Marsh", "Calloway Upholstery", "supplier");
await add("Dana Whitfield", "Northwind Clinic", "Something else").catch(e=>console.log("job add", e.message.slice(0,200)));
await audit(page, "s21-people-typed");
console.log(await mainText(page));
console.log(await page.locator("main select").evaluateAll(s=>s.map(x=>x.id+": "+[...x.options].map(o=>o.text).join(" / "))));
await browser.close();
