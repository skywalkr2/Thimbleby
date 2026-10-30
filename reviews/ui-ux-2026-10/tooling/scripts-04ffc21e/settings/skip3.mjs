import { open, audit, go, mainText } from "./lib.mjs";
const { browser, page } = await open();
await go(page, "#today");
await page.getByRole("button", { name: "Set up backups" }).or(page.getByRole("link", { name: "Set up backups" })).first().click(); await page.waitForTimeout(2000);
console.log("went to:", page.url().split("#")[1]); console.log((await mainText(page)).slice(0, 600));
await audit(page, "skip-setup-backups-link");
await go(page, "#settings/connections");
await page.getByRole("button", { name: "Ask how to add one" }).click(); await page.waitForTimeout(3000);
console.log("ask how:", page.url().split("#")[1], (await page.locator("[role=dialog]").innerText().catch(()=>"")) || (await mainText(page)).slice(0, 600));
await audit(page, "skip-ask-how");
await go(page, "#settings/ai-compare"); console.log("compare:", (await mainText(page)).split("Journey mail").slice(-1)[0].slice(-400));
await audit(page, "skip-compare");
// header warning Reginald
await page.locator("header").getByText("Reginald", { exact: true }).click(); await page.waitForTimeout(800);
console.log("Reginald pill:", await page.locator("[role=dialog]").innerText().catch(()=>"none"));
await audit(page, "skip-reginald-pill", { full: false });
await browser.close();
