// "Just me" sees no work words (the UI/UX review's F3 and the reviewer's follow-up; roadmap check U4): on a workspace made with
// no work, whose only side is Personal, every screen is read as a person reads it and none of the words Work, Project, Stage,
// Organization, Owner, Template, Action or "report to" is in what it shows, in any case, nor "workspace". The screens are the main
// ones, each setup screen and Done, the forms (a to-do, a file, handing something in), a row's menu, Knowledge, Quality, Ask
// and a record's own page. The words are whole words with their plurals; a side's own name could hold one, and this
// workspace has no side. The server (`--just-me`) holds an area of life, a person with their relation, a to-do and a
// question on Personal, and says what they are called at /__e2e/just-me, so no name is written out here.
import { expect, test, type Page } from "@playwright/test";

// Work is only its capitalized heading ("Back up your work" is ordinary speech); the rest are work concepts in any case. The
// words for running work for others: a project, a stage, an organization, an owner, a template, an action (a to-do is the
// person's word) and whom one reports to.
const WORK_WORDS = /\b(Work|[Pp]rojects?|[Ss]tages?|[Oo]rgani[sz]ations?|[Oo]wners?|[Tt]emplates?|[Aa]ctions?|[Ww]orkspaces?|[Rr]eport(?:s|ing)? to)\b/;

/** What a screen's data takes to arrive on a busy computer: each screen is read once it shows what it loads. */
const LOADED = { timeout: 20_000 };

interface Seeded {
  enabled: boolean;
  personal: string;
  area: { id: string; name: string };
  person: { id: string; name: string; relation: string; address: string };
  todo: { id: string; text: string };
  question: { id: string; title: string };
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
  // The screen that lists the person's projects is for a person who runs work; for one with only their own life, the address
  // still lands on a page that reads as theirs.
  { name: "Where things are filed", hash: () => "records/projects", ready: (page) => expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible(LOADED) },
  { name: "Schedule", hash: () => "schedule", ready: (page) => heading(page, "Schedule") },
  { name: "Knowledge", hash: () => "records/knowledge", ready: (page) => heading(page, "Knowledge") },
  { name: "Files", hash: () => "records/files", ready: (page) => heading(page, "Files") },
  { name: "Connections", hash: () => "settings/connections", ready: (page) => heading(page, "Connections", 2) },
  { name: "Add-ons", hash: () => "settings/addons", ready: (page) => heading(page, "Add-ons", 2) },
  { name: "Settings: You", hash: () => "settings/you", ready: (page) => section(page, "You") },
  { name: "Settings: AI accounts", hash: () => "settings/ai", ready: (page) => section(page, "AI accounts") },
  { name: "Settings: Backups", hash: () => "settings/backups", ready: (page) => section(page, "Backups") },
  { name: "Settings: Notices", hash: () => "settings/today", ready: (page) => section(page, "Notices") },
  { name: "Settings: Appearance", hash: () => "settings/appearance", ready: (page) => section(page, "Appearance") },
  { name: "Settings: Quick links", hash: () => "settings/links", ready: (page) => section(page, "Quick links") },
];

/** The words a screen shows that a person with no work must not see, each once. "Work week" is the calendar's own name for
 * Monday to Friday, which any calendar has, so it isn't read as the word. */
const workWordsIn = (text: string) => {
  const found = new Map<string, string>();
  text = text.replace(/Work week/g, "Weekdays");
  for (const hit of text.matchAll(new RegExp(WORK_WORDS, "g"))) {
    if (found.has(hit[0])) continue;
    const at = hit.index ?? 0;
    found.set(hit[0], `${hit[0]} (…${text.slice(Math.max(0, at - 24), at + hit[0].length + 24).replace(/\s+/g, " ")}…)`);
  }
  return [...found.values()];
};

/** Reads the visible text once the screen has stopped changing: what loads in answers is in it. */
async function settledText(page: Page): Promise<string> {
  let last = await visibleText(page);
  for (let i = 0; i < 12; i += 1) {
    await page.waitForTimeout(250);
    const now = await visibleText(page);
    if (now === last) return now;
    last = now;
  }
  return last;
}

