import { open, audit, mainText, info } from "./lib.mjs";
const I = await info();
const { browser, page } = await open();
const after = async (marker, name) => { const t = await mainText(page); console.log(`== ${name}\n` + t.slice(Math.max(0, t.indexOf(marker)))); await audit(page, name); };
await after("Which AI", "r1-16-ai-after-reload");
await page.getByRole("radio", { name: /Something else/ }).click(); await page.waitForTimeout(800);
await page.getByRole("button", { name: /^Another service/ }).click(); await page.waitForTimeout(800);
await page.getByRole("radio", { name: /^Another service that speaks/ }).click(); await page.waitForTimeout(800);
const addr = page.getByRole("textbox", { name: "Service address" });
await addr.fill(I.ai_base_url); await page.locator("#ai-key").fill("a-made-up-key"); await page.locator("#ai-key").blur(); await page.waitForTimeout(4000);
await page.getByText("Advanced", { exact: true }).click(); await page.waitForTimeout(1000);
await after("Advanced", "r1-17-ai-advanced");
console.log("SELECTS:"); for (const s of await page.locator("main select").all()) { const id = await s.getAttribute("id"); console.log(id, await s.locator("option").allInnerTexts()); }
await page.getByRole("radio", { name: /^Not my private/ }).click(); await page.waitForTimeout(800);
await after("Reginald's AI service", "r1-18-ai-notprivate");
await page.getByRole("radio", { name: /^Allow/ }).click(); await page.waitForTimeout(800);
await after("Reginald's AI service", "r1-18-ai-allow");
await browser.close();
