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
  { name: "Notes", hash: "records/notes", ready: (page) => heading(page, "Notes") },
  { name: "Knowledge", hash: "records/knowledge", ready: (page) => heading(page, "Knowledge") },
  {
    name: "Connections",
    hash: "settings/connections",
    ready: async (page) => {
      await section(page, "Connections");
      await text(page, strings["mail-01"].slice(0, 12));
    },
  },
  { name: "Add-ons", hash: "settings/addons", ready: (page) => section(page, "Add-ons") },
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
  { name: "Settings: Quick links", hash: "settings/links", ready: (page) => section(page, "Quick links") },
  { name: "Settings: Advanced", hash: "settings/advanced", ready: (page) => section(page, "Advanced") },
];

const section = (page: Page, name: string) => expect(page.getByRole("heading", { level: 2, name: new RegExp(`^${name}`) })).toBeVisible(LOADED);
const heading = (page: Page, name: string | RegExp) => expect(page.getByRole("heading", { level: 1, name, exact: true })).toBeVisible(LOADED);
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

  test("To-dos show the inline add row and fit phone widths without sideways page scroll", async ({ page }) => {
    for (const width of [320, 390]) {
      await page.setViewportSize({ width, height: 844 });
      await page.goto("?token=e2e-token");
      await page.evaluate(() => {
        window.location.hash = "work/open";
      });
      await heading(page, "To-dos and questions");
      const list = page.getByRole("list", { name: "Open to-dos" });
      await expect(list).toBeVisible(LOADED);
      await expect(list.getByRole("textbox", { name: "Add a to-do" })).toBeVisible();
      const found = await overflow(page);
      expect(tooWide(found), `To-dos at ${width}px: ${JSON.stringify(found)}`).toBe(false);
    }
  });

  test("the Add an account panel has nothing wider than itself and the page never scrolls sideways", async ({ page }) => {
    test.setTimeout(240_000);
    const long = strings["token-02"] ?? strings["web-01"];
    // What a service might answer, as long unbroken words: a model's id, the sign-in's name, a refusal's reason.
    const longModels = {
      models: [{ id: `model-${long}`, context_tokens: 200000, input_per_million: 3, output_per_million: 15 }, { id: "short-model" }],
      suggested: `model-${long}`,
    };
    let listed: Record<string, unknown> = longModels;
    await page.route("**/api/ai/models", (route) => route.fulfill({ json: listed }));
    const measure = (label: string) =>
      page.evaluate((label) => {
        const dialog = document.querySelector('[role="dialog"]') as HTMLElement;
        const box = dialog.getBoundingClientRect();
        const name = (el: Element) => `${el.tagName.toLowerCase()}.${String(el.className).split(" ")[0]}`;
        const all = Array.from(dialog.querySelectorAll("*"));
        // Past the panel's right edge, or a box whose own content is wider than it (clipped or scrolling inside it).
        const wide = all.filter((el) => el.getBoundingClientRect().width > 0 && el.getBoundingClientRect().right > box.right + 1).map((el) => `${name(el)} right ${Math.round(el.getBoundingClientRect().right)}`);
        const inside = all
          // Text that ends in an ellipsis, with its whole value as the title, is shortened on purpose and not cut off.
          .filter((el) => !["INPUT", "SELECT", "TEXTAREA"].includes(el.tagName) && el.scrollWidth > el.clientWidth + 1 && el.clientWidth > 0 && !(getComputedStyle(el).textOverflow === "ellipsis" && el.closest("[title]")))
          .map((el) => `${name(el)} content ${el.scrollWidth} in ${el.clientWidth}`);
        const widest = all.map((el) => ({ el, w: el.getBoundingClientRect().width })).sort((x, y) => y.w - x.w).slice(0, 3).map(({ el, w }) => `${name(el)} ${Math.round(w)}`);
        const found = { label, window: window.innerWidth, panel: Math.round(box.width), panelScroll: dialog.scrollWidth - dialog.clientWidth, page: document.documentElement.scrollWidth, widest, wide: wide.slice(0, 6), inside: inside.slice(0, 6) };
        return found;
      }, label);
    const check = async (label: string) => {
      for (const spacing of ["", "0.08em"]) {
        await page.evaluate((s) => document.querySelectorAll<HTMLElement>('[role="dialog"] *').forEach((e) => (e.style.letterSpacing = s)), spacing);
        const found = await measure(`${label}${spacing ? ", wider text" : ""}`);
        const bad = found.wide.length > 0 || found.inside.length > 0 || found.panelScroll > 0 || found.page > found.window;
        if (bad) console.log(`Add an account: ${JSON.stringify(found)}`);
        expect(bad, `Add an account: ${JSON.stringify(found)}`).toBe(false);
      }
    };
    // A window with scroll bars that take room (Windows, a mouse): the browser here hides them, so they are drawn by hand.
    await page.addInitScript(() => {
      const style = document.createElement("style");
      style.textContent = "*::-webkit-scrollbar { width: 15px; height: 15px; background: #ddd; } *::-webkit-scrollbar-thumb { background: #888; }";
      document.addEventListener("DOMContentLoaded", () => document.head.appendChild(style));
    });
    for (const width of [320, 390, 768, 1280]) {
      listed = longModels;
      await page.setViewportSize({ width, height: 900 });
      await page.goto("?token=e2e-token");
      // Each width starts with an empty form: what was typed before is kept for the tab.
      await page.evaluate(() => {
        window.sessionStorage.clear();
      });
      await page.reload();
      await page.evaluate(() => {
        window.location.hash = "settings/ai";
      });
      await section(page, "AI accounts");
      await page.getByRole("button", { name: "Add an account" }).first().click();
      const panel = page.getByRole("dialog", { name: "Add an account" });
      await expect(panel).toBeVisible(LOADED);
      await check(`${width}px, as opened`);
      // Open every line under Something else, so the longest cards show.
      const more = panel.getByRole("radio", { name: /Something else/ });
      if (await more.count()) await more.first().click();
      for (const line of await panel.getByRole("button", { name: /^(Another service|An app you're signed in to|One on this computer)/ }).all()) {
        if ((await line.getAttribute("aria-expanded")) !== "true") await line.click();
      }
      await check(`${width}px, every kind shown`);
      // Each kind in turn, since choosing one opens its own fields.
      const kinds = await panel.locator('input[type="radio"][name^="ai-kind"]').evaluateAll((els) => els.map((el) => (el as HTMLInputElement).value));
      for (const kind of new Set(kinds.filter(Boolean))) {
        await panel.locator(`input[type="radio"][name^="ai-kind"][value="${kind}"]`).first().click({ force: true });
        await check(`${width}px, kind ${kind}`);
      }
      // A key typed into a service that takes one, then Check: the model list holds a long id, then the service refuses with a long reason.
      const key = panel.locator("input#ai-key");
      await panel.locator('input[type="radio"][name^="ai-kind"]').first().click({ force: true });
      if (await key.count()) {
        await key.first().fill("secret-value");
        await panel.getByRole("button", { name: "Check", exact: true }).click();
        await expect(panel.locator("#ai-model")).toBeAttached(LOADED);
        // What a closed disclosure holds is measured too.
        await page.evaluate(() => document.querySelectorAll('[role="dialog"] details').forEach((d) => d.setAttribute("open", "")));
        await check(`${width}px, models listed, a long id`);
        listed = { models: [], problem: long };
        await panel.getByRole("button", { name: "Check", exact: true }).click();
        await expect(panel.getByText(long.slice(0, 20)).first()).toBeVisible(LOADED);
        await check(`${width}px, the service refused with a long reason`);
      }
    }
  });

  test("Quality fits the smallest and largest supported widths", async ({ page }) => {
    for (const width of [320, 2000]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("?token=e2e-token");
      await page.evaluate(() => {
        window.location.hash = "quality";
      });
      await expect(page.getByRole("heading", { level: 1, name: /^How .+ is doing$/ })).toBeVisible(LOADED);
      expect(tooWide(await overflow(page)), `Quality at ${width}px`).toBe(false);
    }
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
      await expect(page.locator("ol[data-row-list]:not([data-detail]) > li [data-expander]").first()).toBeVisible(LOADED);
      // Each row is as tall as its title and what is under it: no line is cut by a row that keeps one height.
      const rows = await page.evaluate(() =>
        Array.from(document.querySelectorAll("ol[data-row-list]:not([data-detail]) > li:has([data-expander])")).map((li) => {
          const title = li.querySelector("[data-expander]") as HTMLElement;
          return { line: li.getBoundingClientRect().height, title: title.getBoundingClientRect().height, scroll: li.scrollHeight, shown: li.clientHeight };
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
      // Both are read in one frame, and again until the list above has stopped settling: two separate reads can straddle a shift.
      await expect
        .poll(async () =>
          pane.evaluate((el) => {
            const state = el.querySelector("[data-detail-top] [data-state-mark]")?.getBoundingClientRect();
            const menu = el.querySelector("[data-detail-top] [data-actions] button")?.getBoundingClientRect();
            return state && menu ? Math.abs(menu.y - state.y) : null;
          }),
        )
        .toBeLessThan(24);
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
    // The demo chip, the status chip, and the assistant's line (from 1440px) are all on; wider text is tried too, as another computer's fonts may run wider.
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
