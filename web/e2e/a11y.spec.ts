// Every main screen, and the panes that open over them, pass the accessibility checks in light and dark at four widths
// (design 7.11, 7.12, 7.13). The checks run from the top of the page; none is run on a screen that is still loading.
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const WIDTHS = [390, 1024, 1440, 1920];
const HEIGHT = 900;

async function signIn(page: Page) {
  await page.goto("?token=e2e-token");
  await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
}

async function expectNoViolations(page: Page) {
  await page.evaluate(() => window.scrollTo(0, 0));
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  const found = results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`);
  expect(found).toEqual([]);
}

/** Opens a screen by its address and waits until it has stopped loading: its heading shows and no skeleton is left. */
async function open(page: Page, hash: string) {
  await page.evaluate((h) => {
    window.location.hash = h;
  }, hash);
  await expect(page).toHaveURL(new RegExp(`#${hash}$`));
  await expect(page.getByRole("main").getByRole("heading", { level: 1 }).first()).toBeVisible();
  await expect(page.locator("main [data-skeleton]")).toHaveCount(0, { timeout: 15_000 });
}

// Today and the walkthrough are checked in the shell spec; these are the other main screens.
const SCREENS = [
  { name: "What changed", hash: "work/changed" },
  { name: "Since yesterday", hash: "work/since" },
  { name: "Handled for you", hash: "work/handled" },
  { name: "Follow-ups", hash: "work/followups" },
  { name: "Stages", hash: "work/stages" },
  { name: "Projects", hash: "records/projects" },
  { name: "People", hash: "records/people" },
  { name: "Files", hash: "records/files" },
  { name: "Knowledge", hash: "records/knowledge" },
  { name: "Connections", hash: "settings/connections" },
  { name: "Add-ons", hash: "settings/addons" },
  { name: "Settings", hash: "settings" },
  { name: "Settings, Notices", hash: "settings/today" },
  { name: "Settings, Quick links", hash: "settings/links" },
  { name: "Quality", hash: "quality" },
  { name: "Handover", hash: "handover" },
];

for (const scheme of ["light", "dark"] as const) {
  test.describe(`${scheme} screens`, () => {
    for (const screen of SCREENS) {
      test(`${screen.name} passes the accessibility checks in ${scheme} at four widths, with no sideways scrolling`, async ({ page }) => {
        await page.emulateMedia({ colorScheme: scheme });
        await signIn(page);
        for (const width of WIDTHS) {
          await page.setViewportSize({ width, height: HEIGHT });
          await open(page, screen.hash);
          await expect(page.locator("html")).toHaveCSS("color-scheme", scheme);
          await expectNoViolations(page);
          expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
        }
      });
    }

    test(`Settings' pages with their More settings open, and every topic of Advanced open, pass in ${scheme} at four widths`, async ({ page }) => {
      test.setTimeout(180_000);
      await page.emulateMedia({ colorScheme: scheme });
      await signIn(page);
      for (const width of WIDTHS) {
        await page.setViewportSize({ width, height: HEIGHT });
        for (const hash of ["settings/ai", "settings/today", "settings/appearance", "settings/backups"]) {
          await open(page, hash);
          await page.locator("details.more-settings > summary").click();
          await expect(page.locator("details.more-settings")).toHaveAttribute("open", "");
          await expectNoViolations(page);
          expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth), hash).toBeLessThanOrEqual(0);
        }
        // The money boxes read as currency with two decimals.
        await open(page, "settings/ai");
        await expect(page.getByRole("textbox", { name: "Most to spend in a day" })).toHaveValue(/^\$\d[\d,]*\.\d{2}$/);
        await open(page, "settings/advanced");
        const toggles = page.locator(".settings-topic .topic-toggle");
        for (let n = 0; n < (await toggles.count()); n += 1) {
          if ((await toggles.nth(n).getAttribute("aria-expanded")) !== "true") await toggles.nth(n).click();
        }
        await expectNoViolations(page);
        expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
      }
    });

    test(`the stages board, with a card's menu open, passes in ${scheme} at four widths`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await signIn(page);
      for (const width of WIDTHS) {
        await page.setViewportSize({ width, height: HEIGHT });
        await open(page, "work/stages");
        // A phone starts with the list; the board is one switch away.
        await page.getByRole("radio", { name: "Board" }).check();
        await expect(page.getByRole("group", { name: /, by stage$/ }).first()).toBeVisible();
        await expectNoViolations(page);
        await page.getByRole("button", { name: /^More actions for / }).first().click();
        await expect(page.getByRole("menu")).toBeVisible();
        await expectNoViolations(page);
        await page.keyboard.press("Escape");
      }
    });

    test(`Hand something in, as a drawer, passes in ${scheme} at four widths`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await signIn(page);
      for (const width of WIDTHS) {
        await page.setViewportSize({ width, height: HEIGHT });
        await open(page, "today");
        await page.getByRole("button", { name: "Hand something in" }).first().click();
        const drawer = page.getByRole("dialog", { name: "Hand something in" });
        await expect(drawer).toBeVisible();
        await expectNoViolations(page);
        await page.keyboard.press("Escape");
        await expect(drawer).toHaveCount(0);
      }
    });

    test(`Ask, as a dialog or a pane, passes in ${scheme} at four widths`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await signIn(page);
      for (const width of WIDTHS) {
        await page.setViewportSize({ width, height: HEIGHT });
        await open(page, "today");
        await page.getByRole("button", { name: "Ask", exact: true }).first().click();
        // A pane from 1440px, a dialog below it.
        const asking = width >= 1440 ? page.getByRole("complementary", { name: /^Ask / }) : page.getByRole("dialog", { name: /^Ask / });
        await expect(asking).toBeVisible();
        await expectNoViolations(page);
        await page.keyboard.press("Escape");
        await expect(asking).toHaveCount(0);
      }
    });
  });
}

