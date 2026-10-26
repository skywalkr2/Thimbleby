// "Just me" sees no work words (the UI/UX review's F3; roadmap check U4): on a workspace made with no work, whose only side is
// Personal, every main screen is read as a person reads it and none of the words Work, Project, Stage, Organization, Owner or
// Template is in what it shows. The words are the capitalized ones headings, labels, buttons, menus and empty states use, as
// whole words with their plurals; a side's own name could hold one, and this workspace has no side. The server (`--just-me`)
// holds an area of life, a person with their relation, a to-do and a question on Personal, and says what they are called
// at /__e2e/just-me, so no name is written out here. Setting descriptions and other running text come from the app's
// settings and are not part of this check.
import { expect, test, type Page } from "@playwright/test";

const WORK_WORDS = /\b(Work|Projects?|Stages?|Organizations?|Owners?|Templates?)\b/;

/** What a screen's data takes to arrive on a busy computer: each screen is read once it shows what it loads. */
const LOADED = { timeout: 20_000 };

interface Seeded {
  enabled: boolean;
  personal: string;
  area: { name: string };
  person: { name: string; relation: string; address: string };
  todo: { text: string };
  question: { title: string };
}

let seeded: Seeded;

const heading = (page: Page, name: string, level = 1) => expect(page.getByRole("heading", { level, name, exact: true })).toBeVisible(LOADED);
const section = (page: Page, name: string) => expect(page.getByRole("heading", { level: 2, name: new RegExp(`^${name}`) })).toBeVisible(LOADED);

/** What the person can see, from the top of the page to the bottom: the visible text and nothing hidden. */
const visibleText = (page: Page) => page.evaluate(() => document.body.innerText);

/** The main screens of the app, each waited for until it shows what it loads. */
const SCREENS: Array<{ name: string; hash: () => string; ready: (page: Page) => Promise<void> }> = [
  {
    name: "Today",
    hash: () => "today",
    ready: async (page) => {
      await heading(page, "Today");
      // The lines Today holds have been read: there is the one about a backup, as in any workspace that has none.
      await expect(page.locator("[data-queue-line]").first()).toBeVisible(LOADED);
    },
  },
  { name: "What changed", hash: () => "work/changed", ready: (page) => heading(page, "What changed") },
  { name: "Handled for you", hash: () => "work/handled", ready: (page) => heading(page, "Handled for you") },
  { name: "Follow-ups", hash: () => "work/followups", ready: (page) => heading(page, "Follow-ups") },
  {
    name: "To-dos and questions",
    hash: () => "work/open",
    ready: async (page) => {
      await heading(page, "To-dos and questions");
      await expect(page.getByText(seeded.todo.text).first()).toBeVisible(LOADED);
    },
  },
  {
    name: "People",
    hash: () => "records/people",
    ready: async (page) => {
      await heading(page, "People");
      await expect(page.getByText(seeded.person.name).first()).toBeVisible(LOADED);
    },
  },
  {
    name: "Personal",
    hash: () => `records/project/${encodeURIComponent(seeded.personal)}`,
    ready: async (page) => {
      await heading(page, "Personal");
      await expect(page.getByRole("heading", { level: 2, name: "Areas", exact: true })).toBeVisible(LOADED);
      await expect(page.getByRole("link", { name: seeded.area.name })).toBeVisible(LOADED);
    },
  },
  { name: "Files", hash: () => "records/files", ready: (page) => heading(page, "Files") },
  { name: "Connections", hash: () => "settings/connections", ready: (page) => heading(page, "Connections") },
  { name: "Add-ons", hash: () => "settings/addons", ready: (page) => heading(page, "Add-ons") },
  { name: "Settings: You and the workspace", hash: () => "settings/you", ready: (page) => section(page, "You and the workspace") },
  { name: "Settings: AI accounts", hash: () => "settings/ai", ready: (page) => section(page, "AI accounts") },
  { name: "Settings: Backups and sync", hash: () => "settings/backups", ready: (page) => section(page, "Backups and sync") },
  { name: "Settings: Today", hash: () => "settings/today", ready: (page) => section(page, "Today") },
  { name: "Settings: Appearance", hash: () => "settings/appearance", ready: (page) => section(page, "Appearance") },
  { name: "Settings: Lists", hash: () => "settings/lists", ready: (page) => section(page, "Lists") },
];

test.describe('"Just me" sees no work words', () => {
  test.beforeAll(async ({ request }) => {
    seeded = await (await request.get("__e2e/just-me")).json();
    expect(seeded.enabled).toBe(true);
  });

  test.beforeEach(async ({ page }) => {
    await page.goto("?token=e2e-token");
    // The side menu has answered: it lists Personal where a person with work has Projects.
    await expect(page.getByRole("navigation", { name: "Views" }).getByRole("link", { name: "Personal", exact: true })).toBeVisible(LOADED);
  });

  test("the side menu has no Work heading and no Stages or Projects, and Personal is a page of its own", async ({ page }) => {
    const nav = page.getByRole("navigation", { name: "Views" });
    const labels = (await nav.getByRole("link").allInnerTexts()).map((text) => text.replace(/\s*\d+$/, "").trim());
    expect(labels).toEqual([
      "Today",
      "What changed",
      "Handled for you",
      "Follow-ups",
      "To-dos and questions",
      "Personal",
      "People",
      "Files",
      "Knowledge",
      "Settings",
    ]);
    await expect(nav.getByText("Work", { exact: true })).toHaveCount(0);
    await nav.getByRole("link", { name: "Personal", exact: true }).click();
    await heading(page, "Personal");
    await expect(page.getByRole("link", { name: seeded.area.name })).toBeVisible(LOADED);
  });

  test("People shows who they are to you and how to reach them, with no Role, Organization or Organizations", async ({ page }) => {
    await page.evaluate(() => {
      window.location.hash = "records/people";
    });
    await heading(page, "People");
    await expect(page.getByRole("columnheader", { name: "Who they are to you" })).toBeVisible(LOADED);
    await expect(page.getByRole("columnheader", { name: "How to reach" })).toBeVisible(LOADED);
    await expect(page.getByRole("columnheader", { name: /^(Role|Organization)$/ })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: /Organizations/ })).toHaveCount(0);
    await expect(page.getByRole("row", { name: new RegExp(seeded.person.name) })).toContainText(seeded.person.relation);
  });

  test("no main screen shows Work, Project, Stage, Organization, Owner or Template", async ({ page }) => {
    // Fifteen screens, each waited for until it has loaded: a busy computer needs more than a minute.
    test.setTimeout(180_000);
    const found: string[] = [];
    for (const screen of SCREENS) {
      await page.evaluate((hash) => {
        window.location.hash = hash;
      }, screen.hash());
      await screen.ready(page);
      const text = await visibleText(page);
      const words = [...new Set(text.match(new RegExp(WORK_WORDS, "g")) ?? [])];
      if (words.length > 0) found.push(`${screen.name}: ${words.join(", ")}`);
    }
    expect(found).toEqual([]);
  });
});
