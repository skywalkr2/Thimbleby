// Guards on the shared components (design 7.12), over the main screens at 1440 and 390 px, in light and dark. They hold the
// four things the components exist to make true everywhere, so a screen that drifts back to its own version fails here:
//   1. no paragraph text is smaller than 13px (a pill, a caption, a key cap and a table's column head are not paragraphs);
//   2. at most one filled primary button in a region (the header, a pane, a dialog, the main content);
//   3. no list row has an empty leading column (a row without a mark has no column for one);
//   4. no field has the cursor when a screen opens (a form, dialog or drawer the person opened is another matter).
//   5. no native, unstyled select, date, time or file control and no fieldset drawn with its legend on a border (VC05, E12): a
//      list, a date, a file and a group of ticks come from the shared components, which mark themselves `data-ui`.
// The layout server holds the long names and the many items of the fixtures, so the guards hold with them.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { expect, test, type Page } from "@playwright/test";

const strings: Record<string, string> = Object.fromEntries(
  (JSON.parse(readFileSync(fileURLToPath(new URL("./fixtures/layout-strings.json", import.meta.url)), "utf8")) as Array<{ id: string; text: string }>).map(
    (s) => [s.id, s.text],
  ),
);

const LOADED = { timeout: 20_000 };

const SIZES = [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
];

const SCREENS: Array<{ name: string; hash: string; heading: string | RegExp }> = [
  { name: "Today", hash: "today", heading: "Today" },
  { name: "Follow-ups", hash: "work/followups", heading: "Follow-ups" },
  { name: "To-dos and questions", hash: "work/open", heading: "To-dos and questions" },
  { name: "What changed", hash: "work/changed", heading: "What changed" },
  { name: "Handled for you", hash: "work/handled", heading: "Handled for you" },
  { name: "Stages", hash: "work/stages", heading: "Stages" },
  { name: "Projects", hash: "records/projects", heading: "Projects" },
  { name: "People", hash: "records/people", heading: "People" },
  { name: "Files", hash: "records/files", heading: "Files" },
  { name: "Notes", hash: "records/notes", heading: "Notes" },
  { name: "Knowledge", hash: "records/knowledge", heading: "Knowledge" },
  { name: "Connections", hash: "settings/connections", heading: "Settings" },
  { name: "Add-ons", hash: "settings/addons", heading: "Settings" },
  { name: "Settings", hash: "settings", heading: "Settings" },
  { name: "Quality", hash: "quality", heading: /^How .+ is doing$/ },
];

async function open(page: Page, screen: (typeof SCREENS)[number]) {
  await page.evaluate((hash) => {
    window.location.hash = hash;
  }, screen.hash);
  await expect(page.getByRole("main").getByRole("heading", { level: 1, name: screen.heading }).first()).toBeVisible(LOADED);
  await expect(page.locator("main [data-skeleton]")).toHaveCount(0, LOADED);
}

/** Visible text in the main content that is a sentence (twenty characters or more of its own) set smaller than 13px. */
const smallParagraphs = (page: Page) =>
  page.evaluate(() => {
    const exempt = "[data-pill], [data-tag], .tag, kbd, caption, figcaption, thead, th, h1, h2, h3, h4, h5, h6, button, [data-caption], .sr";
    const found: string[] = [];
    for (const el of Array.from(document.querySelectorAll("main *"))) {
      if (el.closest(exempt)) continue;
      const own = Array.from(el.childNodes)
        .filter((n) => n.nodeType === Node.TEXT_NODE)
        .map((n) => n.textContent ?? "")
        .join("")
        .trim();
      if (own.length < 20) continue;
      const style = getComputedStyle(el);
      const box = el.getBoundingClientRect();
      if (style.display === "none" || style.visibility === "hidden" || box.width === 0 || box.height === 0) continue;
      if (parseFloat(style.fontSize) < 13) found.push(`${el.tagName.toLowerCase()}.${String(el.className).split(" ")[0]} ${style.fontSize} "${own.slice(0, 30)}"`);
    }
    return found.slice(0, 8);
  });

/** The regions of the page that draw more than one button filled with the accent colour, with what they hold. */
const crowdedPrimaries = (page: Page) =>
  page.evaluate(() => {
    const probe = document.createElement("span");
    probe.style.backgroundColor = "var(--accent)";
    document.body.append(probe);
    const accent = getComputedStyle(probe).backgroundColor;
    probe.remove();
    const regions = new Map<Element, string[]>();
    for (const el of Array.from(document.querySelectorAll<HTMLElement>("button, a[data-variant]"))) {
      if (getComputedStyle(el).backgroundColor !== accent || el.getBoundingClientRect().width === 0) continue;
      if (el.closest("[hidden], [inert]")) continue;
      const region = el.closest("[role=dialog], aside, header, nav") ?? document.querySelector("main")!;
      regions.set(region, [...(regions.get(region) ?? []), (el.textContent ?? "").trim().slice(0, 30)]);
    }
    return [...regions.values()].filter((names) => names.length > 1).map((names) => names.join(" | "));
  });

