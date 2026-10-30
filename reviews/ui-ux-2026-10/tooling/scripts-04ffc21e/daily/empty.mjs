import { open, go, audit, mainText, info } from "../../lib.mjs";
const [mode] = process.argv.slice(2);
const cfg = { d: { width: 1440, height: 900, scheme: "light" }, n: { width: 1440, height: 900, scheme: "dark" }, p: { width: 390, height: 844, scheme: "light" } }[mode];
const pre = process.argv[3] || "e";
const { browser, page } = await open(cfg);
const views = ["#today","#schedule","#work/changed","#work/since","#work/handled","#work/followups","#work/open","#work/stages","#records/projects","#records/people","#records/files","#records/knowledge","#records/rules-review","#quality","#handover","#settings"];
for (const v of views) {
  await go(page, v);
  const t = await audit(page, `${pre}-${mode}-${v.replace(/[#\/]/g, "_").replace(/^_/, "")}`);
  if (mode === "d") console.log((await mainText(page)).slice(0, 1500), "\n");
}
await browser.close();
