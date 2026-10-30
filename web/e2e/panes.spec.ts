// The panes the shell opens beside or over a screen (design 7.1, 7.13): Hand something in as a drawer, Ask as a pane on a
// wide screen and a dialog below it, the stages board, and the phone's review mode.
import { expect, test, type Page } from "@playwright/test";
import { pressStart } from "./journey-helpers";

/** Opens Ask the way a person does: whatever is open (Ask from an earlier width) is closed first, then the header's search
 * field (on a phone, the bar's Search button first) and its Ask row. */
async function openAsk(page: Page) {
  const open = page.getByRole("dialog").or(page.getByRole("complementary", { name: /^Ask / }));
  for (let i = 0; i < 3 && (await open.count()) > 0; i++) await page.keyboard.press("Escape");
  await expect(open).toHaveCount(0);
  const field = page.getByRole("banner").getByRole("searchbox");
  const phone = page.getByRole("button", { name: "Search", exact: true }).first();
  await expect(field.or(phone)).toBeVisible();
  if (!(await field.isVisible())) await phone.click();
  await page.getByRole("searchbox").first().click();
  await page.getByRole("list", { name: "Results" }).getByRole("button", { name: /^Ask / }).click();
}

/** Opens the app the way a bookmark does: the address names the screen, so the app starts on it. */
async function signIn(page: Page, hash = "") {
  await page.goto(hash ? `?token=e2e-token#${hash}` : "?token=e2e-token");
  await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
}

const noSidewaysScroll = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

test.describe("Hand something in", () => {
  test("is a drawer from the right, about 640px wide, with Today still showing, and the box at most 72 characters wide", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await signIn(page);
    await page.getByRole("button", { name: "Hand something in" }).first().click();
    const drawer = page.getByRole("dialog", { name: "Hand something in" });
    await expect(drawer).toBeVisible();
    const box = (await drawer.boundingBox())!;
    expect(box.x + box.width).toBeGreaterThanOrEqual(1440 - 1);
    expect(box.width).toBeGreaterThan(560);
    expect(box.width).toBeLessThanOrEqual(641);
    await expect(drawer.getByLabel("Paste or type it here")).toBeFocused();
    // Today is behind it, not gone.
    await expect(page.getByRole("heading", { level: 1, name: "Today" })).toBeVisible();
    const field = (await drawer.getByLabel("Paste or type it here").boundingBox())!;
    expect(field.width).toBeLessThanOrEqual(box.width);
    await page.keyboard.press("Escape");
    await expect(drawer).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Hand something in" }).first()).toBeFocused();
  });

  test("handing something in takes three interactions, and the box is at most 72 characters wide", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await signIn(page);
    let handed = 0;
    page.on("request", (request) => {
      if (request.method() === "POST" && request.url().endsWith("/api/handin")) handed += 1;
    });
    // One: open it. Two: put the words in. Three: hand it in. Nothing else is asked before the request goes.
    await page.getByRole("button", { name: "Hand something in" }).first().click();
    const drawer = page.getByRole("dialog", { name: "Hand something in" });
    const box = drawer.getByLabel("Paste or type it here");
    await expect(box).toBeFocused();
    const measured = await box.evaluate((area) => {
      const probe = document.createElement("span");
      probe.style.cssText = `position:absolute;visibility:hidden;width:72ch;font:${getComputedStyle(area).font}`;
      area.parentElement!.append(probe);
      const limit = probe.getBoundingClientRect().width;
      probe.remove();
      return { width: area.getBoundingClientRect().width, limit };
    });
    expect(measured.width).toBeLessThanOrEqual(measured.limit + 1);
    await box.fill("Robin will send the index by Friday.");
    await drawer.getByRole("button", { name: "Hand in", exact: true }).click();
    await expect.poll(() => handed).toBe(1);
  });

  test("with words in the box, closing asks first, and Keep editing keeps them", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await signIn(page);
    await page.getByRole("button", { name: "Hand something in" }).first().click();
    const drawer = page.getByRole("dialog", { name: "Hand something in" });
    await drawer.getByLabel("Paste or type it here").fill("A note I have not handed in");
    await page.keyboard.press("Escape");
    await expect(drawer.getByRole("alert")).toBeVisible();
    await drawer.getByRole("button", { name: "Keep editing" }).click();
    await expect(drawer.getByLabel("Paste or type it here")).toHaveValue("A note I have not handed in");
  });

  test("is a full-screen sheet on a phone, with no sideways scrolling", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await signIn(page);
    await page.getByRole("navigation", { name: "Views" }).getByRole("button", { name: "Hand something in" }).click();
    const sheet = page.getByRole("dialog", { name: "Hand something in" });
    await expect(sheet).toBeVisible();
    const box = (await sheet.boundingBox())!;
    expect(Math.round(box.width)).toBe(390);
    expect(await noSidewaysScroll(page)).toBeLessThanOrEqual(0);
  });
});

