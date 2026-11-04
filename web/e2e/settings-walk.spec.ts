// Every page reached from Settings keeps the Settings side bar, so the person can go from any page to any other without
// choosing Settings again; and none of them is wider than the window.
import { expect, test, type Page } from "@playwright/test";
import { settingsSections } from "./journey-helpers";

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
  await expect((await settingsSections(page)).getByRole("link", { name: "Advanced", exact: true })).toBeVisible(LOADED);
  // The Lists page is listed once the lists have loaded, so the names are read after it shows.
  await expect((await settingsSections(page)).getByRole("link", { name: "Lists", exact: true })).toBeVisible(LOADED);
  const names = (await (await settingsSections(page)).getByRole("link").allTextContents()).map((n) => n.trim());
  expect(names.length).toBeGreaterThan(4);
  expect(names).toContain("Connections");
  expect(names).toContain("Add-ons");
  // Pages stay in their groups: You, Assistant, Your data, then More; Quality is in the person's menu, not here.
  expect(names.slice(0, 6)).toEqual(["You", "Your business", "AI and spending", "Notices", "Connections", "Backups"]);
  expect(names).not.toContain("Quality");
  // This workspace has no side and has lists to show, so the Lists page is listed; the business page is there too, where a job or
  // a business is added.
  expect(names).toContain("Lists");
  expect(names).toContain("Your business");

  for (const size of WIDTHS) {
    await page.setViewportSize(size);
    // Out through each link of the side bar and back to the first section: the bar is there each time.
    for (const name of names) {
      await (await settingsSections(page)).getByRole("link", { name, exact: true }).click();
      await expect(bar(page), `${name} at ${size.width}`).toBeVisible(LOADED);
      await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible(LOADED);
      await notWider(page, `${name} at ${size.width}`);
      await (await settingsSections(page)).getByRole("link", { name: names[0], exact: true }).click();
      await expect((await settingsSections(page)).getByRole("link", { name: names[0], exact: true })).toHaveAttribute("aria-current", "page", LOADED);
    }
  }
});

test("the Settings menu groups its sections and keeps each section address", async ({ page }) => {
  await page.goto("?token=e2e-token#settings/you");
  const nav = bar(page);
  await expect(nav.getByRole("link", { name: "Advanced", exact: true })).toBeVisible(LOADED);
  await expect(nav.getByRole("heading", { level: 3 })).toHaveText([
    "About you",
    "Assistant",
    "Your data",
    "More",
  ]);
  for (const [name, section] of [
    ["You", "you"],
    ["AI and spending", "ai"],
    ["Connections", "connections"],
    ["Backups", "backups"],
    ["Add-ons", "addons"],
    ["Appearance", "appearance"],
    ["Advanced", "advanced"],
  ]) {
    await expect(nav.getByRole("link", { name, exact: true })).toHaveAttribute(
      "href",
      new RegExp(`#settings/${section}$`),
    );
  }
});

