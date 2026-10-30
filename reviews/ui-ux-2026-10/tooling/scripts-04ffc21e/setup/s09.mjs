import { open, audit, mainText, others } from "./lib.mjs";
const { browser, page } = await open();
const step = async (name) => { const t = await mainText(page); console.log(`== ${name}\n${(t.split("These need a technical setup")[1] ?? t).split("What it may spend")[0]}\n...${t.slice(-120)}`); await audit(page, name); };
await page.getByRole("radio", { name: /Something else/ }).click(); await page.waitForTimeout(1000);
await page.getByRole("button", { name: /^An app you're signed in/ }).click(); await page.waitForTimeout(1200);
for (const [n, re] of [["claude", /^Claude Code/], ["copilot", /^GitHub Copilot/], ["codex", /^Codex/], ["gemini", /^Gemini/]]) {
  await page.getByRole("radio", { name: re }).click(); await page.waitForTimeout(2500);
  await step(`r1-12-ai-app-${n}`);
}
await page.getByRole("button", { name: /^One on this computer/ }).click(); await page.waitForTimeout(1200);
for (const [n, re] of [["ollama", /^Ollama/], ["lmstudio", /^LM Studio/], ["cli", /^Another command-line/]]) {
  await page.getByRole("radio", { name: re }).click(); await page.waitForTimeout(2500);
  await step(`r1-13-ai-local-${n}`);
}
await browser.close();
