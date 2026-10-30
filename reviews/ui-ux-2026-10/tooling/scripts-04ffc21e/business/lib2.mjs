import { mainText } from "./lib.mjs";
export async function counts(page) {
  const nav = await page.locator("nav, aside").first().innerText().catch(()=>"");
  const t = await mainText(page);
  const m = t.match(/(\d+) things? needs? you/); 
  return `today-header=${m?m[1]:"-"} nav=${nav.replace(/\n+/g," ").slice(0,200)}`;
}
export async function lines(page) { return (await page.locator("[data-queue-line]").allInnerTexts()).map(l=>l.replace(/\n+/g," | ").slice(0,150)); }
