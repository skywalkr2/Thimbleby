import { open, go, audit, mainText, info } from "../../lib.mjs";
const pre = process.argv[2]; const mode = process.argv[3] || "d";
const cfg = { d: { width: 1440, height: 900, scheme: "light" }, n: { width: 1440, height: 900, scheme: "dark" }, p: { width: 390, height: 844, scheme: "light" } }[mode];
const { browser, page } = await open(cfg);
for (const v of process.argv.slice(4)) { await go(page, v); await audit(page, `${pre}-${mode}-${v.replace(/[#\/]/g, "_").replace(/^_/, "")}`); console.log("=====", v, "\n" + (await mainText(page)).slice(0, 3000)); }
await browser.close();