test("Connections, Add-ons and what each account can do open inside Settings", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("?token=e2e-token#settings/you");
  await expect(bar(page)).toBeVisible(LOADED);
  await (await settingsSections(page)).getByRole("link", { name: "Connections", exact: true }).click();
  await expect(page.getByRole("heading", { level: 2, name: "Connections", exact: true })).toBeVisible(LOADED);
  await expect(bar(page)).toBeVisible();
  await (await settingsSections(page)).getByRole("link", { name: "Appearance", exact: true }).click();
  await expect((await settingsSections(page)).getByRole("link", { name: "Appearance", exact: true })).toHaveAttribute("aria-current", "page", LOADED);

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
// Appearance adds three to it: how times of day are written, the minutes between the times a time box lists, and the rows of
// Today's side column (change log 319).
const BASIC_ROWS = 20;
// The rarely changed settings sit in each page's closed "More settings" fold, and under the topics of Advanced that have no
// page. The chat or phone app's address and the pick list of the app it belongs to are two parts of one card, neither a
// `.setting`, so they are two rows more than the `.setting` rows. The synced folder and its sharing choice live in their own
// section rather than as settings rows. With no side beside Personal, the words that mean each side are not listed.
const MORE_ROWS = 27;
const SHOWN = ".setting:not(details.more-settings .setting)";
const FOLDED = "details.more-settings .setting";

test("the settings walk counts 20 shown and 27 more rows, each labelled in plain words once, with a hint in plain words", async ({ page }) => {
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("?token=e2e-token#settings/you");
  await expect((await settingsSections(page)).getByRole("link", { name: "Advanced", exact: true })).toBeVisible(LOADED);
  const names = (await (await settingsSections(page)).getByRole("link").allTextContents()).map((n) => n.trim());
  const labels: string[] = [];
  const headings: string[] = [];
  const hints: string[] = [];
  let basic = 0;
  let more = 0;
  for (const name of ["You", "AI and spending", "Notices", "Backups", "Appearance", "Your business"]) {
    if (!names.includes(name)) continue;
    await (await settingsSections(page)).getByRole("link", { name, exact: true }).click();
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
    // The rarely changed settings are in one closed fold at the foot of the page, and it is the last thing on it but the line that says Saving….
    const fold = page.locator("details.more-settings");
    if (await fold.count()) {
      await expect(fold).toHaveCount(1);
      await expect(fold).not.toHaveAttribute("open", /.*/);
      await expect(fold.locator("summary")).toHaveText("More settings");
      const last = await page.evaluate(() => {
        const content = document.querySelector(".settings-content");
        const folds = content ? Array.from(content.children).filter((c) => c.tagName !== "SCRIPT" && !c.hasAttribute("data-save-status")) : [];
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

  await (await settingsSections(page)).getByRole("link", { name: "Advanced", exact: true }).click();
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
  const names = (await (await settingsSections(page)).getByRole("link").allTextContents()).map((n) => n.trim());
  expect(names).toContain("Connections");
  expect(names).toContain("Add-ons");
  const frames: Array<{ name: string; title: number[]; search: number[]; side: number[]; content: number[] }> = [];
  const once = async (selector: string) => {
    const found = await page.locator(selector).first().boundingBox();
    return found ? [Math.round(found.x), Math.round(found.y), Math.round(found.width)] : [];
  };
  // A page's frame is measured once its layout has settled (the same box on three reads a short while apart), so a page
  // still filling in on a busy machine is not measured half-built. What is compared is unchanged.
  const box = async (selector: string) => {
    // The page's own faces must have loaded: a title measured in the fallback face is wider than the same title later.
    await page.evaluate(() => document.fonts.ready.then(() => undefined));
    let last = await once(selector);
    let same = 0;
    for (let tries = 0; tries < 100 && same < 3; tries++) {
      await page.waitForTimeout(50);
      const now = await once(selector);
      same = JSON.stringify(now) === JSON.stringify(last) ? same + 1 : 0;
      last = now;
    }
    return last;
  };
  for (const name of names) {
    await (await settingsSections(page)).getByRole("link", { name, exact: true }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Settings", exact: true })).toBeVisible(LOADED);
    // Each page has exactly one title, one search box and one side bar, and its own section heading under the title.
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.getByRole("searchbox", { name: "Search settings" })).toHaveCount(1);
    await expect(bar(page)).toHaveCount(1);
    await expect(page.locator(".settings-content")).toHaveCount(1, LOADED);
    frames.push({
      name,
      title: await box("main h1"),
      search: await box(".settings-side [data-field]"),
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
  await page.getByRole("button", { name: /^Menu for / }).click();
  await page.getByRole("menuitem", { name: /^How .+ is doing$/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: /^How .+ is doing$/ })).toBeVisible(LOADED);
  expect(new URL(page.url()).hash).toBe("#quality");
  await expect(bar(page)).toHaveCount(0);
});

// A table rule in one CSS module once reached every table's first cell (a third of the width), so a connection's name and
// facts were squeezed into a narrow column on a phone. Connections is cards now: measured, a connection's words take the card's
// width beside its icon and menu, and a records table is not cut while the window has room.
test("on a phone a connection's name takes the row's width, and a records table is not cut while the window has room", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("?token=e2e-token#settings/connections");
  const first = page.locator("[data-connection-card] [data-source-row]").first().locator("p").first();
  await expect(first).toBeVisible(LOADED);
  const cell = (await first.boundingBox())!;
  const row = (await page.locator("[data-connection-card] [data-source-row]").first().boundingBox())!;
  expect(cell.width).toBeGreaterThan(row.width * 0.5);
  expect(await page.locator(".source-table").count()).toBe(0);
  await notWider(page, "Connections on a phone");
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("?token=e2e-token#records/projects");
  const heads = page.locator("table thead th");
  await expect(heads.first()).toBeVisible(LOADED);
  // No header is cut to an ellipsis: each is as wide as its own text.
  for (const head of await heads.all()) {
    const fits = await head.evaluate((el) => el.scrollWidth <= el.clientWidth + 1);
    expect(fits, `${await head.textContent()} is cut`).toBe(true);
  }
});

// A group label in the side list sits close above its own links and well apart from the group before it, so a link never reads as
// being under the wrong label (measured: the gap above each label is at least half again the gap below it).
test("each group label of the side list has more room above it than below it", async ({ page }) => {
  await page.setViewportSize({ width: 1512, height: 982 });
  await page.goto("?token=e2e-token#settings/you");
  const nav = bar(page);
  await expect(nav.getByRole("link", { name: "Advanced", exact: true })).toBeVisible(LOADED);
  const gaps = await nav.evaluate((root) =>
    Array.from(root.querySelectorAll<HTMLElement>(".settings-nav-group")).map((group, n, all) => {
      const label = group.querySelector<HTMLElement>("[data-group-label]")!.getBoundingClientRect();
      const first = group.querySelector<HTMLElement>("a")!.getBoundingClientRect();
      const before = n === 0 ? null : all[n - 1].querySelectorAll<HTMLElement>("a");
      const last = before ? before[before.length - 1].getBoundingClientRect() : null;
      return { above: last ? label.top - last.bottom : null, below: first.top - label.bottom };
    }),
  );
  expect(gaps.length).toBeGreaterThanOrEqual(3);
  for (const g of gaps.slice(1)) expect(g.above!, JSON.stringify(g)).toBeGreaterThanOrEqual(g.below * 1.5);
});

// A disabled radio keeps its whole outline: its ring against the page is at least 3:1, so it reads as a control that is off,
// never as one that is missing.
test("a disabled radio's ring can be seen against the page (at least 3 to 1)", async ({ page }) => {
  await page.goto("?token=e2e-token#settings/today");
  const radio = page.locator('input[type="radio"]:disabled').first();
  await expect(radio).toBeAttached(LOADED);
  const colors = await radio.evaluate((el) => {
    const ring = getComputedStyle(el, "::before").borderTopColor;
    let node: HTMLElement | null = el.parentElement;
    let back = "rgba(0, 0, 0, 0)";
    while (node && /rgba\(.*, 0\)$|transparent/.test(back)) {
      back = getComputedStyle(node).backgroundColor;
      node = node.parentElement;
    }
    return { ring, back };
  });
  const rgb = (css: string) => (css.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
  const lum = ([r, g, b]: number[]) => {
    const f = (v: number) => ((v / 255) <= 0.03928 ? v / 255 / 12.92 : (((v / 255) + 0.055) / 1.055) ** 2.4);
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const [a, b] = [lum(rgb(colors.ring)), lum(rgb(colors.back))].sort((x, y) => y - x);
  expect((a + 0.05) / (b + 0.05), JSON.stringify(colors)).toBeGreaterThanOrEqual(3);
});

// On a phone the accounts the assistant can act on put each account's words across the row, and its switch under them; the
// section picker is followed by the page with no dead band; the working hours are two pairs, each on a line of its own.
test("on a phone an account row's switch sits under its words, the picker is followed by the page, and each pair of hours is on one line", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/api/acts/accounts", (route) =>
    route.fulfill({
      json: {
        accounts: ["one", "two"].map((id) => ({ id: `mailbox:${id}`, label: `Example mail (${id}@example.com)`, acting: false, sign_in: `demo/${id}`, can_act: true })),
      },
    }),
  );
  await page.goto("?token=e2e-token#settings/you");
  const row = page.locator("[data-acting-accounts] li").first();
  await expect(row).toBeVisible(LOADED);
  const words = (await row.locator("strong").boundingBox())!;
  const hint = (await row.locator("p").boundingBox())!;
  const box = (await row.getByRole("checkbox").boundingBox())!;
  expect(hint.width).toBeGreaterThan(250);
  expect(box.y).toBeGreaterThanOrEqual(hint.y + hint.height - 1);
  expect(box.y).toBeGreaterThan(words.y);
  // The picker is one row with a down chevron's room at its end, and the first setting follows within a normal gap.
  const picker = (await page.locator(".settings-picker > summary").boundingBox())!;
  const firstRow = (await page.locator(".setting").first().boundingBox())!;
  expect(firstRow.y - (picker.y + picker.height)).toBeLessThan(28);
  await notWider(page, "You on a phone");
  await page.goto("?token=e2e-token#settings/today");
  const hours = page.getByRole("group", { name: "Working hours" });
  await expect(hours).toBeVisible(LOADED);
  const tops = await hours.getByRole("combobox").evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)));
  expect(tops).toHaveLength(4);
  expect(tops[0]).toBe(tops[1]);
  expect(tops[2]).toBe(tops[3]);
  expect(tops[2]).toBeGreaterThan(tops[0]);
});

// A page reached from a section's own page (what each account can do) has its way back on the page, so a phone does not also show
// the row of sections above it; a window with the side list keeps the list.
test("the compare page has no section row on a phone, and the side list on a wide window", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("?token=e2e-token#settings/ai-compare");
  await expect(page.getByRole("button", { name: "Back to AI and spending" })).toBeVisible(LOADED);
  await expect(page.locator(".settings-picker")).toHaveCount(0);
  await expect(bar(page)).toHaveCount(0);
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(bar(page)).toBeVisible(LOADED);
});

// The intro under the title is one muted line of 13px, and the line that says Saving… is under the page, not between the heading and its first row.
test("the Settings intro is one 13px line, and the saving line comes after the page's rows", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("?token=e2e-token#settings/you");
  const intro = page.locator(".settings-intro");
  await expect(intro).toBeVisible(LOADED);
  const look = await intro.evaluate((el) => ({ size: getComputedStyle(el).fontSize, lines: Math.round(el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight)) }));
  expect(look).toEqual({ size: "13px", lines: 1 });
  const rows = (await page.locator(".setting").last().boundingBox())!;
  const status = (await page.locator("[data-save-status]").boundingBox())!;
  expect(status.y).toBeGreaterThanOrEqual(rows.y + rows.height - 1);
});