test.describe("Ask", () => {
  for (const width of [1440, 1920]) {
    test(`is a pane over the screen's right edge at ${width}px: the page is not moved, the cursor is in the question, Escape closes it`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await signIn(page);
      const opener = page.getByRole("banner").getByRole("searchbox");
      // The pane is an overlay on the right edge (the drawer's width and surface): the page behind it is not moved or narrowed.
      const before = (await page.getByRole("main").boundingBox())!;
      await openAsk(page);
      const pane = page.getByRole("complementary", { name: /^Ask / });
      await expect(pane).toBeVisible();
      await expect(page.getByRole("dialog")).toHaveCount(0);
      await expect(pane.getByLabel("Your question")).toBeFocused();
      const paneBox = (await pane.boundingBox())!;
      expect(paneBox.x + paneBox.width).toBeGreaterThanOrEqual(width - 1);
      expect(paneBox.width).toBeGreaterThanOrEqual(419);
      expect(paneBox.width).toBeLessThanOrEqual(601);
      // The work stays where it was and reachable: the content keeps its place and width, and a link outside the pane still works.
      const main = (await page.getByRole("main").boundingBox())!;
      expect(Math.abs(main.x - before.x)).toBeLessThanOrEqual(1);
      expect(Math.abs(main.width - before.width)).toBeLessThanOrEqual(1);
      expect(await noSidewaysScroll(page)).toBeLessThanOrEqual(0);
      await page.getByRole("navigation", { name: "Views" }).getByRole("link", { name: /^People/ }).click();
      await expect(page.getByRole("heading", { level: 1, name: "People" })).toBeVisible();
      await expect(pane).toBeVisible();
      await pane.getByLabel("Your question").click();
      await page.keyboard.press("Escape");
      await expect(pane).toHaveCount(0);
      await expect(opener).toBeFocused();
    });
  }

  test("is a dialog below 1440px, as it was", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await signIn(page);
    await openAsk(page);
    await expect(page.getByRole("dialog", { name: /^Ask / })).toBeVisible();
    await expect(page.getByRole("complementary", { name: /^Ask / })).toHaveCount(0);
  });
});

test.describe("the stages board", () => {
  test("has a column for each stage, fills the width with no sideways scrolling, and a card moves by the key and its menu", async ({ page }) => {
    for (const width of [1024, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      await signIn(page, "work/stages");
      await expect(page.getByRole("heading", { level: 1, name: "Stages" })).toBeVisible();
      await page.getByRole("radio", { name: "Board" }).check();
      const board = page.getByRole("group", { name: /, by stage$/ }).first();
      await expect(board).toBeVisible();
      await expect(board.getByRole("heading", { level: 3 }).first()).toBeVisible();
      expect(await noSidewaysScroll(page)).toBeLessThanOrEqual(0);
      const frame = (await board.boundingBox())!;
      expect(frame.x + frame.width).toBeLessThanOrEqual(width);
    }
    // The move key, with the cursor on a card, opens that card's menu.
    const card = page.getByRole("group", { name: /, by stage$/ }).first().getByRole("listitem").first();
    await card.focus();
    await page.keyboard.press("m");
    await expect(page.getByRole("menu")).toBeVisible();
    await expect(page.getByRole("menuitem", { name: "History" })).toBeVisible();
    await page.keyboard.press("Escape");
  });

  test("on a phone the list is the start, one row for each item", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await signIn(page, "work/stages");
    await expect(page.getByRole("heading", { level: 1, name: "Stages" })).toBeVisible();
    await expect(page.getByRole("group", { name: /, by stage$/ })).toHaveCount(0);
    expect(await noSidewaysScroll(page)).toBeLessThanOrEqual(0);
  });
});

