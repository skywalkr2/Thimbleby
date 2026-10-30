import { open, audit, mainText } from "./lib.mjs";
const { browser, ctx, page } = await open({ path: "#setup" });
const row = page.locator('[data-service="journey-mail"]');
const pages = [];
ctx.on("page", p => { pages.push(p); console.log("popup opened:", p.url()); });
await row.getByRole("button", { name: /^Connect/ }).click();
for (let i = 0; i < 12; i++) {
  await page.waitForTimeout(2500);
  const t = (await row.innerText().catch(()=>"(row gone)")).replace(/\n/g, " | ");
  console.log(`t+${(i+1)*2.5}s:`, t.slice(0, 200));
  if (i === 1) await audit(page, "r1-25-mail-connecting");
  if (await row.getAttribute("data-signed-in").catch(()=>null) !== null) break;
}
for (let i = 0; i < 40; i++) { if (await row.getAttribute("data-signed-in").catch(()=>null) !== null) break; await page.waitForTimeout(3000); }
console.log("signed-in attr:", await row.getAttribute("data-signed-in").catch(()=>null));
const t = await mainText(page); console.log(t.slice(t.indexOf("Services you can connect")));
await audit(page, "r1-26-mail-connected");
await browser.close();
