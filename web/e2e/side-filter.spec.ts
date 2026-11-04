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
  views: { project: string; todo: string; only_project: string; only_todo: string; first: string; second: string };
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
  const radio = page.getByRole("radio", { name: new RegExp(`^${name}(,|$)`) });
  // Four short choices are a strip; more, or a long name, are the one Side button and its sheet (at every width).
  const button = page.getByRole("button", { name: /^Side: / }).first();
  const pickInSheet = async () => {
    await button.click();
    await page.getByRole("dialog", { name: "Show one side" }).locator("[data-side-option]").filter({ hasText: new RegExp(`^${name}`) }).first().click();
  };
  // A short list has no filter bar (a list of fewer than a dozen rows has nothing worth narrowing), but the pick is the app's one,
  // remembered in this window: it is made where the bar is (Today) and the screen is then read under it.
  const offered = (await radio.isVisible().catch(() => false)) || (await button.isVisible().catch(() => false));
  if (!offered) {
    const here = await page.evaluate(() => window.location.hash.replace(/^#/, ""));
    await go(page, "today");
    await expect(button.or(radio)).toBeVisible(LOADED);
    if (await button.isVisible().catch(() => false)) await pickInSheet();
    else await radio.click();
    await go(page, here);
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible(LOADED);
    return;
  }
  if (await button.isVisible().catch(() => false)) {
    await pickInSheet();
    return;
  }
  await radio.click();
  // Choosing All on a short list takes the bar away with the pick, so only a side is read back as checked.
  if (choice !== "all") await expect(page.getByRole("radio", { name: new RegExp(`^${name}(,|$)`), checked: true })).toBeVisible();
}

const heading = (page: Page, name: string | RegExp) => expect(page.getByRole("heading", { level: 1, name, exact: true })).toBeVisible(LOADED);

/** What a screen shows under each choice: for every choice, the words that must be there and the ones that must not. Whatever
 * is on no side is in `always`, and shows under every choice. */
async function expectUnder(page: Page, region: ReturnType<Page["locator"]>, shown: Record<"all" | Side, string[]>, hidden: Record<"all" | Side, string[]>) {
  // The sides first and All last: a side that is picked keeps the filter bar on a short list, and All takes it away.
  for (const choice of [...SIDES, "all"] as const) {
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
    await heading(page, /^Good (morning|afternoon|evening)/);
    const main = page.locator("main");
    // The backup line is the app's own: on no side, so under every choice. The clash is between two meetings of the business
    // calendar: on the business side alone. The meetings are tomorrow, so the card lists none of them; its footer counts them.
    await expect(main.getByText("Back up your work")).toBeVisible(LOADED);
    const { shown, hidden } = bySide({ personal: [], job: [], business: ["overlap"] }, []);
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
    // All took the filter bar away (a short list); a side is picked again, where the bar is always drawn, before the other tab opens.
    await choose(page, "personal");
    await main.getByRole("button", { name: /^Questions/ }).click();
    const questions = bySide({ personal: [seeded.questions.personal], job: [seeded.questions.job], business: [seeded.questions.business] });
    await expectUnder(page, main, questions.shown, questions.hidden);
  });

  test("Follow-ups: only other people are listed, and the promises they made are under their side", async ({ page }) => {
    test.setTimeout(120_000);
    // The pick is the app's one and is made where the bar is always drawn (Today): a side that is picked keeps the bar on a short list,
    // so the tab chosen below is not lost to a trip back to Today.
    await choose(page, "personal");
    await go(page, "work/followups");
    await heading(page, "Follow-ups");
    const main = page.locator("main");
    // The person's own questions and to-dos are one row that opens To-dos and questions, never listed here.
    await expect(main.getByRole("link", { name: "Your own to-dos" })).toBeVisible(LOADED);
    for (const side of SIDES) await expect(main.getByText(seeded.questions[side])).toHaveCount(0);
    await page.getByRole("button", { name: "Waiting on them" }).click();
    // The list is by person, each with the promises waiting on them: under a side, only the people who owe something on it.
    await expect(main.getByText(seeded.owed_by.personal).first()).toBeVisible(LOADED);
    const owing = bySide({ personal: [seeded.owed_by.personal], job: [seeded.owed_by.job], business: [seeded.owed_by.business] });
    await expectUnder(page, main, owing.shown, owing.hidden);
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

  test("Views: a project in two views shows its to-do under each, one in a single view only under that view, and nothing drops on the switch", async ({ page }) => {
    test.setTimeout(120_000);
    await go(page, "work/open");
    await heading(page, "To-dos and questions");
    const main = page.locator("main");
    const { views, todos, sides } = seeded;
    await expect(main.getByText(views.todo)).toBeVisible(LOADED);
    const pickView = async (view: string) => {
      const name = new RegExp(`^${`${sides.job.name}: ${view}`.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(,|$)`);
      // The views are in the filter bar, which a short list draws only while a side is picked; with many choices they are in the Side sheet.
      const button = page.getByRole("button", { name: /^Side: / }).first();
      const radio = page.getByRole("radio", { name });
      if (!(await button.isVisible().catch(() => false)) && !(await radio.isVisible().catch(() => false))) await choose(page, "job");
      await expect(button.or(radio)).toBeVisible(LOADED);
      if (await button.isVisible().catch(() => false)) {
        await button.click();
        await page.getByRole("dialog", { name: "Show one side" }).locator("[data-side-option]").filter({ hasText: `${sides.job.name}: ${view}` }).first().click();
        return;
      }
      await radio.click();
      await expect(page.getByRole("radio", { name, checked: true })).toBeVisible();
    };
    // Under All the shared project's to-do carries a tag for each view it is in.
    await expect(main.getByRole("listitem").filter({ hasText: views.todo }).locator('[data-tag="view"]')).toHaveCount(2);
    await pickView(views.first);
    await expect(main.getByText(views.todo).first(), "the first view shows the shared project").toBeVisible(LOADED);
    await expect(main.getByText(views.only_todo).first(), "the first view shows its own project").toBeVisible(LOADED);
    await expect(main.getByText(todos.none).first(), "a to-do on no side shows under a view").toBeVisible(LOADED);
    await expect(main.getByText(todos.job).first(), "a to-do filed on the side itself shows under its views").toBeVisible(LOADED);
    await expect(main.getByText(todos.personal), "another side's to-do is hidden").toHaveCount(0, LOADED);
    await expect(main.getByText(todos.business), "another side's to-do is hidden").toHaveCount(0, LOADED);
    // The other view still shows the shared project, and not the project only the first view holds.
    await pickView(views.second);
    await expect(main.getByText(views.todo).first(), "the second view still shows the shared project").toBeVisible(LOADED);
    await expect(main.getByText(views.only_todo), "the second view hides what only the first holds").toHaveCount(0, LOADED);
    await expect(main.getByText(todos.none).first()).toBeVisible(LOADED);
  });
});
