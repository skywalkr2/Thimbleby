// usage: modes.mjs prefix hash1 hash2 ...  -> audits each hash in day 1440, night 1440, phone 390 (light)
import { open, audit, go, mainText } from "./lib.mjs";
const [prefix, ...hashes] = process.argv.slice(2);
for (const [mode, opt] of [["day",{}],["night",{scheme:"dark"}],["phone",{width:390,height:844}]]) {
  const { browser, page } = await open(opt);
  for (const h of hashes) { await go(page, h); await audit(page, `${prefix}-${h.replace(/[#\/]/g,"_").replace(/^_/,"")}-${mode}`); }
  await browser.close();
}
