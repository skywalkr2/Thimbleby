import { open, audit, go, mainText, info } from "./lib.mjs";
const { browser, ctx, page } = await open();
await go(page, "#settings/advanced");
for (const name of ["What the assistant learns", "Follow-ups and reminders", "Filing", "Mail", "Meetings"]) { await page.locator("main").getByText(name, { exact: true }).first().click(); await page.waitForTimeout(300); }
for (let i = 0; i < 6; i++) { const r = page.getByRole("button", { name: /^Reset/ }); if (!(await r.count())) break; await r.first().click(); await page.waitForTimeout(1300); }
console.log("resets left:", await page.getByRole("button", { name: /^Reset/ }).count());
// search
const q = page.locator("#settings-search");
for (const w of ["dark", "password", "email", "backup", "cost", "notifications", "language", "money", "delete", "sign out", "time zone", "xyzzy"]) {
  await q.fill(w); await page.waitForTimeout(900);
  const t = (await mainText(page)).split("Search settings")[1] || "";
  console.log(`SEARCH "${w}":`, t.replace(/\n+/g, " / ").slice(0, 450));
  if (["dark", "password", "xyzzy", "language"].includes(w)) await audit(page, "search-" + w.replace(/\W/g, ""), { full: false });
}
await browser.close();
