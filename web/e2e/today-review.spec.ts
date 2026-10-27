// A review happens on Today (design 7.7; the UI/UX reviewer's second pass, G2, G11 and G12, checks U14, U17 and U18): Look over
// opens a batch in the details and never leaves Today, All looks good takes the line away without adding one, a phone gives
// a line's title its width (at least 25 characters at 390px), and a row's action is tonal in both themes with only the line
// that has the cursor filled. The queue is served by the test, so the checks are of the screen and not of the demo's data;
// it has the server of Today's capacity, which no other scenario has added lines to.
import { expect, test, type Page } from "@playwright/test";

const base = { untrusted: false, unpriced: 0, actions: [] as string[], questions: [] as string[], outcome: {}, count: 1 };
const spine = { record: "ACT-1", owners: ["Robin Sample"], reporter: "Robin Sample", told: [] as string[] };

const todo = (n: number, text: string) => ({ ...base, key: `item:CS-1:${n}`, group: "review", kind: "batch_item", what: "action", text, request: "REQ-1", changeset: "CS-1", op: n });
const review = {
  ...base,
  key: "review:REQ-1",
  group: "review",
  kind: "review",
  count: 3,
  request: "REQ-1",
  changeset: "CS-1",
  changesets: ["CS-1"],
  outcome: { actions_added: 3 },
  untrusted: true,
  title: { kind: "email", person_name: "Robin Sample", topic: "spine options" },
  items: [todo(0, "Send two spine options"), todo(1, "Book the proof run"), todo(2, "Confirm the hall")],
};
const lines = [
  { ...base, key: "decision:Q-1", group: "decide", kind: "decision", text: "Cover finish for the hardcover: matte or soft-touch?", question: "Q-1" },
  {
    ...base,
    key: "held:CS-1:0",
    group: "decide",
    kind: "held",
    changeset: "CS-7",
    op: 0,
    text: "Close 'Send two spine options'",
    untrusted: true,
    held: { ask: "close", item: "Send two spine options", quote: "the spine options are in the shared folder and the printer has them", ...spine },
  },
  {
    ...base,
    key: "held:CS-2:0",
    group: "decide",
    kind: "held",
    changeset: "CS-8",
    op: 0,
    text: "Drop 'Confirm the seating plan for the launch reading'",
    untrusted: true,
    held: { ask: "drop", item: "Confirm the seating plan for the launch reading", quote: "the seating plan is no longer needed, we dropped the reading", ...spine, told: ["Casey Moor"], told_on: "2026-10-10" },
  },
  { ...base, key: "overdue:ACT-9", group: "risk", kind: "overdue", subject: "Approve the back-cover copy for the hardcover edition", actions: ["ACT-9"] },
  review,
];

async function signIn(page: Page) {
  await page.goto("?token=e2e-token");
  await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
  await page.evaluate(() => {
    window.location.hash = "today";
  });
}

async function serve(page: Page, queue: () => unknown[]) {
  await page.route("**/api/today/queue", (route) => route.fulfill({ json: queue() }));
}

