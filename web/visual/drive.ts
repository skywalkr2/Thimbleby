// What the capture map uses to put a page in a state: the environment of one capture, and small helpers for the ways the
// states are driven (offline, a refused write, a held read, a made-up answer). Nothing here names a page; pages.ts does.
import type { BrowserContext, Page, Route } from "playwright-core";
import type { Size } from "./names.ts";

/** What a capture has to work with. */
export interface Env {
  page: Page;
  context: BrowserContext;
  size: Size;
  /** The app's address, with the base path and a trailing slash. */
  base: string;
  token: string;
  /** The stand-in outside services' address, when this server has them (the accounts server). */
  fake: string | null;
  /** What the stage's setup recorded (ids, names, addresses), for the drives to read. */
  seed: Record<string, any>;
  /** Called after the capture, in reverse order: whatever a drive changed (a route, offline, a held read) is put back. */
  undo: Array<() => Promise<void> | void>;
}

/** Why a page can't be put in a state in this build. Thrown from a drive; the capture is then listed with this reason. */
export class Unreachable extends Error {}

export const LONG = { timeout: 30_000 };

/** Sets the address's fragment, as a person's click on a link does. */
export async function go(env: Env, hash: string): Promise<void> {
  await env.page.evaluate((to) => {
    window.location.hash = to;
  }, hash);
}

/** Waits until a screen has what it loads: a heading shows, no skeleton is left, and the last fetches had a moment to land. */
export async function settle(page: Page): Promise<void> {
  await page.locator("h1").first().waitFor({ state: "visible", timeout: 30_000 });
  await page.waitForFunction(() => !document.querySelector("[data-skeleton]"), null, { timeout: 30_000 }).catch(() => undefined);
  await page.waitForTimeout(700);
}

/** Opens a screen by its fragment and waits for it. */
export async function open(env: Env, hash: string): Promise<void> {
  // Each state starts from every side: a side picked in an earlier state is not carried into this one.
  await env.page
    .evaluate(() => window.localStorage.setItem("cockpit:side-filter", "all"))
    .catch(() => undefined);
  await go(env, hash);
  await settle(env.page);
}

/** The first of a list of names that has a button on the page. Throws Unreachable with the reason when none has. */
export async function clickFirstOf(env: Env, names: Array<string | RegExp>, why: string): Promise<string> {
  for (const name of names) {
    const found = env.page.getByRole("button", { name }).first();
    if ((await found.count()) > 0 && (await found.isVisible().catch(() => false))) {
      await found.click();
      return typeof name === "string" ? name : name.source;
    }
  }
  throw new Unreachable(why);
}

