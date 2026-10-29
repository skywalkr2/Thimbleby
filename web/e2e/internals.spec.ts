// No internals on screen (the sweep's exit criterion E4): on every main screen, at a desktop and a phone width, in both
// themes, with data in the workspace, nothing a person reads is an internal id, an ISO date or time, a file name, a zone
// or locale code, JSON, or a framework's validation phrase. The layout server holds the demo's history plus the long
// made-up strings from outside; those strings are taken out of what is read, since text from outside is shown as it came.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { expect, test, type Page } from "@playwright/test";
import { findInternals } from "./internals-scan";

const AUTH = { Authorization: "Bearer e2e-token" };
const LOADED = { timeout: 20_000 };
const WIDTHS = [1440, 390];

const outside: string[] = (JSON.parse(readFileSync(fileURLToPath(new URL("./fixtures/layout-strings.json", import.meta.url)), "utf8")) as Array<{ text: string }>).map(
  (s) => s.text,
);

/** What a person reads on the open screen: the visible text, plus the labels a screen reader reads and the hover titles. */
async function readScreen(page: Page): Promise<string> {
  const read = await page.evaluate(() => {
    const labels = Array.from(document.querySelectorAll("body [aria-label], body [title], body img[alt]"))
      .map((el) => [el.getAttribute("aria-label"), el.getAttribute("title"), el.getAttribute("alt")].filter(Boolean).join("\n"))
      .join("\n");
    // Values of the fields, which innerText leaves out. A date or time field shows its value in the browser's own words.
    const values = Array.from(
      document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
        "body input:not([type=hidden]):not([type=password]):not([type=date]):not([type=datetime-local]):not([type=time]):not([type=month]), body textarea",
      ),
    )
      .map((el) => el.value)
      .join("\n");
    return `${document.body.innerText}\n${labels}\n${values}`;
  });
  let text = read;
  for (const long of outside) text = text.split(long).join(" ").split(long.slice(0, 200)).join(" ");
  return text;
}

async function openScreen(page: Page, hash: string) {
  await page.evaluate((h) => {
    window.location.hash = h;
  }, hash);
  await expect(page).toHaveURL(new RegExp(`#${hash.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`));
  await expect(page.getByRole("main").getByRole("heading", { level: 1 }).first()).toBeVisible(LOADED);
  await expect(page.locator("main [data-skeleton]")).toHaveCount(0, LOADED);
}

/** The screens a person opens, by the address after the #; record pages are added from what the workspace holds. */
async function screensToRead(page: Page): Promise<Array<{ name: string; hash: string }>> {
  const get = async <T>(path: string) => ((await (await page.request.get(path, { headers: AUTH })).json()) as T);
  const projects = await get<Array<{ id: string; name: string }>>("api/projects");
  const people = await get<Array<{ id: string; is_pm: boolean }>>("api/people");
  const screens = [
    { name: "Today", hash: "today" },
    { name: "Schedule", hash: "schedule" },
    { name: "Since yesterday", hash: "work/since" },
    { name: "What changed", hash: "work/changed" },
    { name: "Handled for you", hash: "work/handled" },
    { name: "Follow-ups", hash: "work/followups" },
    { name: "To-dos and questions", hash: "work/open" },
    { name: "Stages", hash: "work/stages" },
    { name: "Projects", hash: "records/projects" },
    { name: "People", hash: "records/people" },
    { name: "Files", hash: "records/files" },
    { name: "Notes", hash: "records/notes" },
    { name: "Knowledge", hash: "records/knowledge" },
    { name: "Quality", hash: "quality" },
    { name: "Handover", hash: "handover" },
    { name: "Settings", hash: "settings" },
    { name: "Settings: You", hash: "settings/you" },
    { name: "Settings: Connections", hash: "settings/connections" },
    { name: "Settings: AI accounts", hash: "settings/ai" },
    { name: "Settings: Notices", hash: "settings/today" },
    { name: "Settings: Appearance", hash: "settings/appearance" },
    { name: "Settings: Backups", hash: "settings/backups" },
    { name: "Settings: Quick links", hash: "settings/links" },
    { name: "Settings: Add-ons", hash: "settings/addons" },
    { name: "Settings: Lists", hash: "settings/lists" },
    { name: "Settings: Files", hash: "settings/files" },
    { name: "Settings: Business", hash: "settings/business" },
    { name: "Settings: Advanced", hash: "settings/advanced" },
  ];
  const open = await get<{ actions: Array<{ id: string }>; questions: Array<{ id: string }> }>("api/open-items");
  for (const action of open.actions.slice(0, 12)) screens.push({ name: "A to-do's page", hash: `records/action/${action.id}` });
  for (const question of open.questions.slice(0, 3)) screens.push({ name: "A question's page", hash: `records/question/${question.id}` });
  const changes = await get<Array<{ source?: string | null }>>("api/changes");
  for (const source of [...new Set(changes.map((c) => c.source).filter(Boolean))].slice(0, 2)) screens.push({ name: "A source's page", hash: `records/source/${source}` });
  for (const project of projects.slice(0, 3)) screens.push({ name: `Project ${project.name.slice(0, 20)}`, hash: `records/project/${encodeURIComponent(project.id)}` });
  const person = people.find((p) => p.is_pm) ?? people[0];
  if (person) screens.push({ name: "A person's page", hash: `records/person/${encodeURIComponent(person.id)}` });
  return screens;
}

