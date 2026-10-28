// Every page reached from Settings keeps the Settings side bar, so the person can go from any page to any other without
// choosing Settings again; and none of them is wider than the window.
import { expect, test, type Page } from "@playwright/test";

const LOADED = { timeout: 20_000 };
const WIDTHS = [
  { width: 390, height: 844 },
  { width: 1024, height: 768 },
  { width: 1512, height: 982 },
];

const bar = (page: Page) => page.getByRole("navigation", { name: "Settings sections" });

const wide = (page: Page) =>
  page.evaluate(() => ({ window: window.innerWidth, page: document.documentElement.scrollWidth, body: document.body.scrollWidth }));

async function notWider(page: Page, where: string) {
  const found = await wide(page);
  expect(found.page, `${where}: page`).toBeLessThanOrEqual(found.window);
  expect(found.body, `${where}: body`).toBeLessThanOrEqual(found.window);
}

test("every Settings page keeps the side bar, and the person can go back to any other", async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto("?token=e2e-token#settings/you");
  await expect(bar(page).getByRole("link", { name: "Advanced", exact: true })).toBeVisible(LOADED);
  // The Lists page is listed once the lists have loaded, so the names are read after it shows.
  await expect(bar(page).getByRole("link", { name: "Lists", exact: true })).toBeVisible(LOADED);
  const names = (await bar(page).getByRole("link").allTextContents()).map((n) => n.trim());
  expect(names.length).toBeGreaterThan(4);
  expect(names).toContain("Connections");
  expect(names).toContain("Add-ons");
  // The pages of basic settings come first, in plain words, then Quick links; Quality is in the person's menu, not here.
  expect(names.slice(0, 6)).toEqual(["You", "AI and spending", "Notices", "Backups", "Appearance", "Quick links"]);
  expect(names).not.toContain("Quality");
  // This workspace has no side and has lists to show, so the Lists page is listed, and there is no business page.
  expect(names).toContain("Lists");
  expect(names).not.toContain("Your business");

  for (const size of WIDTHS) {
    await page.setViewportSize(size);
    // Out through each link of the side bar and back to the first section: the bar is there each time.
    for (const name of names) {
      await bar(page).getByRole("link", { name, exact: true }).click();
      await expect(bar(page), `${name} at ${size.width}`).toBeVisible(LOADED);
      await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible(LOADED);
      await notWider(page, `${name} at ${size.width}`);
      await bar(page).getByRole("link", { name: names[0], exact: true }).click();
      await expect(bar(page).getByRole("link", { name: names[0], exact: true })).toHaveAttribute("aria-current", "page", LOADED);
    }
  }
});

test("Connections, Add-ons and what each account can do open inside Settings", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("?token=e2e-token#settings/you");
  await expect(bar(page)).toBeVisible(LOADED);
  await bar(page).getByRole("link", { name: "Connections", exact: true }).click();
  await expect(page.getByRole("heading", { level: 2, name: "Connections", exact: true })).toBeVisible(LOADED);
  await expect(bar(page)).toBeVisible();
  await bar(page).getByRole("link", { name: "Appearance", exact: true }).click();
  await expect(bar(page).getByRole("link", { name: "Appearance", exact: true })).toHaveAttribute("aria-current", "page", LOADED);

  await page.goto("?token=e2e-token#settings/ai-compare");
  await expect(bar(page)).toBeVisible(LOADED);
  await notWider(page, "what each account can do");
  await page.goto("?token=e2e-token#settings/addons");
  await expect(bar(page)).toBeVisible(LOADED);
  await notWider(page, "Add-ons");
  // The old addresses of the two screens open their sections, and the address says where they went.
  await page.goto("?token=e2e-token#addons");
  await expect(page.getByRole("heading", { level: 2, name: "Add-ons", exact: true })).toBeVisible(LOADED);
  expect(new URL(page.url()).hash).toBe("#settings/addons");
  await page.goto("?token=e2e-token#sources");
  await expect(page.getByRole("heading", { level: 2, name: "Connections", exact: true })).toBeVisible(LOADED);
  expect(new URL(page.url()).hash).toBe("#settings/connections");
});

// The settings walk: the rows on the pages of basic settings and behind Advanced are few, in plain words, and none shows a
// key, an id or a word of the files (the Settings cut).
const FILE_WORDS = /^Ui |^Watch |^Steward |PRJ-|PER-|tasks\.|json|tier/;
const MOST_LABEL = 60;
// A hint never carries a code-like id ("ai: ...", "env:NAME") or a word a person with no work tool never sees.
const CODE_ID = /\b[A-Za-z_]+:(?!\/\/)/;
const JUST_ME_WORDS = /\b(work|project|stage|organization|owner|template)s?\b/i;
// What a fresh workspace counts on its pages: the working hours, the quiet hours and the one notices switch make room for
// Your name. Where reminders go is one row, drawn by a part of its own that is no `.setting`.
const BASIC_ROWS = 18;
// The rarely changed settings sit in each page's closed "More settings" fold, and under the topics of Advanced that have no
// page. The chat or phone app's address and the pick list of the app it belongs to are two parts of one card, neither a
// `.setting`, so they are two rows more than the `.setting` rows. With no side beside Personal the words that mean each side
// are not listed while there is no side, so this workspace's total is the python walk's 30 less those two.
const MORE_ROWS = 28;
const SHOWN = ".setting:not(details.more-settings .setting)";
const FOLDED = "details.more-settings .setting";

