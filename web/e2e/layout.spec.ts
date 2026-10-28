// No screen is ever wider than the window (the project's UI rules): every main screen at the widths people use, holding long
// unbroken text from outside (the layout stress strings) in a title, a Today row, a failed read in Today's right column and
// the details pane. The layout server (`--layout-stress`) holds the records and the failed reads; the hand-in is made here.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { expect, test, type Page } from "@playwright/test";

const strings: Record<string, string> = Object.fromEntries(
  (JSON.parse(readFileSync(fileURLToPath(new URL("./fixtures/layout-strings.json", import.meta.url)), "utf8")) as Array<{ id: string; text: string }>).map(
    (s) => [s.id, s.text],
  ),
);

/** What a screen's data takes to arrive on a busy computer: each screen is read once it shows what it loads, never sooner. */
const LOADED = { timeout: 20_000 };

/** 1512 x 982 is the owner's laptop; the others are two phones, a tablet and three desktops. */
const SIZES = [
  { width: 360, height: 740 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1280, height: 800 },
  { width: 1512, height: 982 },
  { width: 1920, height: 1080 },
];

/** What shows the screen has its long text and has loaded, so a width is never measured on a page still empty. */
const SCREENS: Array<{ name: string; hash: string; ready: (page: Page) => Promise<void> }> = [
  {
    name: "Today",
    hash: "today",
    ready: async (page) => {
      await expect(page.getByRole("heading", { level: 2, name: "Needs you", exact: true })).toBeVisible(LOADED);
      await expect(page.locator('[data-queue-line="review"]').first()).toBeVisible(LOADED);
      // On the phone the rail's panels are folded to one line; the one holding the failed read says so, and is opened to measure it.
      const folded = page.getByRole("button", { name: /Came in/, expanded: false });
      const problems = page.locator("[data-source-problems]").first();
      await expect(folded.or(problems)).toBeVisible(LOADED);
      if (await folded.isVisible()) await folded.click();
      await expect(problems).toBeVisible(LOADED);
      await expect(page.locator("[data-source-problems]").first()).toContainText(strings["mail-01"].slice(0, 12), LOADED);
    },
  },
  { name: "Follow-ups", hash: "work/followups", ready: (page) => heading(page, "Follow-ups") },
  { name: "To-dos and questions", hash: "work/open", ready: (page) => heading(page, "To-dos and questions") },
  { name: "What changed", hash: "work/changed", ready: (page) => heading(page, "What changed") },
  { name: "Handled for you", hash: "work/handled", ready: (page) => heading(page, "Handled for you") },
  { name: "Stages", hash: "work/stages", ready: (page) => heading(page, "Stages") },
  { name: "Projects", hash: "records/projects", ready: (page) => text(page, strings["token-02"]) },
  { name: "People", hash: "records/people", ready: (page) => text(page, strings["email-03"]) },
  { name: "Files", hash: "records/files", ready: (page) => heading(page, "Files") },
  { name: "Knowledge", hash: "records/knowledge", ready: (page) => heading(page, "Knowledge") },
  {
    name: "Connections",
    hash: "settings/connections",
    ready: async (page) => {
      await heading(page, "Connections");
      await text(page, strings["mail-01"].slice(0, 12));
    },
  },
  { name: "Add-ons", hash: "settings/addons", ready: (page) => heading(page, "Add-ons") },
  { name: "Settings", hash: "settings", ready: (page) => heading(page, "Settings") },
  { name: "Quality", hash: "quality", ready: (page) => expect(page.getByRole("heading", { level: 1, name: /^How .+ is doing$/ })).toBeVisible(LOADED) },
  // Each section of Settings, with its help beside the settings or under them.
  {
    name: "Settings: AI accounts",
    hash: "settings/ai",
    ready: async (page) => {
      await section(page, "AI accounts");
      // Under the accounts, behind a closed disclosure: which model does what, with its lists and the routing rules.
      await page.getByText("Choose which account does each kind of work", { exact: true }).click();
      await expect(page.getByRole("heading", { level: 3, name: "Which model does what" })).toBeVisible(LOADED);
      await expect(page.getByRole("group", { name: "Rule 1" })).toBeVisible(LOADED);
    },
  },
  { name: "Settings: Backups", hash: "settings/backups", ready: (page) => section(page, "Backups") },
  { name: "Settings: Notices", hash: "settings/today", ready: (page) => section(page, "Notices") },
  { name: "Settings: Appearance", hash: "settings/appearance", ready: (page) => section(page, "Appearance") },
  { name: "Settings: Advanced", hash: "settings/advanced", ready: (page) => section(page, "Advanced") },
];

const section = (page: Page, name: string) => expect(page.getByRole("heading", { level: 2, name: new RegExp(`^${name}`) })).toBeVisible(LOADED);
const heading = (page: Page, name: string) => expect(page.getByRole("heading", { level: 1, name, exact: true })).toBeVisible(LOADED);
const text = (page: Page, words: string) => expect(page.getByText(words.slice(0, 12)).first()).toBeAttached(LOADED);

