import { open, audit, go, mainText, info } from "./lib.mjs";
const { browser, ctx, page } = await open(); await go(page,"#setup");
await page.getByRole("button", { name: "Start", exact: true }).click();
for (let i=0;i<60;i++){ await page.waitForTimeout(3000); const t=await mainText(page); if(!/Reading|Looking|reading/.test(t) || i%10==9) { console.log(i, t.slice(0,300).replace(/\n/g,' | ')); } if (/promise|follow-up/i.test(t) && !/Nothing is read by the assistant until/.test(t) && !/Reading|Looking/.test(t)) break; }
await audit(page, "s14-promises-done");
console.log(await mainText(page));
await browser.close();
