import { open, audit, mainText, info } from "./lib.mjs";
const I = await info();
const { browser, page } = await open();
const after = async (marker, name) => { const t = await mainText(page); console.log(`== ${name}\n` + t.slice(Math.max(0, t.indexOf(marker)))); await audit(page, name); };
await page.getByRole("radio", { name: /Something else/ }).click(); await page.waitForTimeout(800);
await page.getByRole("button", { name: /^Another service/ }).click(); await page.waitForTimeout(800);
await page.getByRole("radio", { name: /^Another service that speaks/ }).click(); await page.waitForTimeout(800);
const addr = page.getByRole("textbox", { name: "Service address" });
await addr.fill("not a web address"); await addr.blur(); await page.waitForTimeout(4000);
await after("Service address", "r1-14-ai-generic-nonsense-addr");
await addr.fill("http://127.0.0.1:1/v1"); await addr.blur(); await page.waitForTimeout(4000);
await after("Service address", "r1-14-ai-generic-dead-addr");
await addr.fill(I.ai_base_url); await page.locator("#ai-key").fill("a-made-up-key"); await page.locator("#ai-key").blur(); await page.waitForTimeout(4000);
await after("Service address", "r1-14-ai-generic-works");
// Change spend
await page.getByRole("button", { name: "Change" }).or(page.getByRole("link", { name: "Change" })).first().click(); await page.waitForTimeout(1000);
await after("What it may spend", "r1-15-ai-spend-change");
await browser.close();
