// Pictures of a fresh workspace after setup with a business, as a person sees it on the first day, for the owner's review of
// the screens. Runs only when CAPTURE_DIR names a folder (skipped otherwise, so the full run spends no time on it):
//   npm --prefix web run build && CAPTURE_DIR=/some/folder npx --prefix web playwright test first-day-captures
// Each screen is saved full-page at a phone, a laptop and a very wide window, in light and in dark, as
// `<screen>-<width>-<light|dark>.png`. The server and the setup are the first-day spec's (first-day-helpers.ts).
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { LOADED, openScreen, setUpWithBusiness, SIDE, type FirstDay } from "./first-day-helpers";

const DIR = process.env.CAPTURE_DIR;
const SIZES = [
  { width: 390, height: 844 },
  { width: 1440, height: 900 },
  { width: 2000, height: 1100 },
];
const SCHEMES = ["light", "dark"] as const;

type Shot = { name: string; hash: string; heading: string | RegExp; of?: (page: Page) => ReturnType<Page["locator"]> };

const shots = (day: FirstDay): Shot[] => [
  { name: "today", hash: "today", heading: "Today" },
  // Came in is a panel of Today's side column; it is on screen only where a mailbox is connected.
  { name: "came-in", hash: "today", heading: "Today", of: (page) => page.getByRole("region", { name: "Came in" }) },
  { name: "since-yesterday", hash: "work/since", heading: "Since yesterday" },
  { name: "business", hash: `records/project/${encodeURIComponent(day.side)}`, heading: SIDE },
  { name: "project", hash: `records/project/${encodeURIComponent(day.project)}`, heading: "First catalog" },
  { name: "people", hash: "records/people", heading: "People" },
  { name: "person", hash: `records/person/${encodeURIComponent(day.person)}`, heading: /./ },
  { name: "organizations", hash: "records/people", heading: "People", of: (page) => page.getByRole("region", { name: "Organizations", exact: true }) },
  { name: "follow-ups", hash: "work/followups", heading: "Follow-ups" },
  { name: "knowledge", hash: "records/knowledge", heading: "Knowledge" },
  { name: "what-changed", hash: "work/changed", heading: "What changed" },
  { name: "schedule", hash: "schedule", heading: "Schedule" },
  { name: "settings", hash: "settings", heading: "Settings" },
];

test.describe("first-day captures", () => {
  test.skip(!DIR, "set CAPTURE_DIR to take the pictures");

  test("a picture of each first-day screen at three widths, in light and dark", async ({ page, request }) => {
    test.setTimeout(600_000);
    mkdirSync(DIR!, { recursive: true });
    const day = await setUpWithBusiness(request);
    const missing: string[] = [];
    await page.goto("?token=e2e-token");
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible(LOADED);
    for (const scheme of SCHEMES) {
      await page.emulateMedia({ colorScheme: scheme });
      for (const size of SIZES) {
        await page.setViewportSize(size);
        for (const shot of shots(day)) {
          await openScreen(page, shot.hash, shot.heading);
          // Let what a screen loads after its heading (Today's lines, the side column) arrive and settle.
          await expect(page.locator("main [data-skeleton]")).toHaveCount(0, LOADED);
          await page.waitForTimeout(500);
          const file = join(DIR!, `${shot.name}-${size.width}-${scheme}.png`);
          if (!shot.of) {
            await page.screenshot({ path: file, fullPage: true });
            continue;
          }
          const part = shot.of(page);
          if ((await part.count()) === 0) {
            if (!missing.includes(shot.name)) missing.push(shot.name);
            continue;
          }
          // On a phone the side column's panels are folded to a line; the one asked for is opened first.
          const folded = page.getByRole("button", { name: new RegExp(`^${shot.name === "came-in" ? "Came in" : "$^"}`), expanded: false });
          if (await folded.count()) await folded.first().click();
          await part.first().screenshot({ path: file });
        }
      }
    }
    console.log(`Not on this workspace's screens (nothing to take a picture of): ${missing.join(", ") || "none"}`);
  });
});