/** The browser goes offline: the app is told, and asked to look again, as it is when the window is brought back. */
export async function goOffline(env: Env): Promise<void> {
  await env.context.setOffline(true);
  env.undo.push(() => env.context.setOffline(false));
  await env.page.evaluate(() => {
    window.dispatchEvent(new Event("offline"));
    window.dispatchEvent(new Event("focus"));
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await env.page.waitForTimeout(900);
}

/** Every write the app sends from now on is refused with this status (500 is a failed save, 409 a change made elsewhere). */
export async function refuseWrites(env: Env, status: 500 | 409, detail: string): Promise<void> {
  const handler = async (route: Route) => {
    if (route.request().method() === "GET" || route.request().method() === "HEAD") return route.fallback();
    return route.fulfill({ status, contentType: "application/json", body: JSON.stringify({ detail }) });
  };
  await env.page.route("**/api/**", handler);
  env.undo.push(() => env.page.unroute("**/api/**", handler));
}

/**
 * Answers every read of one address pattern with what the app really answered, changed by `patch`: for a screen whose
 * populated look needs history the fixtures do not hold. The shape stays the app's own; only the figures are set.
 */
export async function reshapeReads(env: Env, pattern: string | RegExp, patch: (body: any) => void): Promise<void> {
  const handler = async (route: Route) => {
    if (route.request().method() !== "GET") return route.fallback();
    const response = await route.fetch();
    const body = await response.json();
    patch(body);
    return route.fulfill({ response, json: body });
  };
  await env.page.route(pattern, handler);
  env.undo.push(() => env.page.unroute(pattern, handler));
}

/** Answers every read of one address pattern with this status and text, for "couldn't load". */
export async function refuseReads(env: Env, pattern: string | RegExp, status: number, detail: string): Promise<void> {
  const handler = async (route: Route) => {
    if (route.request().method() !== "GET") return route.fallback();
    return route.fulfill({ status, contentType: "application/json", body: JSON.stringify({ detail }) });
  };
  await env.page.route(pattern, handler);
  env.undo.push(() => env.page.unroute(pattern, handler));
}

/**
 * Loading: opens the app on a screen that needs no data, remembers every address it read to start, and from then on holds
 * every read of any other address until the capture is over. The screen asked for then draws what it draws while it waits.
 */
export async function holdReads(env: Env, neutralHash: string, hash: string, alsoHold?: RegExp): Promise<void> {
  // A page of its own, loaded again from nothing, so no answer from the start (Today's, which the capture opens on) is kept.
  await env.page.goto("about:blank");
  await env.page.goto(`${env.base}?token=${env.token}#${neutralHash}`);
  await settle(env.page);
  const known = new Set<string>();
  const note = (url: string) => known.add(new URL(url).pathname + new URL(url).search);
  for (const entry of await env.page.evaluate(() => performance.getEntriesByType("resource").map((e) => e.name))) note(entry);
  let release: () => void = () => undefined;
  const released = new Promise<void>((resolve) => {
    release = resolve;
  });
  const handler = async (route: Route) => {
    const url = new URL(route.request().url());
    if (route.request().method() !== "GET" || known.has(url.pathname + url.search)) return route.fallback();
    await released;
    return route.fallback().catch(() => undefined);
  };
  await env.page.route("**/api/**", handler);
  env.undo.push(async () => {
    release();
    await env.page.unroute("**/api/**", handler).catch(() => undefined);
  });
  if (alsoHold) {
    // The shell reads some of the screen's own data to start (the count in the menu): those reads are held too, and the app is
    // loaded again from nothing on the screen, so it has no answer of them kept.
    for (const path of [...known]) if (alsoHold.test(path)) known.delete(path);
    await env.page.goto("about:blank");
    await env.page.goto(`${env.base}?token=${env.token}#${hash}`);
  } else {
    await go(env, hash);
  }
  await env.page.waitForTimeout(900);
}

/** Calls the app's own API with the capture's token, for seeding and for reading ids. */
export async function api<T = any>(base: string, token: string, path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const answer = await fetch(`${base}api/${path}`, {
    method: init?.method ?? "GET",
    headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: init?.body === undefined ? undefined : JSON.stringify(init.body),
  });
  if (!answer.ok) throw new Error(`${init?.method ?? "GET"} api/${path} answered ${answer.status}: ${(await answer.text()).slice(0, 200)}`);
  const text = await answer.text();
  return (text ? JSON.parse(text) : null) as T;
}

/** Quality with figures in it: the last weeks get these found and kept counts, a few false alerts and minutes looking over. */
export async function populatedQuality(env: Env, found: number[], kept: number[]): Promise<void> {
  await open(env, "settings/appearance"); // a screen that reads no figures, so the page asks for them once the answer is changed
  await reshapeReads(env, /\/api\/quality$/, (body) => {
    const weeks = body.outcome.weeks as any[];
    const alerts = [0, 1, 0, 1];
    const minutes = [12, 11, 9, 8];
    weeks.forEach((week, index) => {
      const from = index - (weeks.length - found.length);
      const at = from >= 0 ? from : -1;
      week.promises_found = at >= 0 ? found[at] : 0;
      week.promises_kept = at >= 0 ? kept[at] : 0;
      week.dismissed = at >= 0 ? alerts[at] : 0;
      week.corrected = 0;
      week.review_seconds = at >= 0 ? minutes[at] * 60 : 0;
      week.review_visits = at >= 0 ? 4 : 0;
    });
    const sum = (key: string) => weeks.reduce((n, week) => n + week[key], 0);
    Object.assign(body.outcome, {
      promises_found: sum("promises_found"),
      promises_kept: sum("promises_kept"),
      dismissed: sum("dismissed"),
      corrected: 0,
      review_seconds: sum("review_seconds"),
      review_visits: sum("review_visits"),
    });
    body.review.median_seconds = 10 * 60;
  });
  await go(env, "quality");
  await env.page.waitForTimeout(1500);
}
