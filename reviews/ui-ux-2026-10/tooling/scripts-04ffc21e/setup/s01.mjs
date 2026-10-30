import { open, audit, mainText } from "./lib.mjs";
for (const [w,h,scheme,tag] of [[1440,900,"light","day"],[1440,900,"dark","night"],[390,844,"light","phone"]]) {
  const { browser, page } = await open({ width:w, height:h, scheme });
  const t = await audit(page, `r1-01-welcome-${tag}`);
  if (tag==="day") console.log(t);
  await browser.close();
}
