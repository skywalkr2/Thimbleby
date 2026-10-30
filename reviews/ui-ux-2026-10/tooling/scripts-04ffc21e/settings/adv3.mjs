import { open, audit, go, mainText, info } from "./lib.mjs";
const { browser, ctx, page } = await open();
await go(page, "#settings/advanced");
for (const name of ["What the assistant learns", "Follow-ups and reminders", "Filing", "Mail", "Meetings"]) { await page.locator("main").getByText(name, { exact: true }).first().click(); await page.waitForTimeout(500); }
const lastToast = async () => { const t = await page.locator("body").innerText(); const m = t.match(/(Saved\.[^\n]*|“[^\n]*isn't allowed[^\n]*|[^\n]*must be[^\n]*)/g); return m ? m.slice(-2).join(" || ") : ""; };
const err = async (id) => (await page.locator(`[id='${id}']`).locator("xpath=ancestor::*[contains(@class,'row') or contains(@class,'setting')][1]").innerText().catch(()=>"")).replace(/\n+/g, " / ").slice(0, 300);
await page.locator("[id='setting-dispatch.knowledge.learn']").uncheck(); await page.waitForTimeout(1200); console.log("learn off:", await lastToast());
const chase = page.locator("[id='setting-ui.followups.question_after_days']");
for (const v of ["abc", "0", "-1", "999", "2"]) { await chase.fill(v); await chase.press("Tab"); await page.waitForTimeout(1300); console.log("chase", v, "=>", await chase.inputValue(), "|", (await page.locator("main [role=alert]").allInnerTexts()).join(";"), "|", await lastToast()); }
await audit(page, "adv-chase", { full: false });
const sw = page.locator("[id='setting-workspace.project.side_words.business']");
await sw.fill("orchard"); await sw.press("Enter"); await page.waitForTimeout(1300); console.log("side word:", await lastToast());
await page.locator("[id='setting-watch.sorting']").selectOption({ index: 1 }); await page.waitForTimeout(1300); console.log("sorting:", await lastToast());
const tr = page.locator("[id='setting-steward.clashes.travel_minutes']");
await tr.fill("half an hour"); await tr.press("Tab"); await page.waitForTimeout(1300); console.log("travel nonsense:", await tr.inputValue(), (await page.locator("main [role=alert]").allInnerTexts()).join(";"), "|", await lastToast());
await tr.fill("45"); await tr.press("Tab"); await page.waitForTimeout(1300); console.log("travel 45:", await lastToast());
await audit(page, "adv-changed");
await page.reload(); await page.waitForTimeout(2500);
for (const name of ["What the assistant learns", "Follow-ups and reminders", "Filing", "Mail", "Meetings"]) { await page.locator("main").getByText(name, { exact: true }).first().click(); await page.waitForTimeout(300); }
console.log("after reload:", await page.locator("main input, main select").evaluateAll(i => i.map(x => `${x.id.replace("setting-","")}=${x.type==="checkbox"?x.checked:x.value}`)));
console.log("side chips:", (await mainText(page)).split("Words that mean your business or job")[1]?.slice(0, 80));
console.log("resets:", await page.getByRole("button", { name: /^Reset/ }).evaluateAll(b => b.map(x => x.getAttribute("aria-label"))));
await browser.close();
