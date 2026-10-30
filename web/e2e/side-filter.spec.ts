// The side filter changes what each screen shows (design 6.32, 7.8): with a job and a business beside Personal, choosing a side on
// Today, To-dos and questions, Follow-ups and the Schedule shows what is on that side, and what is on no side shows under every
// choice. The server (`--sides`) holds a to-do, a question and another person's promise on each side, one to-do on none, a calendar
// for the job and one for the business, and two meetings of the business calendar that clash; /__e2e/sides says what they are called.
import { expect, test, type Page } from "@playwright/test";

const LOADED = { timeout: 20_000 };

interface Seeded {
  enabled: boolean;
  sides: Record<"personal" | "job" | "business", { id: string; name: string }>;
  todos: Record<"personal" | "job" | "business" | "none", string>;
  questions: Record<"personal" | "job" | "business", string>;
  promises: Record<"personal" | "job" | "business", string>;
  owed_by: Record<"personal" | "job" | "business", string>;
  meetings: Record<"job" | "business", string[]>;
}

type Side = "personal" | "job" | "business";
const SIDES: Side[] = ["personal", "job", "business"];

let seeded: Seeded;

const go = (page: Page, hash: string) =>
  page.evaluate((to) => {
    window.location.hash = to;
  }, hash);

/** Picks a choice of the side filter by the name it shows. */
async function choose(page: Page, choice: "all" | Side) {
  const name = choice === "all" ? "All" : seeded.sides[choice].name;
  await page.getByRole("radio", { name: new RegExp(`^${name}(,|$)`) }).click();
  await expect(page.getByRole("radio", { name: new RegExp(`^${name}(,|$)`), checked: true })).toBeVisible();
}

const heading = (page: Page, name: string) => expect(page.getByRole("heading", { level: 1, name, exact: true })).toBeVisible(LOADED);

/** What a screen shows under each choice: for every choice, the words that must be there and the ones that must not. Whatever
 * is on no side is in `always`, and shows under every choice. */
async function expectUnder(page: Page, region: ReturnType<Page["locator"]>, shown: Record<"all" | Side, string[]>, hidden: Record<"all" | Side, string[]>) {
  for (const choice of ["all", ...SIDES] as const) {
    await choose(page, choice);
    for (const text of shown[choice]) await expect(region.getByText(text).first(), `${choice} shows "${text}"`).toBeVisible(LOADED);
    for (const text of hidden[choice]) await expect(region.getByText(text), `${choice} hides "${text}"`).toHaveCount(0, LOADED);
  }
}

/** For each choice, the words on that side (and, under All, all of them) against the words on the other sides. */
function bySide(words: Record<Side, string[]>, always: string[] = []) {
  const everything = SIDES.flatMap((s) => words[s]);
  const shown: Record<"all" | Side, string[]> = { all: [...everything, ...always], personal: [], job: [], business: [] };
  const hidden: Record<"all" | Side, string[]> = { all: [], personal: [], job: [], business: [] };
  for (const side of SIDES) {
    shown[side] = [...words[side], ...always];
    hidden[side] = SIDES.filter((s) => s !== side).flatMap((s) => words[s]);
  }
  return { shown, hidden };
}

test.describe("The side filter changes what the screens show", () => {
  test.beforeAll(async ({ request }) => {
    seeded = await (await request.get("__e2e/sides")).json();
    expect(seeded.enabled).toBe(true);
  });

  test.beforeEach(async ({ page }) => {
    await page.goto("?token=e2e-token");
    await expect(page.getByRole("radiogroup").first()).toBeVisible(LOADED);
  });

  test("Today: a clash of one calendar, that calendar's meetings and the promises owed show only under their side; a line on no side shows under every choice", async ({ page }) => {
    test.setTimeout(120_000);
    await go(page, "today");
    await heading(page, "Today");
    const main = page.locator("main");
    // The backup line is the app's own: on no side, so under every choice. The clash is between two meetings of the business
    // calendar: on the business side alone. The meetings are tomorrow, so the card lists none of them; its footer counts them.
    await expect(main.getByText("Back up your work")).toBeVisible(LOADED);
    const { shown, hidden } = bySide({ personal: [], job: [], business: ["Sort out the clash"] }, []);
    await expectUnder(page, main, shown, hidden);
    // The Tomorrow footer counts only the chosen side's meetings.
    const footer: Record<"all" | Side, string> = { all: "Tomorrow: 3 entries", personal: "Nothing scheduled tomorrow.", job: "Tomorrow: 1 entry", business: "Tomorrow: 2 entries" };
    for (const choice of ["all", ...SIDES] as const) {
      await choose(page, choice);
      await expect(main.getByText(footer[choice], { exact: true }), `${choice} footer`).toBeVisible(LOADED);
    }
    for (const choice of ["all", ...SIDES] as const) {
      await choose(page, choice);
      await expect(main.getByText("Back up your work"), `${choice} shows the backup line`).toBeVisible(LOADED);
    }
    // The evening wrap-up lists the promises owed; it is there at some hours only, and where it is, each is under its side.
    await choose(page, "all");
    if ((await main.getByText(seeded.promises.business).count()) > 0) {
      const promises = bySide({ personal: [seeded.promises.personal], job: [seeded.promises.job], business: [seeded.promises.business] });
      await expectUnder(page, main, promises.shown, promises.hidden);
    }
  });

  test("To-dos and questions: each to-do and each question is under its side, and a to-do on no side is under every choice", async ({ page }) => {
    test.setTimeout(120_000);
    await go(page, "work/open");
    await heading(page, "To-dos and questions");
    const main = page.locator("main");
    await expect(main.getByText(seeded.todos.personal)).toBeVisible(LOADED);
    // The to-dos of the person and the promises others made to them, by side; the one on no side shows in all four.
    const todos = bySide(
      {
        personal: [seeded.todos.personal, seeded.promises.personal],
        job: [seeded.todos.job, seeded.promises.job],
        business: [seeded.todos.business, seeded.promises.business],
      },
      [seeded.todos.none],
    );
    await expectUnder(page, main, todos.shown, todos.hidden);
    await main.getByRole("button", { name: /^Questions/ }).click();
    const questions = bySide({ personal: [seeded.questions.personal], job: [seeded.questions.job], business: [seeded.questions.business] });
    await expectUnder(page, main, questions.shown, questions.hidden);
  });

  test("Follow-ups: the questions waiting for the person's answer are under their side", async ({ page }) => {
    test.setTimeout(120_000);
    await go(page, "work/followups");
    await heading(page, "Follow-ups");
    const main = page.locator("main");
    await expect(main.getByText(seeded.questions.personal)).toBeVisible(LOADED);
    const questions = bySide({ personal: [seeded.questions.personal], job: [seeded.questions.job], business: [seeded.questions.business] });
    await expectUnder(page, main, questions.shown, questions.hidden);
  });

  test("the Schedule: each calendar's meetings are under the side it serves", async ({ page }) => {
    test.setTimeout(120_000);
    await go(page, "schedule");
    await heading(page, "Schedule");
    const main = page.locator("main");
    // The meetings are tomorrow: the day view moves one day on.
    await page.getByRole("radio", { name: "Day", exact: true }).click();
    await page.getByRole("button", { name: /^Next/ }).first().click();
    await expect(main.getByText(seeded.meetings.job[0]).first()).toBeVisible(LOADED);
    const meetings = bySide({ personal: [], job: [seeded.meetings.job[0]], business: [seeded.meetings.business[0], seeded.meetings.business[1]] });
    await expectUnder(page, main, meetings.shown, meetings.hidden);
  });
});