// A headed group of a page (AI spending) has a rule above its heading, as the rows under it have rules of their own: the two blocks
// of the AI page are told apart, and the heading does not draw a second rule under itself.
test("the AI page sets its spending group off with a rule above the heading", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("?token=e2e-token#settings/ai");
  const group = page.locator(".settings-group[aria-labelledby]").first();
  await expect(group).toBeVisible(LOADED);
  const look = await group.evaluate((el) => ({
    above: getComputedStyle(el).borderTopWidth,
    firstRow: getComputedStyle(el.querySelector(".setting")!).borderTopWidth,
  }));
  expect(look).toEqual({ above: "1px", firstRow: "0px" });
});

// The page of an add-on in the side list is a nested link; its selected fill starts at the same edge as the other links' fill.
test("the selected link of an add-on's page starts where the selected link of any other page starts", async ({ page }) => {
  await page.setViewportSize({ width: 1512, height: 982 });
  await page.goto("?token=e2e-token#settings/connections");
  const selected = async () => (await bar(page).locator("a[aria-current='page']").boundingBox())!;
  await expect(bar(page).locator("a[aria-current='page']")).toBeVisible(LOADED);
  const plain = await selected();
  const nested = bar(page).locator(".settings-nav-sublist a").first();
  await expect(nested).toBeVisible(LOADED);
  await nested.click();
  await expect(bar(page).locator(".settings-nav-sublist a[aria-current='page']")).toBeVisible(LOADED);
  const inner = await selected();
  expect(Math.abs(inner.x - plain.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(inner.width - plain.width)).toBeLessThanOrEqual(1);
});