test.describe("A review happens on Today", () => {
  test("Look over opens the batch on Today and keeps the address, All looks good takes the line away and adds none", async ({ page }) => {
    let gone = false;
    await serve(page, () => (gone ? lines.filter((l) => l.kind !== "review") : lines));
    let confirmed: unknown = null;
    await page.route("**/api/changesets/confirm", async (route) => {
      confirmed = route.request().postDataJSON();
      gone = true;
      await route.fulfill({ json: { changesets: ["CS-1"], signals: ["SIG-1"] } });
    });
    await page.setViewportSize({ width: 1280, height: 900 });
    await signIn(page);
    const rows = page.locator("[data-queue-line]");
    await expect(rows.first()).toBeVisible();
    const before = await rows.count();
    const row = page.locator('[data-queue-line="review"]');
    await row.getByRole("button", { name: "Look over", exact: true }).click();
    // Nothing navigated, and nothing was written by looking.
    expect(new URL(page.url()).hash).toBe("#today");
    await expect(row.getByText("Send two spine options")).toBeVisible();
    await expect(row.getByRole("button", { name: /^Not right/ })).toHaveCount(3);
    // What came from outside is said once, here, and not as a tag on the line.
    await expect(row.getByText("treats what's in this email as information, never as instructions.")).toBeVisible();
    await expect(page.locator("[data-outside]")).toHaveCount(0);
    expect(confirmed).toBeNull();
    expect(await rows.count()).toBe(before);
    await row.getByRole("button", { name: "All looks good" }).click();
    await expect(page.locator('[data-queue-line="review"]')).toHaveCount(0);
    expect(confirmed).toEqual({ changesets: ["CS-1"] });
    // The count went down by one, and never up.
    expect(await rows.count()).toBe(before - 1);
    expect(new URL(page.url()).hash).toBe("#today");
    await page.unrouteAll({ behavior: "ignoreErrors" });
  });

  for (const size of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
    test(`Not right opens its note with Send back fully in view at ${size.width}px, with the box at most 72 characters wide`, async ({ page }) => {
      await serve(page, () => lines);
      await page.setViewportSize(size);
      await signIn(page);
      const row = page.locator('[data-queue-line="review"]');
      await row.getByRole("button", { name: "Look over", exact: true }).click();
      await row.getByRole("button", { name: /^Not right/ }).first().click();
      const note = row.getByRole("textbox").first();
      await expect(note).toBeFocused();
      await note.fill("Ask me before adding this one.");
      const send = row.getByRole("button", { name: "Send back", exact: true });
      await expect(send).toBeEnabled();
      const window_ = await page.evaluate(() => ({ width: window.innerWidth, height: window.innerHeight }));
      // The button can be brought whole into the window. The pane may still be settling after the note opens, so it is
      // scrolled to and measured again until the layout holds still.
      await expect
        .poll(async () => {
          await send.scrollIntoViewIfNeeded();
          const b = (await send.boundingBox())!;
          return b.y >= 0 && b.y + b.height <= window_.height;
        })
        .toBe(true);
      // The button is inside the window, in both directions, whole.
      const box = (await send.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(window_.width);
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.y + box.height).toBeLessThanOrEqual(window_.height);
      const fit = await note.evaluate((area) => {
        const probe = document.createElement("span");
        probe.style.cssText = `position:absolute;visibility:hidden;width:72ch;font:${getComputedStyle(area).font}`;
        area.parentElement!.append(probe);
        const limit = probe.getBoundingClientRect().width;
        probe.remove();
        return { width: area.getBoundingClientRect().width, limit };
      });
      expect(fit.width).toBeLessThanOrEqual(fit.limit + 1);
    });
  }

  test("at 390px every queue title shows at least 25 characters, with the actions under it", async ({ page }) => {
    await serve(page, () => lines);
    await page.setViewportSize({ width: 390, height: 844 });
    await signIn(page);
    const rows = page.locator("[data-queue-line]");
    await expect(rows.first()).toBeVisible();
    await expect(rows).toHaveCount(lines.length);
    const shown = await rows.evaluateAll((els) =>
      els.map((row) => {
        const title = row.querySelector<HTMLElement>("div[class*='title']");
        const actions = row.querySelector<HTMLElement>("div[class*='actions']");
        if (!title) return { kind: row.getAttribute("data-queue-line"), chars: 0, under: false, wide: false };
        const box = title.getBoundingClientRect();
        const range = document.createRange();
        const walker = document.createTreeWalker(title, NodeFilter.SHOW_TEXT);
        let chars = 0;
        for (let node = walker.nextNode(); node; node = walker.nextNode()) {
          const text = node.textContent ?? "";
          for (let i = 0; i < text.length; i++) {
            range.setStart(node, i);
            range.setEnd(node, i + 1);
            const r = range.getBoundingClientRect();
            if (r.width > 0 && r.bottom <= box.bottom + 0.5 && r.right <= box.right + 0.5) chars++;
          }
        }
        const a = actions?.getBoundingClientRect();
        return {
          kind: row.getAttribute("data-queue-line"),
          chars,
          under: !!a && a.top >= box.bottom - 1,
          wide: !!a && a.width >= row.getBoundingClientRect().width * 0.8,
        };
      }),
    );
    for (const line of shown) {
      expect(line.chars, JSON.stringify(shown)).toBeGreaterThanOrEqual(25);
      expect(line.under, `${line.kind}: its actions sit under its title`).toBe(true);
      expect(line.wide, `${line.kind}: its actions are at full width`).toBe(true);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.unrouteAll({ behavior: "ignoreErrors" });
  });

  for (const scheme of ["light", "dark"] as const) {
    test(`in ${scheme} mode a row's action is tonal, and only the line with the cursor has the filled one`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await serve(page, () => lines);
      await page.setViewportSize({ width: 1280, height: 900 });
      await signIn(page);
      const rows = page.locator("[data-queue-line]");
      await expect(rows.first()).toBeVisible();
      await expect(rows).toHaveCount(lines.length);
      // The cursor starts on the first line.
      await expect(rows.first()).toBeFocused();
      const found = await page.evaluate(() => {
        const probe = (property: "backgroundColor" | "color", value: string) => {
          const el = document.createElement("div");
          el.style[property] = value;
          document.body.append(el);
          const out = getComputedStyle(el)[property];
          el.remove();
          return out;
        };
        const buttons = [...document.querySelectorAll<HTMLElement>("[data-queue-line]")].map((row) => row.querySelector<HTMLElement>("[data-key='primary']"));
        return {
          filled: probe("backgroundColor", "var(--accent)"),
          tonal: probe("backgroundColor", "var(--row-action-bg)"),
          tonalText: probe("color", "var(--row-action-text)"),
          deep: probe("backgroundColor", "var(--brand-900)"),
          light: probe("color", "var(--brand-200)"),
          backgrounds: buttons.map((b) => (b ? getComputedStyle(b).backgroundColor : null)),
          texts: buttons.map((b) => (b ? getComputedStyle(b).color : null)),
        };
      });
      const withButton = found.backgrounds.filter((b) => b !== null);
      expect(withButton.length).toBeGreaterThan(2);
      expect(withButton.filter((b) => b === found.filled), JSON.stringify(found)).toHaveLength(1);
      expect(withButton.filter((b) => b === found.tonal)).toHaveLength(withButton.length - 1);
      expect(found.tonal).not.toBe(found.filled);
      // The tonal ones are the deep fill with the light brand text by night, the soft fill with the accent's text by day.
      expect(found.texts[found.backgrounds.findIndex((b) => b === found.tonal)]).toBe(found.tonalText);
      if (scheme === "dark") {
        expect(found.tonal).toBe(found.deep);
        expect(found.tonalText).toBe(found.light);
      }
      await page.unrouteAll({ behavior: "ignoreErrors" });
    });
  }
});
