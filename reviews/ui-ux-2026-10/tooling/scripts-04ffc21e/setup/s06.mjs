import { open, audit, mainText, others } from "./lib.mjs";
const { browser, page } = await open();
const step = async (name) => { const t = await mainText(page); console.log(`== ${name}\n${t}\n`); await audit(page, name); };
await page.getByRole("radio", { name: /Anthropic/ }).check(); await page.waitForTimeout(800);
await step("r1-08-ai-anthropic");
// fill wrong key
const key = page.locator("#ai-key");
if (await key.count()) { await key.fill("sk-wrong-key-123"); await key.blur(); await page.waitForTimeout(5000); await step("r1-08-ai-anthropic-wrongkey"); }
await page.getByRole("radio", { name: /OpenAI/ }).check(); await page.waitForTimeout(800);
await step("r1-09-ai-openai");
if (await key.count()) { await key.fill("nonsense"); await key.blur(); await page.waitForTimeout(5000); await step("r1-09-ai-openai-wrongkey"); }
await page.getByRole("radio", { name: /Something else/ }).check(); await page.waitForTimeout(800);
await step("r1-10-ai-else");
await browser.close();
