import { open, audit, mainText, others } from "./lib.mjs";
const { browser, page } = await open({ path: "#setup" });
let t = await mainText(page); console.log("now on:", t.slice(0,40));
if (!t.startsWith("What it's for")) { await page.getByRole("button", { name: "Back", exact: true }).click(); await page.waitForTimeout(2000); }
t = await mainText(page); console.log("== WORK SAVED VIEW\n", t.slice(t.indexOf("What will you use"), t.lastIndexOf("Back\n")));
await audit(page, "r2-04-work-saved-view");
await others("r2-04-work-saved-view");
await browser.close();
