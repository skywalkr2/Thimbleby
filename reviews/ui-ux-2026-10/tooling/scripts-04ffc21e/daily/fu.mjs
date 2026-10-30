import { open, go, audit, mainText, info } from "../../lib.mjs";
const pre = process.argv[2] || "fu";
const { browser, ctx, page } = await open({});
await go(page, "#work/followups");
await audit(page, `${pre}-main`);
console.log(await mainText(page));
console.log(await page.locator("main button, main [role=tab], main a").evaluateAll(els => els.map(e => (e.getAttribute("role")||e.tagName)+":"+(e.getAttribute("aria-label")||e.textContent.trim()).slice(0,40))));
for (const t of ["To send", "Later", "Waiting on them", "By project", "By person"]) {
  const b = page.getByRole("tab", { name: new RegExp("^" + t) }).or(page.getByRole("button", { name: new RegExp("^" + t) })).or(page.getByRole("radio", { name: new RegExp("^" + t) })).first();
  if (!(await b.count())) { console.log("NO TAB", t); continue; }
  await b.click(); await page.waitForTimeout(1000);
  await audit(page, `${pre}-${t.replace(/ /g, "")}`);
  console.log("=== TAB", t, "\n", (await mainText(page)).slice(0, 1200));
}
await browser.close();
