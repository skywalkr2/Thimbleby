// What every journey checks on each screen the person sees, and how it reaches the made-up services.
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

/** Where the fake services answer over plain HTTP (the config sets the ports; the mail and new-start journeys have their own). */
export const fakeAddress = (
  variable: "JOURNEY_FAKE_PORT" | "JOURNEY_MAIL_FAKE_PORT" | "JOURNEY_NEW_START_FAKE_PORT"
    | "JOURNEY_EVENING_FAKE_PORT",
  fallback: number,
) =>
  `http://127.0.0.1:${process.env[variable] ?? fallback}`;

export interface Info {
  token: string;
  ai_base_url: string;
  people: string[];
  projects: string[];
  backup_folder: string;
  source_folder: string;
  workspace: string;
  https_base: string;
  project_site?: string;
  install_target?: string;
  /** Where the app keeps what it prints, when the start-up script was asked to (to count restarts). */
  log?: string;
}
export interface Requests {
  total: number;
  smoke: number;
  /** Runs that sorted mail headers, which are counted apart from the work. */
  sorting: number;
  /** Runs that read an item handed in (not account tests, not sorting). */
  work: number;
  /** What each work request was given to read, in the order asked (the smoke tests of an account are not here). */
  inputs: string[];
}
export interface SignInSeen {
  authorizations: number;
  exchanges: number;
  renewals: number;
  refused: number;
  revoked: number;
  mail_reads: number;
  calendar_reads: number;
  unauthorized: number;
  tokens: number;
  /** The titles a first read hands the assistant (work messages and events within a day of now), the mail the app sets
   * aside by what the service says about it, and what it only notes. */
  recent_items: { mail: string[]; events: string[]; noted: string[]; set_aside: string[] };
  /** What a quiet first read (the sources a sign-in starts) takes in: the work messages of the last 14 days and every event,
   * the mail the app sets aside by what the service says about it, and what is older than that, which it only notes. */
  intake_items: {
    mail: string[];
    events: string[];
    /** The taken-in mail and events that hold something to look over: what a source's review line on Today counts. */
    mail_to_check: string[];
    events_to_check: string[];
    noted: string[];
    set_aside: string[];
    sent: string[];
  };
}

/** Collects what the browser reports as wrong while a journey runs; a journey ends by checking the list is empty. */
export function collectProblems(page: Page, problems: string[]) {
  page.on("console", (msg) => {
    if (msg.type() === "error") problems.push(msg.text());
  });
  page.on("pageerror", (err) => problems.push(String(err)));
}