test("the settings walk counts 18 shown and 28 more rows, each labelled in plain words once, with a hint in plain words", async ({ page }) => {
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("?token=e2e-token#settings/you");
  await expect(bar(page).getByRole("link", { name: "Advanced", exact: true })).toBeVisible(LOADED);
  const names = (await bar(page).getByRole("link").allTextContents()).map((n) => n.trim());
  const labels: string[] = [];
  const headings: string[] = [];
  const hints: string[] = [];
  let basic = 0;
  let more = 0;
  for (const name of ["You", "AI and spending", "Notices", "Backups", "Appearance", "Your business"]) {
    if (!names.includes(name)) continue;
    await bar(page).getByRole("link", { name, exact: true }).click();
    await expect(page.getByRole("heading", { level: 2 }).first()).toBeVisible(LOADED);
    basic += await page.locator(SHOWN).count();
    labels.push(...(await page.locator(`${SHOWN} .setting-label`).allTextContents()));
    hints.push(...(await page.locator(`${SHOWN} .setting-help .hint:not([id$='-default'])`).allTextContents()));
    headings.push(...(await page.locator("main h2, main h3").allTextContents()));
    // Your name is the first row of You; the setup guide link is on You only.
    if (name === "You") {
      await expect(page.locator(".setting").first().getByLabel("Your name")).toBeVisible(LOADED);
      await expect(page.getByRole("button", { name: "Open the setup guide" })).toBeVisible();
    } else {
      await expect(page.getByRole("button", { name: "Open the setup guide" })).toHaveCount(0);
    }
    // Working hours are one row on Notices.
    if (name === "Notices") {
      await expect(page.getByRole("group", { name: "Working hours" })).toHaveCount(1);
      // Where reminders go loads by itself, so it is waited for before it is counted as the one row it is.
      await expect(page.getByRole("heading", { level: 3, name: "Where reminders reach you when the app isn't open" })).toHaveCount(1, LOADED);
      basic += 1;
    }
    // The rarely changed settings are in one closed fold at the foot of the page, and it is the last thing on it.
    const fold = page.locator("details.more-settings");
    if (await fold.count()) {
      await expect(fold).toHaveCount(1);
      await expect(fold).not.toHaveAttribute("open", /.*/);
      await expect(fold.locator("summary")).toHaveText("More settings");
      const last = await page.evaluate(() => {
        const content = document.querySelector(".settings-content");
        const folds = content ? Array.from(content.children).filter((c) => c.tagName !== "SCRIPT") : [];
        const end = folds[folds.length - 1];
        return end?.matches("details.more-settings") ?? false;
      });
      expect(last, `${name}: the fold is last`).toBe(true);
      await fold.locator("summary").click();
      more += await page.locator(FOLDED).count();
      labels.push(...(await page.locator(`${FOLDED} .setting-label`).allTextContents()));
      hints.push(...(await page.locator(`${FOLDED} .setting-help .hint:not([id$='-default'])`).allTextContents()));
      // The notices' address is a part of the fold on Notices, not a topic of Advanced.
      if (name === "Notices") await expect(fold.locator(".notice-targets")).toHaveCount(1);
    }
  }
  expect(basic).toBe(BASIC_ROWS);
  expect(basic).toBeLessThanOrEqual(26);

  await bar(page).getByRole("link", { name: "Advanced", exact: true }).click();
  const toggles = page.locator(".settings-topic .topic-toggle");
  await expect(toggles.first()).toBeVisible(LOADED);
  // Advanced keeps only the topics that have no page of their own; the others are in their page's fold.
  const topics = (await toggles.allTextContents()).map((t) => t.trim());
  expect(topics).toEqual(["What the assistant learns", "Follow-ups and reminders", "Mail", "Meetings"]);
  expect(topics).not.toContain("Filing");
  for (const topic of ["AI and spending", "Backups", "Appearance", "Notices"]) expect(topics).not.toContain(topic);
  for (let n = 0; n < topics.length; n += 1) {
    headings.push(topics[n]);
    if ((await toggles.nth(n).getAttribute("aria-expanded")) !== "true") await toggles.nth(n).click();
  }
  await expect(page.locator(".settings-topic .notice-targets")).toHaveCount(0);
  more += await page.locator(".settings-topic .setting").count();
  expect(more + 2).toBe(MORE_ROWS);
  hints.push(...(await page.locator(".settings-topic .setting .setting-help .hint:not([id$='-default'])").allTextContents()));
  labels.push(...(await page.locator(".settings-topic .setting .setting-label").allTextContents()));

  for (const label of labels.map((l) => l.trim()).filter(Boolean)) {
    expect(label.length, label).toBeLessThanOrEqual(MOST_LABEL);
    expect(label, label).not.toMatch(FILE_WORDS);
  }
  // No setting's name appears twice anywhere in Settings: not on a page and again in its fold or under Advanced.
  const seen = labels.map((l) => l.trim().toLowerCase()).filter(Boolean);
  const twice = seen.filter((l, i) => seen.indexOf(l) !== i);
  expect(twice).toEqual([]);
  for (const heading of headings.map((h) => h.trim()).filter(Boolean)) expect(heading, heading).not.toMatch(FILE_WORDS);
  for (const hint of hints.map((h) => h.trim()).filter(Boolean)) {
    expect(hint, hint).not.toMatch(CODE_ID);
    expect(hint, hint).not.toMatch(FILE_WORDS);
    expect(hint, hint).not.toMatch(JUST_ME_WORDS);
    expect(hint, hint).not.toMatch(/\bbrowsers?\b/i);
  }
});