/** How wide the page and its body are against the window, and what sticks out past it without making the page scroll
 * (content a parent clips is as bad: it is cut off). Fixed layers and anything inside a box that scrolls itself are the
 * box's own business; so is text a cell ends in an ellipsis with its whole value as the title. */
const overflow = (page: Page) =>
  page.evaluate(() => {
    const limit = window.innerWidth;
    const scrolls = (el: Element | null): boolean => {
      for (; el; el = el.parentElement) if (/auto|scroll/.test(getComputedStyle(el).overflowX)) return true;
      return false;
    };
    // Text that a table cell shortens on purpose is not cut off: it ends in an ellipsis and the cell's title holds the whole value.
    const shortened = (el: Element): boolean => {
      for (let up: Element | null = el; up; up = up.parentElement) {
        const style = getComputedStyle(up);
        if (style.overflowX === "hidden" && style.textOverflow === "ellipsis") return !!el.closest("[title]");
      }
      return false;
    };
    const cut: string[] = [];
    for (const el of Array.from(document.querySelectorAll("body *"))) {
      const box = el.getBoundingClientRect();
      const parent = el.parentElement!.getBoundingClientRect();
      if (box.width > 0 && box.height > 0 && box.right > limit + 1 && parent.right <= limit + 1 && getComputedStyle(el).position !== "fixed" && !scrolls(el) && !shortened(el)) {
        cut.push(`${el.tagName.toLowerCase()}.${String(el.className).split(" ")[0]} reaches ${Math.round(box.right)}`);
      }
    }
    return { window: limit, page: document.documentElement.scrollWidth, body: document.body.scrollWidth, cut: cut.slice(0, 5) };
  });

const tooWide = (found: Awaited<ReturnType<typeof overflow>>) => found.page > found.window || found.body > found.window || found.cut.length > 0;