const go = (page: Page, hash: string) =>
  page.evaluate((to) => {
    window.location.hash = to;
  }, hash);

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

  test("People shows who they are and how to reach them, with no Role, Organization or Organizations", async ({ page }) => {
    await page.evaluate(() => {
      window.location.hash = "records/people";
    });
    await heading(page, "People");
    await expect(page.getByRole("columnheader", { name: "Who they are" })).toBeVisible(LOADED);
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
      const words = workWordsIn(await visibleText(page));
      if (words.length > 0) found.push(`${screen.name}: ${words.join(", ")}`);
    }
    expect(found).toEqual([]);
  });

  test("no setup screen, and not Done, shows them", async ({ page }) => {
    test.setTimeout(240_000);
    const found: string[] = [];
    await go(page, "setup");
    await expect(page.locator("[data-walkthrough]")).toBeVisible(LOADED);
    // A setup that has not begun opens on Welcome, whose one button starts it.
    const start = page.getByRole("button", { name: "Start", exact: true });
    if (await start.isVisible()) {
      const words = workWordsIn(await settledText(page));
      if (words.length > 0) found.push(`Welcome: ${words.join(", ")}`);
      await start.click();
    }
    // The last screen is "Done" once every counted step is, and "Where things stand" before that.
    const steps: Array<[string, string | RegExp]> = [
      ["you", "You"],
      ["work", "What it's for"],
      ["ai", "Your AI account"],
      ["mail", "Mail and calendar"],
      ["promises", "Your promises"],
      ["backup", "Backups"],
      ["people", "People"],
      ["done", /^(Done|Where things stand)$/],
    ];
    for (const [id, title] of steps) {
      await page.locator(`nav button[data-screen="${id}"]`).click();
      await expect(page.getByRole("heading", { level: 2, name: title, exact: typeof title === "string" })).toBeVisible(LOADED);
      const words = workWordsIn(await settledText(page));
      if (words.length > 0) found.push(`${id}: ${words.join(", ")}`);
    }
    expect(found).toEqual([]);
    // Leave setup as a person would: a setup left partway through opens again where it was on the next visit, and the
    // tests after this one start from Today.
    await page.getByRole("button", { name: "Finish later", exact: true }).click();
    await expect(page.locator("[data-walkthrough]")).toHaveCount(0, LOADED);
  });

  test("no form, menu, Knowledge, Quality, Ask or record page shows them", async ({ page }) => {
    test.setTimeout(300_000);
    const found: string[] = [];
    const read = async (name: string) => {
      const words = workWordsIn(await settledText(page));
      if (words.length > 0) found.push(`${name}: ${words.join(", ")}`);
    };
    const close = async () => {
      await page.keyboard.press("Escape");
    };

    // To-dos: the form to add one, and the menu of a row.
    await go(page, "work/open");
    await expect(page.getByText(seeded.todo.text).first()).toBeVisible(LOADED);
    await page.getByRole("button", { name: "Add a to-do" }).first().click();
    await expect(page.getByRole("dialog", { name: "Add a to-do" })).toBeVisible(LOADED);
    await read("Add a to-do");
    await close();
    await expect(page.getByRole("dialog", { name: "Add a to-do" })).toHaveCount(0);
    await page.getByRole("button", { name: new RegExp(`^More actions for ${seeded.todo.text}`) }).first().click();
    await expect(page.getByRole("menuitem").first()).toBeVisible(LOADED);
    await read("A to-do's menu");
    await close();
    // The forms the menu opens (the ones that change nothing until they are saved): edit, reassign and add a note.
    for (const entry of [/^Edit/, /^Reassign/, /^Add a note/]) {
      await page.getByRole("button", { name: new RegExp(`^More actions for ${seeded.todo.text}`) }).first().click();
      const item = page.getByRole("menuitem", { name: entry });
      // Editing is always offered; the others are read when the menu has them.
      if (entry.source === "^Edit") await expect(item.first()).toBeVisible(LOADED);
      if ((await item.count()) === 0) {
        await close();
        continue;
      }
      await item.first().click();
      await read(`A to-do's form: ${entry.source}`);
      await close();
    }

    // People: a row's menu.
    await go(page, "records/people");
    await expect(page.getByText(seeded.person.name).first()).toBeVisible(LOADED);
    await page.getByRole("button", { name: new RegExp(`^More actions for ${seeded.person.name}`) }).first().click();
    await expect(page.getByRole("menuitem").first()).toBeVisible(LOADED);
    await read("A person's menu");
    await close();

    await page.getByRole("button", { name: "Add a person" }).first().click();
    await expect(page.getByRole("dialog", { name: "Add a person" })).toBeVisible(LOADED);
    await read("Add a person");
    await close();

    // Connections: the form to add one.
    await go(page, "settings/connections");
    await heading(page, "Connections", 2);
    await page.getByRole("button", { name: "Add mail, calendar or folder" }).first().click();
    await expect(page.getByRole("heading", { name: "Add mail, calendar or folder" })).toBeVisible(LOADED);
    await read("Add mail, calendar or folder");
    await close();

    // Files: the form to add one.
    await go(page, "records/files");
    await heading(page, "Files");
    await page.getByRole("button", { name: "Add a file" }).first().click();
    await expect(page.getByRole("dialog", { name: /^Add a file/ })).toBeVisible(LOADED);
    await read("Add a file");
    await close();

    // Handing something in, and asking.
    await go(page, "today");
    await heading(page, "Today");
    await page.getByRole("button", { name: "Hand something in" }).first().click();
    await expect(page.getByRole("dialog", { name: "Hand something in" })).toBeVisible(LOADED);
    await read("Hand something in");
    await close();
    await expect(page.getByRole("dialog", { name: "Hand something in" })).toHaveCount(0);
    await page.getByRole("button", { name: "Ask", exact: true }).first().click();
    await expect(page.getByRole("dialog", { name: /^Ask / }).or(page.getByRole("complementary", { name: /^Ask / }))).toBeVisible(LOADED);
    await read("Ask");
    // Keeping track of something of one's own: the templates offered are the ones for a personal life.
    const own = page.getByRole("button", { name: "Keep track of something of your own" });
    await own.click();
    await expect(page.getByRole("button", { name: /^Use / }).first()).toBeVisible(LOADED);
    await read("Ask: keep track of something of your own");
    // None of the templates made for running work for others is on offer.
    const templates = (await (await page.request.get("api/templates")).json()) as Array<{ name: string; audience: string }>;
    for (const template of templates.filter((t) => t.audience === "work")) {
      await expect(page.getByRole("button", { name: `Use ${template.name}`, exact: true })).toHaveCount(0);
    }
    await close();

    // Knowledge and Quality.
    await go(page, "records/knowledge");
    await heading(page, "Knowledge");
    await read("Knowledge");
    await go(page, "quality");
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible(LOADED);
    await read("Quality");

    // A record's own page: the person, the area of life and the to-do.
    await go(page, `records/person/${encodeURIComponent(seeded.person.id)}`);
    await expect(page.getByRole("heading", { level: 1, name: seeded.person.name })).toBeVisible(LOADED);
    await read("A person's page");
    await go(page, `records/project/${encodeURIComponent(seeded.area.id)}`);
    await heading(page, seeded.area.name);
    await read("An area's page");
    await go(page, `records/action/${encodeURIComponent(seeded.todo.id)}`);
    await expect(page.getByText(seeded.todo.text).first()).toBeVisible(LOADED);
    await read("A to-do's page");

    expect(found).toEqual([]);
  });

  // Where something waits, the side menu says so (a sheet on a phone), and one group is shown in place (design 7.1, 7.5).
  test("the menu counts what waits, and Follow-ups with one group shows its items in place, at 1440 and at a phone width", async ({ page }) => {
    for (const size of [
      { width: 1440, height: 900 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(size);
      await go(page, "work/open");
      await heading(page, "To-dos and questions");
      // At a phone width the menu is the sheet behind the work button.
      if (size.width < 1024) await page.getByRole("button", { name: "Your day", exact: true }).click();
      const entry = page.getByRole("link", { name: /^To-dos and questions, \d+ waiting on you$/ });
      await expect(entry).toBeVisible(LOADED);
      // The figure is drawn and the words are the link's name; nothing waits on What changed here, so it has no count.
      await expect(entry.locator('[class*="count"]')).toHaveText(/^\d+$/);
      await expect(page.getByRole("link", { name: /^Handled for you(?!,)/ })).toBeVisible();
      if (size.width < 1024) await page.keyboard.press("Escape");

      // The one group on Follow-ups is the person's own: its questions stand in place, with no list and no pane beside it.
      await go(page, "work/followups");
      await heading(page, "Follow-ups");
      const place = page.locator("[data-in-place]");
      await expect(place).toBeVisible(LOADED);
      await expect(place.getByRole("heading", { level: 2, name: "You", exact: true })).toBeVisible();
      await expect(place.getByText(seeded.question.title)).toBeVisible();
      await expect(page.locator("[data-detail-pane]")).toHaveCount(0);
      await expect(page.getByRole("listitem", { name: "You", exact: true })).toHaveCount(0);
      // Nothing is wider than the window.
      const wide = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      expect(wide).toBe(false);
      const box = await place.boundingBox();
      expect(box && box.x + box.width <= size.width).toBe(true);
    }
  });

  // The weekly briefing is the message to whoever the person reports to: a person with only their own life has no one to report
  // to, so it never asks, whatever day it is read.
  test("the weekly briefing doesn't ask who they report to, and offers no message to write", async ({ page }) => {
    const brief = (await (await page.request.get("api/brief?form=monday")).json()) as { message: unknown };
    expect(brief.message ?? null).toBeNull();
    await go(page, "today");
    await heading(page, "Today");
    await expect(page.getByText(/report to/i)).toHaveCount(0);
  });

  test("the person's own page says You and what waits for them, and never describes them as someone else", async ({ page }) => {
    const me = (await (await page.request.get("api/me")).json()) as { person: string; full_name: string };
    await go(page, `records/person/${encodeURIComponent(me.person)}`);
    await expect(page.getByRole("heading", { level: 1, name: `You · ${me.full_name}` })).toBeVisible(LOADED);
    await expect(page.getByRole("heading", { level: 3, name: "Your details" })).toBeVisible(LOADED);
    const text = await settledText(page);
    for (const words of [/You asked/, /Open with/, /No contact on file/, /Who they are to you/, /Name verified/, /Track only/]) {
      expect(text).not.toMatch(words);
    }
  });
});