test("every page of Settings is built in one frame: the same title, search and side bar in the same place and the same column widths", async ({ page }) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("?token=e2e-token#settings/you");
  await expect(bar(page)).toBeVisible(LOADED);
  const names = (await bar(page).getByRole("link").allTextContents()).map((n) => n.trim());
  expect(names).toContain("Connections");
  expect(names).toContain("Add-ons");
  const frames: Array<{ name: string; title: number[]; search: number[]; side: number[]; content: number[] }> = [];
  const box = async (selector: string) => {
    const found = await page.locator(selector).first().boundingBox();
    return found ? [Math.round(found.x), Math.round(found.y), Math.round(found.width)] : [];
  };
  for (const name of names) {
    await bar(page).getByRole("link", { name, exact: true }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Settings", exact: true })).toBeVisible(LOADED);
    // Each page has exactly one title, one search box and one side bar, and its own section heading under the title.
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.getByRole("searchbox", { name: "Search settings" })).toHaveCount(1);
    await expect(bar(page)).toHaveCount(1);
    await expect(page.locator(".settings-content")).toHaveCount(1, LOADED);
    frames.push({
      name,
      title: await box("main h1"),
      search: await box(".settings-side .field"),
      side: await box(".settings-nav"),
      content: await box(".settings-content"),
    });
  }
  for (const f of frames) {
    expect(f.title, `${f.name}: title`).toEqual(frames[0].title);
    expect(f.search, `${f.name}: search`).toEqual(frames[0].search);
    expect(f.side.slice(0, 1), `${f.name}: side bar`).toEqual(frames[0].side.slice(0, 1));
    // The content starts at the same place and is as wide on every page.
    expect(f.content.slice(0, 1), `${f.name}: content`).toEqual(frames[0].content.slice(0, 1));
    expect(f.content[2], `${f.name}: content width`).toBe(frames[0].content[2]);
  }
});

test("the search on Connections and Add-ons opens the Settings results for what was typed", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("?token=e2e-token#settings/connections");
  await expect(page.getByRole("heading", { level: 2, name: "Connections", exact: true })).toBeVisible(LOADED);
  const search = page.getByRole("searchbox", { name: "Search settings" });
  await search.fill("time zone");
  await expect(search).toBeFocused();
  expect(new URL(page.url()).hash).toBe("#settings/you");
  await expect(page.locator(".settings-results").first()).toBeVisible(LOADED);
  await expect(search).toHaveValue("time zone");
});

test("Add-ons holds the catalog settings in a closed More settings fold, and Knowledge holds the person's own words", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("?token=e2e-token#settings/addons");
  const fold = page.locator("details.developer-settings");
  await expect(fold).toHaveCount(1, LOADED);
  await expect(fold).not.toHaveAttribute("open", /.*/);
  await fold.locator("summary").click();
  await expect(page.getByLabel("List add-ons from catalogs")).toBeVisible();
  await expect(page.getByRole("group", { name: "Access keys for private downloads" })).toBeVisible();
  await notWider(page, "Add-ons, More settings");
  await page.goto("?token=e2e-token#records/knowledge");
  await expect(page.getByRole("heading", { level: 2, name: "Your words" })).toBeVisible(LOADED);
  await expect(page.getByLabel("A word", { exact: true })).toBeVisible();
  await expect(page.getByLabel("What it means")).toBeVisible();
  await notWider(page, "Knowledge");
});

test("How the assistant is doing is in the person's menu, and opens the page headed the same without the Settings side bar", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("?token=e2e-token");
  await page.getByRole("button", { name: /^Change appearance, / }).click();
  await page.getByRole("menuitem", { name: /^How .+ is doing$/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: /^How .+ is doing$/ })).toBeVisible(LOADED);
  expect(new URL(page.url()).hash).toBe("#quality");
  await expect(bar(page)).toHaveCount(0);
});