/** Hands in a note, so a change waits for a look whatever the other tests did before: the server's stand-in assistant files
 * it, and the change is in the list once the server says it is waiting for review. */
async function somethingToLookAt(page: Page) {
  const handed = await page.request.post("api/handin", { data: { note: `Check the proof copies before the phone review (${Date.now()}).` } });
  expect(handed.ok()).toBe(true);
  await expect
    .poll(async () => ((await (await page.request.get("api/changes")).json()) as Array<{ state: string }>).some((c) => c.state === "review"), { timeout: 30_000 })
    .toBe(true);
}

/** Hands in a known check-in through the demo API so the test has fresh messages waiting regardless of shared-server state. */
async function somethingToSend(page: Page, baseURL: string) {
  // Review mode is for going through several people: with one, Follow-ups shows their messages in place.
  const sections = async () => ((await (await page.request.get("api/followups")).json()) as Array<{ is_pm: boolean; to_send: number }>).filter((s) => !s.is_pm);
  const sentBefore = (await sections()).reduce((total, section) => total + section.to_send, 0);
  const cases = (await (await page.request.get(`${new URL(baseURL).origin}/__e2e/cases`)).json()) as Array<{ id: string; pasted?: string }>;
  const notes = cases.find((c) => c.id === "production-checkin");
  if (!notes?.pasted) throw new Error("The phone review test data is missing.");
  const handed = await page.request.post("api/handin", { data: { pasted: `${notes.pasted}\n(Phone review setup ${Date.now()}).` } });
  expect(handed.ok()).toBe(true);
  await expect
    .poll(async () => {
      const current = await sections();
      return current.filter((section) => section.to_send > 0).length >= 2 && current.reduce((total, section) => total + section.to_send, 0) > sentBefore;
    }, { timeout: 30_000 })
    .toBe(true);
}

/** Opens a screen after something was handed in, from a fresh load, so its list starts with what the server holds. */
async function openFresh(page: Page, hash: string) {
  await page.evaluate((h) => {
    window.location.hash = h;
  }, hash);
  await page.reload();
}

