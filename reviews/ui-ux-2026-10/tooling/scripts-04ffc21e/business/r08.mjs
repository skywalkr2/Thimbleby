import { open, audit, go, mainText } from "./lib.mjs";
const { browser, page } = await open(); await go(page, "#records/person/PER-3");
await page.locator("main").getByRole("link", { name: "Get a catering quote." }).or(page.locator("main").getByRole("button", { name: "Get a catering quote." })).last().click(); await page.waitForTimeout(2000);
console.log("URL", page.url()); await audit(page, "r08-todo-page");
console.log((await mainText(page)).slice(0,2500));
console.log("BUTTONS:", await page.locator("main button, main a").evaluateAll(e=>e.map(x=>(x.getAttribute('aria-label')||x.textContent).trim()).filter(Boolean).join(" | ")));
const m = page.locator("main button[aria-label^='More actions']"); if (await m.count()) { await m.first().click(); await page.waitForTimeout(400); console.log("MENU", await page.locator("[role=menu] [role=menuitem]").allInnerTexts()); await page.keyboard.press("Escape"); }
await page.locator("main textarea").first().fill("Remind me to chase Theo on Friday if no quote.");
await page.getByRole("button", { name: "Send" }).click(); await page.waitForTimeout(8000);
await audit(page, "r09-todo-talk");
const t = await mainText(page); const i = t.indexOf("Talk to Reginald"); console.log("TALK:", t.slice(i, i+800));
await browser.close();
