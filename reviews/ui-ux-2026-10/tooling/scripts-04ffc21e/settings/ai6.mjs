import { open, audit, go, mainText, info } from "./lib.mjs";
const inf = await info();
const { browser, ctx, page } = await open();
await go(page, "#settings/ai");
const d = page.locator("[role=dialog]");
const dump = async (n) => { console.log("=== " + n + "\n" + (await d.innerText()).slice(0, 2000)); };
await page.getByRole("button", { name: "Add an account" }).click(); await page.waitForTimeout(1200);
await d.getByRole("radio", { name: /^OpenAI/ }).click(); await page.waitForTimeout(1200);
await dump("openai chosen"); await audit(page, "ai-add-openai");
console.log("dlg buttons:", await d.locator("button").evaluateAll(b => b.map(x => x.textContent.trim()).filter(Boolean)));
const key = d.locator("input[type=password], input[id*=key]").first();
if (await key.count()) { await key.fill("nonsense-key"); await key.press("Tab"); await page.waitForTimeout(5000); await dump("openai bad key"); await audit(page, "ai-add-openai-badkey"); }
await d.getByRole("radio", { name: /^Claude Code/ }).click().catch(()=>{}); await page.waitForTimeout(3000);
await dump("cli chosen"); await audit(page, "ai-add-cli");
await d.getByText("More options").click(); await page.waitForTimeout(800);
await dump("more options"); await audit(page, "ai-add-more");
await browser.close();