test.describe("the phone's review mode", () => {
  test("What changed is the history: it has no review mode on a phone, and no row has a button for the work", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await signIn(page);
    await somethingToLookAt(page);
    await openFresh(page, "work/changed");
    await expect(page.getByRole("heading", { level: 1, name: "What changed" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Review one at a time" })).toHaveCount(0);
    await expect(page.getByRole("main").getByRole("button", { name: "Looks good" })).toHaveCount(0);
    expect(await noSidewaysScroll(page)).toBeLessThanOrEqual(0);
  });

  test("goes through the messages waiting to be sent one person at a time, with the message's own Copy and Next across the bottom", async ({ page, baseURL }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await signIn(page);
    const sentBefore = ((await (await page.request.get("api/followups")).json()) as Array<{ is_pm: boolean; to_send: number }>)
      .filter((section) => !section.is_pm)
      .reduce((total, section) => total + section.to_send, 0);
    await somethingToSend(page, baseURL!);
    const sentAfter = ((await (await page.request.get("api/followups")).json()) as Array<{ is_pm: boolean; to_send: number }>)
      .filter((section) => !section.is_pm)
      .reduce((total, section) => total + section.to_send, 0);
    expect(sentAfter).toBeGreaterThan(sentBefore);
    await openFresh(page, "work/followups");
    await expect(page.getByRole("heading", { level: 1, name: "Follow-ups" })).toBeVisible();
    await expect(page.getByRole("status", { name: "Loading…" }), "Follow-ups should finish loading before its rows are checked").toHaveCount(0, { timeout: 20_000 });
    const rows = await page
      .getByRole("main")
      .getByRole("list")
      .first()
      .getByRole("listitem")
      .evaluateAll((items) =>
        items.map((item) => ({
          name: item.getAttribute("aria-label"),
          text: item.textContent?.trim() ?? "",
        })),
      );
    const otherPeople = rows.filter((row) => row.name && row.name !== "You");
    expect(otherPeople, `Follow-ups list needs a person other than you; rows shown: ${JSON.stringify(rows)}`).not.toHaveLength(0);

    const filterGroup = page.getByRole("group", { name: "Show" });
    const selectedFilters = await filterGroup.getByRole("button").evaluateAll((buttons) =>
      buttons.filter((button) => button.getAttribute("aria-pressed") === "true").map((button) => button.textContent?.trim()),
    );
    expect(selectedFilters, `Follow-ups filter should be To send; selected filters: ${JSON.stringify(selectedFilters)}`).toEqual(["To send"]);

    const byPerson = page.getByRole("radio", { name: "By person" });
    const groupedByPerson = await byPerson.isChecked();
    expect(groupedByPerson, `Follow-ups grouping should be By person; selected: ${groupedByPerson}`).toBe(true);

    const phoneLayout = await page.evaluate(() => ({
      width: window.innerWidth,
      narrow: document.documentElement.hasAttribute("data-narrow"),
    }));
    expect(phoneLayout.narrow, `Follow-ups phone layout at ${phoneLayout.width}px; data-narrow: ${phoneLayout.narrow}`).toBe(true);

    const start = page.getByRole("button", { name: "Send one at a time" });
    await expect(start).toBeVisible();
    await start.click();
    // One person at a time: their message, with its own Copy, and only Next in the bar.
    await expect(page.getByRole("textbox", { name: /^Message to / })).toBeVisible();
    await expect(page.getByRole("button", { name: "Copy message" }).last()).toBeVisible();
    const bar = page.getByRole("group", { name: "What to do with this one" });
    await expect(bar).toBeVisible();
    const box = (await bar.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(390);
    expect(box.y + box.height).toBeLessThanOrEqual(844);
    await expect(bar.getByRole("button", { name: "Next" })).toBeVisible();
    await expect(bar.getByRole("button", { name: "Looks good" })).toHaveCount(0);
    expect(await noSidewaysScroll(page)).toBeLessThanOrEqual(0);
    await page.getByRole("button", { name: "Back to the list" }).click();
    await expect(start).toBeVisible();
  });
});

test.describe("the walkthrough's look", () => {
  test("fields are as wide as what they hold, the list marks where you are and says nothing is 'not done yet', and a step is one centered column", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1920, height: 1000 });
    await signIn(page, "setup");
    await expect(page.getByRole("heading", { level: 1, name: "Getting started" })).toBeVisible();
    await pressStart(page);
    const steps = page.getByRole("navigation", { name: "Setup steps" });
    await steps.getByRole("button", { name: /^Mail and calendar/ }).click();
    await steps.getByRole("button", { name: /^You/ }).first().click();
    const main = page.getByRole("main");
    await expect(main.getByRole("heading", { level: 2, name: "You" })).toBeVisible();
    const name = main.getByLabel("Your full name");
    await expect(name).toBeVisible();
    const field = (await name.boundingBox())!;
    expect(field.width).toBeLessThanOrEqual(361);
    await expect(page.getByText("Not done yet")).toHaveCount(0);
    await expect(steps.getByText("You are here")).toHaveCount(1);
    // A step is one centered column of 640 to 720px, its explanation above its fields.
    const column = await main.getByRole("heading", { level: 2, name: "You" }).evaluate((h) => h.parentElement!.getBoundingClientRect().width);
    expect(column).toBeGreaterThanOrEqual(600);
    expect(column).toBeLessThanOrEqual(721);
    const why = main.locator("p").filter({ hasText: /./ }).first();
    const whyBox = (await why.boundingBox())!;
    expect(whyBox.y).toBeLessThan(field.y);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  });
});
