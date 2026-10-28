// What the first-day specs share: a fresh workspace after setup with a business, and the screens a person opens on the first
// day. The server (`--first-day`) is made as a person with no work makes it and holds nothing but one run waiting for the
// first go; the business is added through the setup route, as setup does, with an empty project inside it.
import { expect, type APIRequestContext, type Page } from "@playwright/test";

const AUTH = { Authorization: "Bearer e2e-token" };
export const LOADED = { timeout: 20_000 };

// Made-up and plain.
export const SIDE = "Example Imprint";
const SUMMARY = `${SIDE} is a small independent publisher.`;
const PROJECT = "First catalog";

export interface FirstDay {
  side: string;
  project: string;
  person: string;
}

/** Sets up the business and one empty project in it (saying it again changes nothing) and finds the person's own id. */
export async function setUpWithBusiness(request: APIRequestContext): Promise<FirstDay> {
  const made = await request.post("api/setup/business", { headers: AUTH, data: { name: SIDE, kind: "business", summary: SUMMARY } });
  expect(made.ok()).toBe(true);
  const side = (await made.json()).project as string;
  const added = await request.post("api/projects", { headers: AUTH, data: { name: PROJECT, parent: side } });
  const project = added.ok()
    ? ((await added.json()).id as string)
    : ((await (await request.get("api/projects", { headers: AUTH })).json()) as Array<{ id: string; name: string }>).find((p) => p.name === PROJECT)!.id;
  const people = (await (await request.get("api/people", { headers: AUTH })).json()) as Array<{ id: string; is_pm: boolean }>;
  return { side, project, person: people.find((p) => p.is_pm)!.id };
}

/** Every main screen the first day shows, by the address after the #. */
export const screens = (day: FirstDay): Array<{ name: string; hash: string; heading: string | RegExp }> => [
  { name: "Today", hash: "today", heading: "Today" },
  { name: "Schedule", hash: "schedule", heading: /./ },
  { name: "Since yesterday", hash: "work/since", heading: /./ },
  { name: "What changed", hash: "work/changed", heading: "What changed" },
  { name: "Handled for you", hash: "work/handled", heading: "Handled for you" },
  { name: "Follow-ups", hash: "work/followups", heading: "Follow-ups" },
  { name: "To-dos and questions", hash: "work/open", heading: "To-dos and questions" },
  { name: "Stages", hash: "work/stages", heading: "Stages" },
  { name: "Projects", hash: "records/projects", heading: "Projects" },
  { name: "The business's page", hash: `records/project/${encodeURIComponent(day.side)}`, heading: SIDE },
  { name: "An empty project's page", hash: `records/project/${encodeURIComponent(day.project)}`, heading: PROJECT },
  { name: "People", hash: "records/people", heading: "People" },
  { name: "The person's own page", hash: `records/person/${encodeURIComponent(day.person)}`, heading: /./ },
  { name: "Files", hash: "records/files", heading: "Files" },
  { name: "Knowledge", hash: "records/knowledge", heading: "Knowledge" },
  { name: "Settings", hash: "settings", heading: "Settings" },
];

/** Opens a screen by its address and waits until it has what it loads: its heading shows and no skeleton is left. */
export async function openScreen(page: Page, hash: string, heading: string | RegExp) {
  await page.evaluate((h) => {
    window.location.hash = h;
  }, hash);
  await expect(page).toHaveURL(new RegExp(`#${hash.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`));
  await expect(page.getByRole("main").getByRole("heading", { level: 1, ...(typeof heading === "string" ? { name: heading, exact: true } : {}) }).first()).toBeVisible(LOADED);
  await expect(page.locator("main [data-skeleton]")).toHaveCount(0, LOADED);
}

export interface Part {
  /** The part's heading, or its name when it has none. */
  name: string;
  /** Whether all it shows is an empty-state message. */
  empty: boolean;
}

