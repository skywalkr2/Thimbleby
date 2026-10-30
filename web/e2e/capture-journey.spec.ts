import { expect, test, type Page } from "@playwright/test";
import { collectProblems, openView } from "./journey-helpers";

interface CaptureFixture {
  label: string;
}

interface CapturedNote {
  text: string;
}

async function fixture(page: Page): Promise<CaptureFixture> {
  const response = await page.request.get("/__e2e/capture");
  expect(response.ok()).toBe(true);
  return response.json();
}

async function putNote(page: Page, text: string) {
  const response = await page.request.post("/__e2e/capture", { data: { text } });
  expect(response.status()).toBe(201);
}

async function noteCount(page: Page, text: string) {
  const notes = (await (await page.request.get("api/notes")).json()) as CapturedNote[];
  return notes.filter((note) => note.text === text).length;
}

async function readCapture(page: Page, label: string) {
  const sourceMenu = page.getByRole("button", { name: `More actions for ${label}` });
  await sourceMenu.click();
  await page.getByRole("menuitem", { name: "Read now", exact: true }).click();
}

test("a capture folder files notes once and offers Undo", async ({ page }, testInfo) => {
  const problems: string[] = [];
  collectProblems(page, problems);
  const seeded = await fixture(page);
  const first = `Capture journey: remember the silver heron marker ${testInfo.repeatEachIndex}.`;
  const second = `Capture journey: remember the amber thimble marker ${testInfo.repeatEachIndex}.`;

  await page.goto("?token=e2e-token");
  await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
  await openView(page, "Connections");

  const sourceMenu = page.getByRole("button", { name: `More actions for ${seeded.label}` });
  await sourceMenu.click();
  const turnOff = page.getByRole("menuitem", { name: "Turn off", exact: true });
  if (await turnOff.isVisible()) {
    await turnOff.click();
    await sourceMenu.click();
  }
  await page.getByRole("menuitem", { name: "Turn on", exact: true }).click();
  await expect(sourceMenu).toBeVisible();

  await putNote(page, first);
  await readCapture(page, seeded.label);
  await expect.poll(() => noteCount(page, first)).toBe(1);

  await openView(page, "Notes");
  await expect(page.getByRole("link", { name: first, exact: true })).toBeVisible();

  await openView(page, "What changed");
  const change = page.getByRole("complementary", { name: `Your note · ${first}` });
  await expect(change).toBeVisible();
  await change.getByRole("button", { name: `More actions for ${first}` }).click();
  await page.getByRole("menuitem", { name: "Undo this", exact: true }).click();
  await expect(page.getByText("Undone.")).toBeVisible();
  await expect.poll(() => noteCount(page, first)).toBe(0);

  await openView(page, "Notes");
  await expect(page.getByRole("link", { name: first, exact: true })).toHaveCount(0);
  await openView(page, "Connections");
  await putNote(page, second);
  await readCapture(page, seeded.label);
  await expect.poll(() => noteCount(page, second)).toBe(1);

  await openView(page, "Notes");
  await expect(page.getByRole("link", { name: second, exact: true })).toBeVisible();
  await openView(page, "Connections");
  await readCapture(page, seeded.label);
  await expect.poll(async () => ({ first: await noteCount(page, first), second: await noteCount(page, second) })).toEqual({
    first: 0,
    second: 1,
  });

  expect(problems).toEqual([]);
});