// Day mode (UI/UX review F7): a row's action is tonal, so a screen's own content draws at most one filled button (the selected
// line's); "Hand something in" is in the header, outside it. A filled button is one drawn in the accent color itself.
/** How many buttons in the main content are filled with the accent color. */
async function filledButtons(page: Page): Promise<number> {
  return page.evaluate(() => {
    const probe = document.createElement("span");
    probe.style.backgroundColor = "var(--accent)";
    document.body.append(probe);
    const accent = getComputedStyle(probe).backgroundColor;
    probe.remove();
    return Array.from(document.querySelectorAll<HTMLElement>("main button")).filter((b) => getComputedStyle(b).backgroundColor === accent && b.getBoundingClientRect().width > 0).length;
  });
}

test.describe("day mode", () => {
  for (const screen of [{ name: "Today", hash: "today" }, { name: "To-dos and questions", hash: "work/open" }, { name: "Follow-ups", hash: "work/followups" }]) {
    test(`${screen.name} draws at most one filled button in light at 1440px, and the header's Hand something in is filled`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: "light" });
      await signIn(page);
      await page.setViewportSize({ width: 1440, height: HEIGHT });
      await open(page, screen.hash);
      expect(await filledButtons(page)).toBeLessThanOrEqual(1);
      if (screen.hash === "today") {
        const handIn = page.getByRole("banner").getByRole("button", { name: "Hand something in" });
        await expect(handIn).toHaveCSS("background-color", await page.evaluate(() => {
          const probe = document.createElement("span");
          probe.style.backgroundColor = "var(--accent)";
          document.body.append(probe);
          const accent = getComputedStyle(probe).backgroundColor;
          probe.remove();
          return accent;
        }));
      }
    });
  }
});

// Target sizes (WCAG 2.5.8; check C52): no visible interactive element is smaller than 24 by 24 CSS pixels. A checkbox or
// radio is measured as the element itself (its 18px box is drawn inside a 24px control), never by its label; a link inside a
// sentence is exempt, as the standard says.
/** The visible interactive elements of the page smaller than 24px either way, each named for the report. */
async function smallTargets(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const selector = "a[href], button, input:not([type='hidden']), select, textarea, summary, [role='button'], [role='menuitem'], [role='menuitemcheckbox'], [role='menuitemradio'], [role='tab'], [role='switch']";
    const found: string[] = [];
    for (const el of Array.from(document.querySelectorAll<HTMLElement>(selector))) {
      const style = getComputedStyle(el);
      if (style.visibility === "hidden" || style.display === "none" || el.closest("[hidden], [inert]")) continue;
      const own = el.getBoundingClientRect();
      // Out of the window (the skip link), clipped to nothing (screen-reader-only text) or not drawn.
      if (own.width === 0 || own.height === 0 || own.right <= 0 || own.bottom <= 0 || el.classList.contains("sr")) continue;
      if (style.clip !== "auto" && style.position === "absolute" && own.width <= 1) continue;
      // A link running in a sentence is an inline target.
      if (el.tagName === "A" && style.display === "inline") continue;
      const rect = own;
      if (rect.width < 24 - 0.5 || rect.height < 24 - 0.5) {
        const name = el.getAttribute("aria-label") ?? el.textContent?.trim().slice(0, 30) ?? "";
        found.push(`${el.tagName.toLowerCase()} "${name}" ${Math.round(rect.width)}x${Math.round(rect.height)}`);
      }
    }
    return found;
  });
}

test.describe("target sizes", () => {
  for (const screen of [{ name: "Today", hash: "today" }, ...SCREENS]) {
    test(`${screen.name} has no visible interactive element under 24×24 at 1024, 1440 and 390px`, async ({ page }) => {
      await signIn(page);
      for (const width of [390, 1024, 1440]) {
        await page.setViewportSize({ width, height: HEIGHT });
        await open(page, screen.hash);
        expect(await smallTargets(page), `at ${width}px`).toEqual([]);
      }
    });
  }
});
