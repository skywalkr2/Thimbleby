import { open, audit, go, mainText } from "./lib.mjs";
const { browser, page } = await open(); await go(page, "#settings/business");
await page.getByRole("button", { name: "Remove Northwind Clinic" }).click(); await page.waitForTimeout(1000);
await audit(page, "bz13-remove-job", {full:false});
let t = await mainText(page); console.log(t.slice(t.indexOf("What it is called"), t.indexOf("Lists")));
const btn = page.getByRole("button", { name: /End them with it|Move them to Personal|Remove/ });
console.log("buttons:", await page.locator("main button").allInnerTexts().then(a=>a.slice(0,15)));
if (await page.getByRole("button", { name: "End them with it" }).count()) { await page.getByRole("button", { name: "End them with it" }).click(); await page.waitForTimeout(1500); }
await audit(page, "bz14-job-removed", {full:false});
t = await mainText(page); console.log("AFTER:", t.slice(t.indexOf("What it is called"), t.indexOf("Lists")));
console.log("nav:", await page.locator("nav, aside").first().innerText().then(x=>x.replace(/\n+/g," ")));
const u = page.getByRole("button", { name: "Undo" }); console.log("undo", await u.count());
if (await u.count()) { await u.first().click(); await page.waitForTimeout(2000); t = await mainText(page); console.log("AFTER UNDO:", t.slice(t.indexOf("What it is called"), t.indexOf("Lists"))); console.log("nav:", await page.locator("nav, aside").first().innerText().then(x=>x.replace(/\n+/g," "))); await audit(page, "bz15-job-undo", {full:false}); }
await go(page, "#records/people"); console.log("PEOPLE:", (await mainText(page)).match(/Dana Whitfield[^\n]*\n?[^\n]*/)?.[0], (await mainText(page)).match(/Organizations[\s\S]*/)?.[0]);
await browser.close();
