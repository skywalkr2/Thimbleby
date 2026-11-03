// Today and the work screens, as the re-sweep's second round read them (X86 to X93, with X14, X24 and X44): a title is short and
// whole, a count is the count of the rows beside it, a question is asked once, the Follow-ups band lists only what still waits on
// the person, the evening wrap-up's Moved lists only what was moved, an unfinished setup is what Today says is next, the phone
// shows every word of a line and the opened review without anything over anything, and no account is named by its address.
// It runs on the layout server (long made-up text, setup unfinished); the lines it needs that the server doesn't hold are
// answered by the page's own route.
import { expect, test, type Page } from "@playwright/test";

const LOADED = { timeout: 20_000 };
/** Made-up addresses are built from this, so no address is written out whole. */
const WEB = "https" + "://";
const HOST_AND_PORT = /\b\d{1,3}(?:\.\d{1,3}){3}:\d{2,5}\b|\blocalhost:\d{2,5}\b/;

const open = async (page: Page, hash = "today") => {
  await page.goto(`?token=e2e-token#${hash}`);
  await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible(LOADED);
};

test.describe("Today and the work screens", () => {
  test("no row's title is longer than a short title, though the words behind it are thousands of characters (X86)", async ({ page }) => {
    await open(page);
    await expect(page.locator("[data-queue-line]").first()).toBeVisible(LOADED);
    const longest = await page.evaluate(() => Math.max(...Array.from(document.querySelectorAll("[data-queue-line] *")).filter((el) => el.children.length === 0).map((el) => (el.textContent ?? "").length)));
    expect(longest).toBeLessThan(260);
    // And no title ends in a full stop and a comma, or says a day twice.
    const text = await page.evaluate(() => document.body.innerText);
    expect(text).not.toMatch(/\.,/);
  });

  test("the to-dos screen counts what its tab counts, in words that name them (X87)", async ({ page }) => {
    await open(page, "work/open");
    const line = page.locator("[data-need-count]");
    await expect(line).toBeVisible(LOADED);
    const said = /^(\d+) of these (\d+) to-dos? needs? you$|^None of these (\d+) to-dos waits on you$/.exec((await line.innerText()).trim());
    expect(said, await line.innerText()).not.toBeNull();
    const total = Number(said?.[2] ?? said?.[3]);
    const tab = await page.getByRole("button", { name: /^To-dos\b/ }).first().innerText();
    expect(Number(/(\d+)\s*$/.exec(tab)?.[1])).toBe(total);
    // The line under the title says the same open count.
    const opened = await page.getByText(/^\d+ open\b/).first().innerText();
    expect(Number(/^(\d+)/.exec(opened)?.[1])).toBe(total);
  });

  test("setup's count is the seven steps on Today's line and in the walkthrough alike (X87)", async ({ page }) => {
    await open(page);
    const line = page.getByRole("region", { name: "Setup", exact: true });
    await expect(line).toContainText(/\d+ of 7 done/, LOADED);
    await line.getByRole("button", { name: "Continue setup" }).click();
    await expect(page.getByText(/^Step \d of 7$/)).toBeVisible(LOADED);
    await expect(page.getByText(/ of 8\b/)).toHaveCount(0);
  });

  test("a name to place is asked on one line, and the lists to look over don't ask it again (X88)", async ({ page }) => {
    await open(page);
    const queue = (await (await page.request.get("api/today/queue")).json()) as Array<{ kind: string; text?: string; changeset?: string; op?: number; items?: Array<{ kind: string; changeset?: string; op?: number }> }>;
    const names = queue.filter((line) => line.kind === "who_is").map((line) => (line.text ?? "").trim().toLowerCase());
    expect(new Set(names).size).toBe(names.length);
    const asked = new Set(queue.filter((line) => line.kind === "who_is").map((line) => `${line.changeset}:${line.op}`));
    for (const line of queue.filter((l) => l.kind === "intake_review" || l.kind === "review")) {
      for (const item of line.items ?? []) expect(asked.has(`${item.changeset}:${item.op}`) && item.kind === "held").toBe(false);
    }
  });

  test("the Follow-ups band lists only to-dos that still wait on the person (X89)", async ({ page }) => {
    await open(page, "work/followups");
    await expect(page.getByRole("heading", { name: "Follow-ups", level: 1 })).toBeVisible(LOADED);
    const sections = (await (await page.request.get("api/followups")).json()) as Array<{ is_pm: boolean; actions: Array<{ text: string; due_soon?: boolean; to_send: boolean; chase_due: boolean }> }>;
    const settled = sections.flatMap((s) => (s.is_pm ? [] : s.actions.filter((a) => a.due_soon && !a.to_send && !a.chase_due).map((a) => a.text)));
    for (const tab of ["To send", "Waiting on them", "Later"]) {
      const button = page.getByRole("button", { name: tab, exact: false }).first();
      if (await button.count()) await button.click();
      const bands = await page.locator("[data-due-soon]").allInnerTexts();
      for (const words of settled) expect(bands.join("\n"), `${tab}: ${words}`).not.toContain(words);
    }
  });

  test("the evening wrap-up's Moved section holds what was moved, and what is still open has its own (X90)", async ({ page }) => {
    await open(page);
    const brief = (await (await page.request.get("api/brief?form=evening")).json()) as { sections?: Array<{ key: string; lines: Array<{ kind: string }> }> };
    for (const section of brief.sections ?? []) {
      if (section.key === "moved") expect(section.lines.every((l) => l.kind === "moved_ahead")).toBe(true);
      if (section.key === "carried") expect(section.lines.every((l) => l.kind === "carried")).toBe(true);
    }
  });

  test("with setup unfinished and nothing for the person, Today says what is next in setup, not that nothing needs them (X91)", async ({ page }) => {
    await page.route("**/api/today/queue*", (route) => route.fulfill({ json: [] }));
    await open(page);
    await expect(page.locator('[data-queue-empty="setup"]')).toContainText(/Next in setup: /, LOADED);
    await expect(page.getByText(/Nothing needs you/)).toHaveCount(0);
    // The heading's own line says it too, beside the date.
    await expect.poll(() => page.getByText(/Next in setup/).count(), LOADED).toBeGreaterThanOrEqual(2);
    await page.locator('[data-queue-empty="setup"]').getByRole("button", { name: "Continue setup" }).click();
    await expect(page.getByText(/^Step \d of 7$/)).toBeVisible(LOADED);
  });

  test("on a phone every line shows its whole title under its mark, and the opened review has nothing over anything (X92)", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("?token=e2e-token");
    await expect(page.locator("[data-queue-line]").first()).toBeVisible(LOADED);
    const faults = await page.evaluate(() => {
      const found: string[] = [];
      for (const row of Array.from(document.querySelectorAll("[data-queue-line]"))) {
        for (const el of Array.from(row.querySelectorAll("*"))) {
          if (el.children.length > 0 || !(el.textContent ?? "").trim() || el.closest("button")) continue;
          const style = getComputedStyle(el);
          const clamped = style.getPropertyValue("-webkit-line-clamp") !== "none" && style.getPropertyValue("-webkit-line-clamp") !== "";
          if (clamped || (style.textOverflow === "ellipsis" && el.scrollWidth > el.clientWidth + 1) || (style.overflow === "hidden" && el.scrollHeight > el.clientHeight + 1)) {
            found.push(`${row.getAttribute("data-queue-line")}: ${(el.textContent ?? "").slice(0, 30)} is cut`);
          }
        }
        // The mark is above the words, not beside them in a narrow column.
        const pill = row.querySelector("[data-pill]");
        if (pill) {
          const walker = document.createTreeWalker(row, NodeFilter.SHOW_TEXT);
          for (let node = walker.nextNode(); node; node = walker.nextNode()) {
            if (pill.contains(node) || !(node.textContent ?? "").trim() || (node.parentElement as HTMLElement).closest("button")) continue;
            const range = document.createRange();
            range.selectNodeContents(node);
            if (range.getBoundingClientRect().top < pill.getBoundingClientRect().bottom - 1 && row.getAttribute("data-queue-line") !== "backup") {
              found.push(`${row.getAttribute("data-queue-line")}: words beside the mark`);
            }
            break;
          }
        }
      }
      return found;
    });
    expect(faults).toEqual([]);
    const review = page.locator('[data-queue-line="review"], [data-queue-line="intake_review"]').first();
    await review.getByRole("button", { name: "Look over", exact: true }).click();
    const overlaps = await page.evaluate(() => {
      const found: string[] = [];
      for (const item of Array.from(document.querySelectorAll("[data-batch-item]"))) {
        const boxes = Array.from(item.children).map((c) => c.getBoundingClientRect()).filter((b) => b.width > 0 && b.height > 0);
        boxes.forEach((a, i) =>
          boxes.slice(i + 1).forEach((b) => {
            if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1) found.push((item.textContent ?? "").slice(0, 30));
          }),
        );
      }
      return found;
    });
    expect(overlaps).toEqual([]);
  });

  test("no account is named by a host and a port (X93)", async ({ page }) => {
    for (const hash of ["today", "settings/ai", "records/projects"]) {
      await open(page, hash);
      await page.waitForTimeout(500);
      const text = await page.evaluate(() => document.body.innerText);
      expect(text, hash).not.toMatch(HOST_AND_PORT);
    }
  });

  test("a clash of two connected events still opens each, and says where to change them (X24)", async ({ page }) => {
    const clash = {
      key: "clash:a:b:2026-11-09",
      group: "risk",
      kind: "clash",
      count: 1,
      untrusted: false,
      unpriced: 0,
      actions: [],
      questions: [],
      outcome: {},
      text: "Site visit",
      other: "Supplier call",
      state: "overlap",
      minutes: 30,
      due: "2026-11-09",
      at: "2026-11-09T11:00:00+00:00",
      starts: "2026-11-09T10:30:00+00:00",
      ends: "2026-11-09T11:30:00+00:00",
      other_starts: "2026-11-09T11:00:00+00:00",
      other_ends: "2026-11-09T12:00:00+00:00",
      source_name: "Work calendar",
      other_source_name: "Home calendar",
      event_page: "s1@2026-11-09T10:30:00+00:00",
      other_event_page: "s2@2026-11-09T11:00:00+00:00",
      calendar_link: `${WEB}calendar.example.com/e/1`,
      other_calendar_link: `${WEB}calendar.example.com/e/2`,
    };
    await page.route("**/api/today/queue*", (route) => route.fulfill({ json: [clash] }));
    await open(page);
    const row = page.locator('[data-queue-line="clash"]');
    await expect(row).toBeVisible(LOADED);
    await row.getByRole("button", { name: /More|menu/i }).click();
    await page.getByRole("menuitem", { name: "Look closer" }).click();
    const first = page.getByRole("group", { name: "Site visit" });
    await expect(first.getByRole("link", { name: "Open" })).toHaveAttribute("href", /calendar-event/);
    await expect(first).toContainText("Change it in your calendar app");
    await expect(page.getByRole("group", { name: "Supplier call" }).getByRole("link", { name: "Open" })).toHaveAttribute("href", /calendar-event/);
  });
});
