import { open, audit, mainText } from "./lib.mjs";
const { browser, page } = await open({ path: "#setup" });
await page.locator('button[data-screen="work"]').click(); await page.waitForTimeout(2000);
let t = await mainText(page); console.log("== WORK\n", t.slice(t.indexOf("Added so far"), t.indexOf("Reading work")).replace(/\n+/g," | "));
const rm = page.getByRole("button", { name: "Remove" });
console.log("remove buttons:", await rm.count());
if (await rm.count()) { await rm.first().click(); await page.waitForTimeout(2000); }
t = await mainText(page); console.log("== AFTER REMOVE JOB\n", t.slice(t.indexOf("Also keep"), t.lastIndexOf("Back\n")).replace(/\n+/g," | ").slice(0,900));
console.log("toast:", await page.locator("[data-toast-region]").innerText().catch(()=>""));
await audit(page, "r2-16-work-remove-job-after");
await page.locator('button[data-screen="mail"]').click(); await page.waitForTimeout(2000);
t = await mainText(page); console.log("== MAIL\n", t.slice(t.indexOf("Example mail is"), t.lastIndexOf("Back\n")).replace(/\n+/g," | "));
await page.locator('button[data-screen="people"]').click(); await page.waitForTimeout(2000);
t = await mainText(page); console.log("== PEOPLE\n", t.slice(t.indexOf("The people in"), t.lastIndexOf("Name\n")).replace(/\n+/g," | "));
await audit(page, "r2-17-people-after-job-removed");
await browser.close();