/**
 * The parts of the open screen in page order, and whether each shows only an empty-state message. A part is, from the markup:
 * - a named region: a `section`, `article` or `[role=region]` with an `aria-label` or `aria-labelledby` and no other named
 *   region inside it (a region that holds others is their frame, not a part of its own); or
 * - a heading part: a heading (h2 to h4) that does not title a region, with the siblings after it up to the next heading.
 * A part is empty when, with its own heading, its buttons, its hints and its screen-reader text taken away, all that is left
 * are empty-state messages (`[data-empty]`, or an element whose class is `empty`): no row, cell, field, image or other text.
 * A message that stands outside any part (under a screen's title, say) is not one: parts are what the page's headings make.
 */
export async function partsOnScreen(page: Page): Promise<Part[]> {
  return page.evaluate(() => {
    const main = document.querySelector("main");
    if (!main) return [];
    const shown = (el: Element) => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== "hidden";
    const isEmptyMessage = (el: Element) => el.hasAttribute("data-empty") || /(^|[\s_])empty([\s_]|$)/.test(String(el.getAttribute("class") ?? ""));
    const NAMED = "section[aria-label],section[aria-labelledby],article[aria-label],article[aria-labelledby],[role=region][aria-label],[role=region][aria-labelledby]";
    const regions = Array.from(main.querySelectorAll(NAMED)).filter(shown);
    const titled = new Set<string>();
    const nameOf = (el: Element) => {
      const by = el.getAttribute("aria-labelledby");
      const title = by ? document.getElementById(by.split(" ")[0]) : null;
      if (title) titled.add(title.id);
      return (title?.textContent ?? el.getAttribute("aria-label") ?? "").trim();
    };
    const names = new Map(regions.map((r) => [r, nameOf(r)] as const));
    const parted = (r: Element) =>
      Array.from(r.querySelectorAll("h2,h3,h4")).some((h) => shown(h) && !(h.id && titled.has(h.id)));
    // A region that holds others, or headings that part it, is their frame and not a part of its own.
    const leaves = regions.filter((r) => !regions.some((o) => o !== r && r.contains(o)) && !parted(r));
    // What is left of a part once its title, buttons, hints and screen-reader text are taken away.
    const onlyEmpty = (clone: Element) => {
      for (const el of Array.from(clone.querySelectorAll("button,.hint,.sr,[role=status]:empty,h1,h2,h3,h4,svg"))) el.remove();
      let found = false;
      for (const el of Array.from(clone.querySelectorAll("*"))) {
        if (!clone.contains(el) || !isEmptyMessage(el)) continue;
        found = true;
        el.remove();
      }
      if (!found) return false;
      if (clone.querySelector("li,tr,td,th,table,input,select,textarea,img,canvas,label,[role=listitem],[role=row],a")) return false;
      return (clone.textContent ?? "").trim() === "";
    };
    const found: Array<{ at: Element; name: string; empty: boolean }> = [];
    for (const region of leaves) {
      const clone = region.cloneNode(true) as Element;
      found.push({ at: region, name: names.get(region)!, empty: onlyEmpty(clone) });
    }
    for (const heading of Array.from(main.querySelectorAll("h2,h3,h4")).filter(shown)) {
      if (titled.has(heading.id) && heading.id) continue;
      const level = Number(heading.tagName[1]);
      const clone = document.createElement("div");
      for (let next = heading.nextElementSibling; next; next = next.nextElementSibling) {
        if (/^H[1-6]$/.test(next.tagName) && Number(next.tagName[1]) <= level) break;
        clone.appendChild(next.cloneNode(true));
      }
      found.push({ at: heading, name: (heading.textContent ?? "").trim(), empty: onlyEmpty(clone) });
    }
    found.sort((a, b) => (a.at.compareDocumentPosition(b.at) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
    return found.map(({ name, empty }) => ({ name, empty }));
  });
}

/** The runs of three or more parts in a row that each show only an empty-state message, as lists of their names. */
export function emptyRuns(parts: Part[], length = 3): string[][] {
  const runs: string[][] = [];
  let run: string[] = [];
  for (const part of [...parts, { name: "", empty: false }]) {
    if (part.empty) run.push(part.name);
    else {
      if (run.length >= length) runs.push(run);
      run = [];
    }
  }
  return runs;
}
