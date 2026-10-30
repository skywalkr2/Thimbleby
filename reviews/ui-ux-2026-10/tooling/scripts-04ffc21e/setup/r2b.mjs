import { open, audit, mainText, others } from "./lib.mjs";
const { browser, page } = await open({ path: "#setup" });
let t = await mainText(page); console.log("== AFTER RELOAD (unsaved form?)", t.slice(t.indexOf("Also keep track"), t.lastIndexOf("Back\n")).replace(/\n+/g," | ").slice(0,500));
await browser.close();