export async function checkAccessibility(page: Page) {
  // The header sticks to the top, so what it covers depends on the scroll position; check from the top.
  await page.evaluate(() => window.scrollTo(0, 0));
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  const found = results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`);
  expect(found).toEqual([]);
}

/** What the person reads on the page: its text plus the words in its fields' placeholders, titles and labels. */
export async function readScreen(page: Page): Promise<string> {
  return page.evaluate(() => {
    const words = [document.body.innerText];
    for (const el of Array.from(document.querySelectorAll("[placeholder],[title],[aria-label]"))) {
      for (const name of ["placeholder", "title", "aria-label"]) {
        const value = el.getAttribute(name);
        if (value) words.push(value);
      }
    }
    return words.join("\n");
  });
}

/** After a restart the notice says "Restarted" as soon as the new start answers, but the page's data is refreshed only
 * when its event stream has connected again. Waits for the header's status to leave offline, connecting and restarting,
 * which is the state the next step needs: the page holds what the new start holds. */
export async function connectedAgain(page: Page) {
  await expect(page.getByRole("button", { name: /^App status: (?!Offline|Connecting|Restarting)/ })).toBeVisible({
    timeout: 90_000,
  });
}

/** A fresh start opens on Welcome, which has no step list and one button: Start goes on to You. A walkthrough that resumes
 * at another screen has no Welcome, so nothing happens there. */
export async function pressStart(page: Page) {
  const welcome = page.getByRole("heading", { level: 2, name: "Welcome", exact: true });
  if (await welcome.isVisible()) await page.getByRole("main").getByRole("button", { name: "Start", exact: true }).click();
}

/** On a phone the step list is behind a Steps button; open it so a step can be chosen. Nothing happens on a wider window. */
export async function showSteps(page: Page) {
  const button = page.getByRole("button", { name: "Steps", exact: true });
  if ((await button.isVisible()) && (await button.getAttribute("aria-expanded")) === "false") await button.click();
}

/** A screen the person sees: it names no settings file, secret reference or command, and passes the accessibility checks. */
export async function visit(page: Page) {
  const text = await readScreen(page);
  expect(text).not.toMatch(/\.ya?ml\b/i);
  expect(text).not.toMatch(/\benv:/);
  expect(text).not.toMatch(/\bfile:\//);
  expect(text).not.toMatch(/\bcockpit /);
  await checkAccessibility(page);
}

export const setupStep = (page: Page, name: string) => page.getByLabel(name, { exact: true });

/** Puts away the toasts on screen, as a person does before moving on. A toast can be replaced by a newer one while it is
 * being clicked (on a busy machine, between finding its button and clicking it), so each click finds and presses the
 * button in one step on the page, and the toasts are looked at again until none is left. */
export async function dismissToasts(page: Page) {
  const region = page.getByRole("region", { name: "Notifications" });
  const dismiss = region.getByRole("button", { name: "Dismiss" });
  await expect(async () => {
    await region.evaluateAll((regions) => {
      const buttons = regions.flatMap((r) => Array.from(r.querySelectorAll<HTMLButtonElement>('button[aria-label="Dismiss"]')));
      buttons.at(-1)?.click();
    });
    expect(await dismiss.count()).toBe(0);
  }).toPass({ intervals: [100, 250, 500], timeout: 30_000 });
}

/** Opens a view from the sidebar, or on a phone from the bottom bar's sheets. */
export async function openView(page: Page, label: string) {
  await dismissToasts(page);
  // Connections and Add-ons are sections of Settings, reached from its side bar and not from the side menu.
  if (label === "Connections" || label === "Add-ons") {
    await openView(page, "Settings");
    await page.getByRole("navigation", { name: "Settings sections" }).getByRole("link", { name: label, exact: true }).click();
    await expect(page.getByRole("heading", { level: 1, name: label, exact: true })).toBeVisible();
    return;
  }
  const nav = page.getByRole("navigation", { name: "Views" });
  const name = new RegExp(`^${label}`);
  const link = nav.getByRole("link", { name });
  if (await link.count()) {
    await link.click();
    // The address changes, then the view with it: wait for the entry to say it is the current one.
    await expect(link).toHaveAttribute("aria-current", "page");
    return;
  }
  for (const sheet of ["Work", "More"]) {
    await nav.getByRole("button", { name: sheet }).click();
    const inSheet = page.getByRole("dialog", { name: sheet }).getByRole("link", { name });
    if (await inSheet.count()) {
      await inSheet.click();
      return;
    }
    await page.keyboard.press("Escape");
  }
  throw new Error(`No view is named ${label}`);
}

/** The widths a setup step is checked at: two phones, a tablet and a desktop. */
export const STEP_WIDTHS = [320, 390, 768, 1280];

/** Every place a screen is wider than the window at each width: the page itself scrolling sideways, or an element ending
 *  past the window inside a parent that does not. The window goes back to its size afterwards. */
export async function widerThanWindow(page: Page, label: string): Promise<string[]> {
  const before = page.viewportSize() ?? { width: 1280, height: 900 };
  const found: string[] = [];
  for (const width of STEP_WIDTHS) {
    await page.setViewportSize({ width, height: 900 });
    // Measured once the screen has what it loads, never while its loading rows are shown.
    await expect(page.locator("main [data-skeleton]")).toHaveCount(0, { timeout: 20_000 });
    // The page switches to its phone layout in response to the resize: let that frame be drawn before measuring.
    await page.evaluate(() => new Promise<void>((done) => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(() => done())))));
    const out = await page.evaluate(() => {
      const limit = document.documentElement.clientWidth;
      const cut: string[] = [];
      for (const el of Array.from(document.querySelectorAll("main *"))) {
        const box = el.getBoundingClientRect();
        if (box.width > 0 && box.height > 0 && box.right > limit + 1 && getComputedStyle(el).position !== "fixed" && !Array.from(el.children).some((c) => c.getBoundingClientRect().right > limit + 1)) {
          cut.push(`${el.tagName.toLowerCase()}.${String(el.className).split(" ")[0]} reaches ${Math.round(box.right)} (width ${Math.round(box.width)}, ${(el.textContent ?? "").trim().slice(0, 30)})`);
        }
      }
      return { limit, page: document.documentElement.scrollWidth, body: document.body.scrollWidth, cut: cut.slice(0, 5) };
    });
    if (out.page > out.limit || out.body > out.limit || out.cut.length > 0) found.push(`${label} at ${width}: ${JSON.stringify(out)}`);
  }
  await page.setViewportSize(before);
  return found;
}