test.describe("no screen is wider than the window", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("?token=e2e-token");
    await expect(page.getByRole("heading", { level: 2, name: "Needs you", exact: true })).toBeVisible();
    // The assistant's work on a note: a Today line to review, whose items the details pane shows.
    const handed = await page.request.post("api/handin", { data: { note: strings["web-02"] } });
    expect(handed.ok()).toBe(true);
    // Today holds a new line back behind "new · Show" until a page load, so wait for it by what the server says.
    await expect
      .poll(async () => ((await (await page.request.get("api/today/queue")).json()) as Array<{ kind: string }>).some((line) => line.kind === "review"), {
        timeout: 30_000,
      })
      .toBe(true);
  });

  test("every main screen, and the details pane, at every width", async ({ page }) => {
    // Seven widths of twenty-two screens, each waited for until it has loaded: a busy computer needs more than a minute.
    test.setTimeout(240_000);
    const wide: string[] = [];
    for (const size of SIZES) {
      await page.setViewportSize(size);
      // One page load per width: the screens change by the address's fragment, which is how the app moves between them.
      await page.goto("?token=e2e-token");
      for (const screen of SCREENS) {
        await page.evaluate((hash) => {
          window.location.hash = hash;
        }, screen.hash);
        await screen.ready(page);
        const found = await overflow(page);
        if (tooWide(found)) wide.push(`${screen.name} at ${size.width}: ${JSON.stringify(found)}`);
        if (size === SIZES[0]) {
          // Another computer's fonts may run wider than this one's: at the narrowest width, measure again with the text
          // set a little wider, so a row that only just fits here is caught before it overflows there.
          await page.evaluate(() => document.querySelectorAll<HTMLElement>("body *").forEach((e) => (e.style.letterSpacing = "0.08em")));
          const wider = await overflow(page);
          if (tooWide(wider)) wide.push(`${screen.name} at ${size.width} with wider text: ${JSON.stringify(wider)}`);
          await page.evaluate(() => document.querySelectorAll<HTMLElement>("body *").forEach((e) => (e.style.letterSpacing = "")));
        }
      }
      // The details pane: the review line looked over, beside the queue or in place of its row.
      await page.evaluate(() => {
        window.location.hash = "today";
      });
      const review = page.locator('[data-queue-line="review"]').first();
      await expect(review).toBeVisible(LOADED);
      await review.getByRole("button", { name: "Look over", exact: true }).click();
      await expect(page.locator("[data-batch-detail]").first()).toBeVisible(LOADED);
      await expect(page.locator("[data-batch-detail]").first().getByRole("button", { name: /^Not right/ }).first()).toBeVisible(LOADED);
      const found = await overflow(page);
      if (tooWide(found)) wide.push(`Details at ${size.width}: ${JSON.stringify(found)}`);
    }
    expect(wide).toEqual([]);
  });

  test("a change's row grows with its title, and the detail's menu stays on the line of its state", async ({ page }) => {
    test.setTimeout(120_000);
    for (const size of [
      { width: 1440, height: 900 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(size);
      await page.goto("?token=e2e-token");
      await page.evaluate(() => {
        window.location.hash = "work/changed";
      });
      await heading(page, "What changed");
      await expect(page.locator("ol.queue:not(.detail-queue) > li.line .expander").first()).toBeVisible(LOADED);
      // Each row is as tall as its title and what is under it: no line is cut by a row that keeps one height.
      const rows = await page.evaluate(() =>
        Array.from(document.querySelectorAll("ol.queue:not(.detail-queue) > li.line")).map((li) => {
          const row = li.querySelector(".row") as HTMLElement;
          const title = li.querySelector(".expander") as HTMLElement;
          return { line: li.getBoundingClientRect().height, title: title.getBoundingClientRect().height, scroll: row.scrollHeight, shown: row.clientHeight };
        }),
      );
      expect(rows.length).toBeGreaterThan(0);
      for (const row of rows) {
        expect(row.line).toBeGreaterThanOrEqual(row.title);
        expect(row.scroll).toBeLessThanOrEqual(row.shown + 1);
      }
      if (size.width < 1024) continue;
      // The first row's detail stands beside the list: its menu is on the line its state begins, never alone beneath it.
      const pane = page.locator("[data-detail-pane]");
      await expect(pane).toBeVisible(LOADED);
      const state = await pane.locator(".detail-state .kind").boundingBox();
      const menu = await pane.locator(".detail-top .acts button").first().boundingBox();
      expect(state && menu && Math.abs(menu.y - state.y) < 24).toBe(true);
    }
  });

  test("no screen nests more than two levels of bordered containers", async ({ page }) => {
    test.setTimeout(120_000);
    // A container is bordered when all four of its sides show a border; a control, a key cap, a table cell or a picture is not a
    // container. A pane that holds a bordered group is two levels; a third is a card inside a card.
    const nested: string[] = [];
    for (const size of [{ width: 1280, height: 800 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(size);
      await page.goto("?token=e2e-token");
      for (const screen of SCREENS) {
        await page.evaluate((hash) => {
          window.location.hash = hash;
        }, screen.hash);
        await screen.ready(page);
        const deep = await page.evaluate(() => {
          const skip = new Set(["INPUT", "BUTTON", "SELECT", "TEXTAREA", "KBD", "IMG", "TD", "TH", "CODE", "PRE", "A", "SPAN", "LABEL"]);
          const bordered = (el: Element) => {
            if (skip.has(el.tagName)) return false;
            const style = getComputedStyle(el);
            const sides = [style.borderTopWidth, style.borderRightWidth, style.borderBottomWidth, style.borderLeftWidth];
            const rect = el.getBoundingClientRect();
            return sides.every((w) => parseFloat(w) >= 1) && style.borderTopStyle !== "none" && rect.width > 48 && rect.height > 24;
          };
          const found: string[] = [];
          let seen = 0;
          for (const el of Array.from(document.querySelectorAll("main *"))) {
            if (!bordered(el)) continue;
            seen += 1;
            let depth = 1;
            for (let up = el.parentElement; up && up.tagName !== "BODY"; up = up.parentElement) if (bordered(up)) depth += 1;
            if (depth > 2) found.push(`${el.tagName.toLowerCase()}.${String(el.className).split(" ")[0]} is level ${depth}`);
          }
          return { found: found.slice(0, 5), seen };
        });
        if (deep.found.length > 0) nested.push(`${screen.name} at ${size.width}: ${deep.found.join("; ")}`);
        // The measure finds the panes at all, so a rule that stopped matching anything could not pass for a clean screen.
        if (screen.name === "Today") expect(deep.seen).toBeGreaterThan(0);
      }
    }
    expect(nested).toEqual([]);
  });

  test("the header with every chip shown keeps all of its controls inside the window, none cut short", async ({ page }) => {
    test.setTimeout(120_000);
    // The demo chip, the status chip, the assistant's line (from 1440px) and "Missed something?" (shown once a note has
    // been handed in, as the setup above does) are all on; wider text is tried too, as another computer's fonts may run wider.
    const cut: string[] = [];
    for (const width of [768, 1024, 1180, 1280, 1440, 1512]) {
      await page.setViewportSize({ width, height: 800 });
      for (const spacing of ["", "0.06em"]) {
        await page.evaluate((v) => document.querySelectorAll<HTMLElement>("header *").forEach((e) => (e.style.letterSpacing = v)), spacing);
        const found = await page.evaluate(() => {
          const header = document.querySelector("header")!;
          const out: string[] = [];
          for (const el of Array.from(header.querySelectorAll("*"))) {
            const box = el.getBoundingClientRect();
            if (box.width === 0) continue;
            if (box.right > window.innerWidth + 1) out.push(`${el.tagName.toLowerCase()} reaches ${Math.round(box.right)}`);
            // Text shortened by the room it has, other than the Ask field's hint and the workspace name, which end in an ellipsis on purpose.
            const own = el as HTMLElement;
            if (el.tagName === "BUTTON" && own.scrollWidth > own.clientWidth + 2 && !own.hasAttribute("data-ask-button")) out.push(`${(own.textContent ?? "").trim()} is cut short`);
          }
          return out;
        });
        if (found.length > 0) cut.push(`${width}${spacing ? " wider text" : ""}: ${found.join("; ")}`);
      }
    }
    expect(cut).toEqual([]);
  });
});