/** The work a person has done by the time they look around: to-dos typed with their day in the words, a day moved. */
async function seed(page: Page) {
  const people = (await (await page.request.get("api/people", { headers: AUTH })).json()) as Array<{ id: string; is_pm: boolean }>;
  const me = people.find((p) => p.is_pm)!.id;
  const have = ((await (await page.request.get("api/open-items", { headers: AUTH })).json()) as { actions: Array<{ text: string }> }).actions.map((a) => a.text);
  // Days in the next week, written the way a to-do's own words may write them: year-month-day.
  const ahead = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);
  for (const [text, when] of [
    [`Send the headcount by ${ahead(2)}.`, ahead(2)],
    [`Lend us the trailer on ${ahead(3)}`, ahead(3)],
  ]) {
    if (have.includes(text)) continue;
    const added = await page.request.post("api/todos", { headers: AUTH, data: { text, when, owners: [me] } });
    expect(added.ok(), await added.text()).toBe(true);
  }
  const open = (await (await page.request.get("api/open-items", { headers: AUTH })).json()) as { actions: Array<{ id: string; version: number }> };
  const moved = await page.request.post("api/records/edit", { headers: AUTH, data: { kind: "action", id: open.actions[0].id, fields: { due: ahead(4) }, read_version: open.actions[0].version } });
  expect(moved.ok(), await moved.text()).toBe(true);
}

test.describe("no internals on screen", () => {
  test("every main screen, at a desktop and a phone width, in both themes, shows nothing internal", async ({ page }) => {
    test.setTimeout(600_000);
    await page.goto("?token=e2e-token");
    await expect(page.getByRole("heading", { level: 2, name: "Needs you", exact: true })).toBeVisible(LOADED);
    await seed(page);
    const screens = await screensToRead(page);
    const found: string[] = [];
    for (const scheme of ["light", "dark"] as const) {
      await page.emulateMedia({ colorScheme: scheme });
      for (const width of WIDTHS) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto("?token=e2e-token");
        for (const screen of screens) {
          await openScreen(page, screen.hash);
          for (const hit of findInternals(await readScreen(page))) found.push(`${screen.name} at ${width}, ${scheme}: ${hit}`);
          // The calendar page reads differently in each of its views.
          if (screen.hash === "schedule") {
            for (const view of ["Day", "Work week", "Week", "Month"]) {
              const choice = page.getByLabel("View", { exact: true }).getByText(view, { exact: true });
              // Some widths offer fewer views; Month is always there.
              if (view !== "Month" && !(await choice.first().isVisible())) continue;
              await expect(choice.first()).toBeVisible(LOADED);
              await choice.first().click();
              await expect(page.locator("main [data-skeleton]")).toHaveCount(0, LOADED);
              for (const hit of findInternals(await readScreen(page))) found.push(`${screen.name}, ${view} at ${width}, ${scheme}: ${hit}`);
            }
          }
        }
      }
    }
    // Each screen is one line however many times it was read in a theme or at a width.
    expect([...new Set(found.map((line) => line.replace(/ at \d+, (light|dark):/, ":")))].sort()).toEqual([]);
  });
});
