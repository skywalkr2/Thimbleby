import { open, audit, go, mainText, info } from "./lib.mjs";
const { browser, ctx, page } = await open(); await go(page,"#setup");
if (await page.getByRole("button", { name: "Set up" }).count()) { await page.getByRole("button", { name: "Set up" }).click(); await page.waitForTimeout(1500); }
await page.getByLabel("Side").selectOption({label: "Northwind Clinic"}); await page.waitForTimeout(300);
await page.getByLabel("Name", {exact:true}).fill("Dana Whitfield");
await page.getByLabel("Who they are").selectOption({label: "manager"});
await page.getByRole("button", { name: "Add", exact: true }).click(); await page.waitForTimeout(1200);
await page.getByLabel("How Theo Brandt relates to you").selectOption({label:"my friend"}); await page.waitForTimeout(800);
await audit(page, "s22-people-final");
console.log(await mainText(page));
await page.getByRole("button", { name: "Continue" }).click(); await page.waitForTimeout(1500);
await audit(page, "s23-done");
await page.getByRole("button", { name: "Go to Today" }).click(); await page.waitForTimeout(3000);
await audit(page, "t01-today-first");
console.log(await mainText(page));
await browser.close();