/** Rows with a gap at their left edge: nothing they hold starts within 72px of it (16px of padding and at most a 44px leading
 * control), so a column was kept for a mark that is not there. */
const emptyLeads = (page: Page) =>
  page.evaluate(() => {
    const found: string[] = [];
    for (const row of Array.from(document.querySelectorAll("main [data-row]"))) {
      const box = row.getBoundingClientRect();
      if (box.width === 0 || box.height === 0) continue;
      let leftmost = Infinity;
      for (const el of Array.from(row.querySelectorAll("*"))) {
        const own = Array.from(el.childNodes).some((n) => n.nodeType === Node.TEXT_NODE && (n.textContent ?? "").trim() !== "");
        const control = ["svg", "img", "input", "button", "select", "textarea"].includes(el.tagName.toLowerCase());
        if (!own && !control) continue;
        const at = el.getBoundingClientRect();
        if (at.width === 0 || at.height === 0) continue;
        leftmost = Math.min(leftmost, at.left);
      }
      if (leftmost !== Infinity && leftmost - box.left > 72) found.push(`${row.tagName.toLowerCase()} starts ${Math.round(leftmost - box.left)}px from its left edge`);
    }
    return found.slice(0, 5);
  });

/** What has the cursor, when it is a field. */
const fieldWithCursor = (page: Page) =>
  page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el || el === document.body) return null;
    const field = el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable;
    return field ? `${el.tagName.toLowerCase()}#${el.id}` : null;
  });

/** Controls on the page that the shared form components did not draw: a select, a date, time or file input, or a fieldset
 * that is not a CheckboxGroup or has a frame of its own. A file input that is hidden (opened from a button) is not a control. */
const nativeControls = (page: Page) =>
  page.evaluate(() => {
    const found: string[] = [];
    const selector = "select, input[type=date], input[type=time], input[type=datetime-local], input[type=file], fieldset";
    for (const el of Array.from(document.querySelectorAll<HTMLElement>(`main ${selector.replace(/, /g, ", main ")}`))) {
      const style = getComputedStyle(el);
      if (el.hidden || style.display === "none") continue;
      const tag = el.tagName.toLowerCase();
      const type = (el as HTMLInputElement).type;
      const kind = tag === "select" ? "select" : tag === "fieldset" ? "group" : type === "file" ? "file" : "date";
      const mine = el.getAttribute("data-ui") === kind || (kind === "file" && !!el.closest('[data-ui="file"]'));
      const label = `${tag}${type && tag === "input" ? `[${type}]` : ""}#${el.id || el.getAttribute("name") || ""}`;
      if (!mine) found.push(`${label} is a native control`);
      else if (kind === "group" && parseFloat(style.borderTopWidth) > 0) found.push(`${label} has a frame with its legend on it`);
    }
    return found.slice(0, 8);
  });

test.describe("the shared components hold on every main screen", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("?token=e2e-token");
    await expect(page.getByRole("heading", { level: 2, name: "Needs you", exact: true })).toBeVisible(LOADED);
    // A line to review, so Today has the opened-line parts too.
    const handed = await page.request.post("api/handin", { data: { note: strings["web-02"] } });
    expect(handed.ok()).toBe(true);
  });

  for (const scheme of ["light", "dark"] as const) {
    test(`paragraph text, filled primaries, leading columns and the cursor, in ${scheme}`, async ({ page }) => {
      test.setTimeout(240_000);
      await page.emulateMedia({ colorScheme: scheme });
      const found: string[] = [];
      for (const size of SIZES) {
        await page.setViewportSize(size);
        await page.goto("?token=e2e-token");
        for (const screen of SCREENS) {
          await open(page, screen);
          const at = `${screen.name} at ${size.width}`;
          // The cursor is read as the screen opens, before anything is pressed.
          const field = await fieldWithCursor(page);
          if (field) found.push(`${at}: the cursor is in ${field}`);
          for (const small of await smallParagraphs(page)) found.push(`${at}: ${small}`);
          for (const crowd of await crowdedPrimaries(page)) found.push(`${at}: more than one filled primary: ${crowd}`);
          for (const lead of await emptyLeads(page)) found.push(`${at}: ${lead}`);
          for (const native of await nativeControls(page)) found.push(`${at}: ${native}`);
        }
      }
      expect(found).toEqual([]);
    });
  }
});
