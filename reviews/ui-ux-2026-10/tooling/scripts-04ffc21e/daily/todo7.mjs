import { open, go, audit, mainText, info } from "../../lib.mjs";
const { browser, ctx, page } = await open({});
const toasts = async () => (await page.locator("[role=status], [role=alert]").allInnerTexts().catch(()=>[])).filter(Boolean).join(" || ");
const fresh = async () => { await page.goto(page.url().split("#")[0] + "#work/open"); await page.reload(); await page.waitForTimeout(2000); };
const menu = async (todo, label) => { await page.getByRole("button", { name: `More actions for ${todo}` }).click(); await page.waitForTimeout(600); await page.getByRole("menuitem", { name: new RegExp("^" + label) }).first().click(); await page.waitForTimeout(1000); };
const row = (todo) => page.locator("main li").filter({ hasText: todo }).first();
// 1 Edit: change due date and title
await fresh(); await menu("Pay the water bill", "Edit");
const r = row("Pay the water bill");
console.log(await r.locator("input,select,textarea").evaluateAll(els=>els.map(e=>e.type+":"+(e.labels?.[0]?.textContent||e.getAttribute("aria-label"))+"="+e.value)));
await r.locator("input[type=date]").first().fill("2026-11-02");
await r.getByRole("button", { name: "Save" }).first().click(); await page.waitForTimeout(1500);
await audit(page, "td-edit-saved", { full: false });
console.log("EDIT toasts:", await toasts(), "\nROW:", (await row("Pay the water bill").innerText()).replace(/\n+/g," | "));
// 2 Mark done + Undo
await fresh();
await row("Return Sam's ladder").getByRole("button", { name: "Mark done" }).click(); await page.waitForTimeout(1200);
await audit(page, "td-markdone", { full: false });
console.log("DONE toasts:", await toasts(), "\nLIST:", (await mainText(page)).slice(0, 900).replace(/\n+/g," | "));
const u = page.getByRole("button", { name: "Undo" }).last(); if (await u.count()) { await u.click(); await page.waitForTimeout(1500); }
await audit(page, "td-markdone-undo", { full: false });
console.log("UNDO toasts:", await toasts(), "\nLIST:", (await mainText(page)).slice(0, 900).replace(/\n+/g," | "));
// 3 Remove reminder
await fresh(); await menu("Pay the water bill", "Remove reminder"); console.log("REMOVE REMINDER toasts:", await toasts(), (await row("Pay the water bill").innerText()).replace(/\n+/g," | "));
// 4 Reassign to Sam
await fresh(); await menu("Buy a birthday card for Mum", "Reassign");
const rr = row("Buy a birthday card for Mum");
await audit(page, "td-reassign", { full: false });
console.log("REASSIGN form:", (await rr.innerText()).replace(/\n+/g," | "));
const sel = rr.locator("select").first(); if (await sel.count()) { await sel.selectOption({ label: "Sam Okoro" }).catch(e=>console.log("sel err", e.message.split("\n")[0])); await rr.getByRole("button").filter({ hasText: /Save|Reassign|Hand/ }).first().click().catch(e=>console.log("btn err")); await page.waitForTimeout(1500); }
console.log("REASSIGN toasts:", await toasts(), (await mainText(page)).slice(0, 1200).replace(/\n+/g," | "));
// 5 Pause with reason
await fresh(); await menu("Take the bins out", "Pause");
const pr = row("Take the bins out");
await pr.locator("input[type=text], input:not([type])").first().fill("Bin day changes after the holidays");
await pr.getByRole("button", { name: "Pause" }).click(); await page.waitForTimeout(1500);
console.log("PAUSE toasts:", await toasts(), (await row("Take the bins out").innerText()).replace(/\n+/g," | "));
await audit(page, "td-paused", { full: false });
// 6 Drop
await fresh(); await menu("Buy a birthday card for Mum", "Drop"); await page.waitForTimeout(800);
await audit(page, "td-drop", { full: false });
console.log("DROP toasts:", await toasts(), (await mainText(page)).slice(0, 1200).replace(/\n+/g," | "));
// filters
await fresh();
await page.getByLabel("State").selectOption({ label: "Paused" }); await page.waitForTimeout(1000);
await audit(page, "td-filter-paused", { full: false }); console.log("FILTER paused:", (await mainText(page)).slice(0, 600).replace(/\n+/g," | "));
await page.getByLabel("State").selectOption({ label: "Overdue" }); await page.waitForTimeout(1000);
await audit(page, "td-filter-overdue", { full: false }); console.log("FILTER overdue:", (await mainText(page)).slice(0, 600).replace(/\n+/g," | "));
await page.getByLabel("State").selectOption({ label: "Not touched in a while" }); await page.waitForTimeout(1000);
console.log("FILTER stale:", (await mainText(page)).slice(0, 600).replace(/\n+/g," | "));
await page.getByLabel("State").selectOption({ label: "Any state" }); await page.getByLabel("Person").selectOption({ label: "Priya Hart" }); await page.waitForTimeout(1000);
console.log("FILTER priya:", (await mainText(page)).slice(0, 600).replace(/\n+/g," | "));
await browser.close();
