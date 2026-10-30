import { open, audit, mainText, others } from "./lib.mjs";
const { browser, page } = await open();
const step = async (name) => { const t = await mainText(page); console.log(`== ${name}\n${t}\n`); await audit(page, name); };
await page.getByRole("radio", { name: /Something else/ }).click(); await page.waitForTimeout(1200);
await step("r1-10-ai-else");
console.log("checked?", await page.getByRole("radio", { name: /Something else/ }).isChecked());
await browser.close();
