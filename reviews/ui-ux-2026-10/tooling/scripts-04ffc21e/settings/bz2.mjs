import { open, audit, go, mainText, info } from "./lib.mjs";
const toasts = async (page) => (await page.locator("[role=status], [role=alert]").allInnerTexts().catch(()=>[])).filter(Boolean).join(" | ").replace(/\n/g," ");
const { browser, ctx, page } = await open();
await go(page, "#settings/business");
const biz = async () => (await mainText(page)).split("What it is called")[1]?.split("Lists")[0].replace(/\n+/g, " / ");
await page.getByRole("button", { name: /^Rename/ }).first().click(); await page.waitForTimeout(800);
const inp = page.getByRole("textbox", { name: /New name for/ });
await inp.fill(""); await page.getByRole("button", { name: "Save", exact: true }).click().catch(e => console.log("save disabled?")); await page.waitForTimeout(1200);
console.log("empty:", await biz(), "|", await toasts(page));
await inp.fill("Brightline Tutoring"); await page.getByRole("button", { name: "Save", exact: true }).click().catch(()=>console.log("save fail")); await page.waitForTimeout(1500);
console.log("dup:", await biz(), "|", await toasts(page), (await page.locator("main [role=alert]").allInnerTexts()).join(";"));
await audit(page, "bz-rename-dup2", { full: false });
if (await inp.count()) { await inp.fill("Salt Orchard Farm"); await page.getByRole("button", { name: "Save", exact: true }).click(); await page.waitForTimeout(2000); }
console.log("good:", await biz(), "|", await toasts(page));
console.log("nav:", (await page.locator("nav").first().innerText()).replace(/\n/g, " / "));
await go(page, "#today"); console.log("today tabs:", (await mainText(page)).slice(0, 120).replace(/\n/g, " / "));
await browser.close();
