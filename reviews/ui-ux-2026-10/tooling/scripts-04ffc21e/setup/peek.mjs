import { open, audit, mainText } from "./lib.mjs";
const { browser, page } = await open({ path: process.env.P || "#setup" });
console.log(page.url().split("#")[1]); console.log(await audit(page, process.env.N || "peek"));
await browser.close();
