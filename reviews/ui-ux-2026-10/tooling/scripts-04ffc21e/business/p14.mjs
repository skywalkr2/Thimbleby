import { open, audit, go, mainText } from "./lib.mjs";
const { browser, page } = await open();
await go(page, "#records/projects");
await page.locator("main").getByRole("link", { name: "Footstool for the Lindqvist family" }).click(); await page.waitForTimeout(1200);
await page.getByRole("link", { name: /Open Footstool/ }).or(page.getByRole("button", { name: /Open Footstool/ })).first().click(); await page.waitForTimeout(2000);
console.log("URL", page.url());
await audit(page, "p14-project-page");
console.log((await mainText(page)).slice(0,2500));
console.log("BUTTONS:", await page.locator("main button, main a").evaluateAll(e=>e.map(x=>(x.getAttribute('aria-label')||x.textContent).trim()).filter(Boolean).join(" | ")));
// conversation box
await page.locator("main textarea").first().fill("Add a to-do to order 2 metres of green velvet from Owen Marsh by Friday.");
await page.getByRole("button", { name: "Send" }).click();
for (let i=0;i<10;i++){ await page.waitForTimeout(3000); const t = await mainText(page); if (!/Reginald is (thinking|working|on it)/i.test(t)) break; }
await audit(page, "p15-project-talk");
const t = await mainText(page); const i=t.indexOf("Talk to Reginald"); console.log("TALK:", t.slice(i, i+1500));
await browser.close();
