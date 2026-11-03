// The capture tool for the visual hand-back: `npm --prefix web run visual:capture`. See README.md in this folder.
//
// It starts the stand-in servers the browser tests use (one with the several-accounts fakes, one with the long-name sides), takes
// a picture of every page and state in the capture map (pages.ts) at the reviewer's widths and themes, puts each beside its
// mockup, and writes the difference list. It runs the built app, and stops exactly the servers it started.
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, type Browser, type BrowserContext } from "playwright-core";
import { differencesMarkdown, writeSideBySide, type Result } from "./compose.ts";
import { settle, Unreachable, type Env } from "./drive.ts";
import { DEFAULT_REF, Mockups, type Section } from "./mockups.ts";
import { captureName, chooseSizes, choosePages, FIRST_SCREEN_WIDTHS, matchMockup, slug, type Size } from "./names.ts";
import { ENTRIES, PAGES, type Entry } from "./pages.ts";
import { PORT_BASE, Servers, pythonFor, portOffset, removeStateFolder, requireFreshBuild, stateFolder } from "./servers.ts";
import { setUp, STAGE_ORDER, type ServerName } from "./stages.ts";

const HELP = `Captures the built app at the reviewer's widths and themes, beside the mockups.

  npm --prefix web run visual:capture -- [options]

  --pages a,b       the mockup pages to capture (default: all). A states sheet is a page of its own: today-states.
  --with-states     with a page, capture its states sheet too
  --sizes a,b       the sizes, like 1440-day,390-night (default: 1440 day and night, 1024 day, 390 day and night)
  --out folder      where the pictures go (default: web/visual/out)
  --ref ref         the git ref the mockups are read from (default: ${DEFAULT_REF})
  --strict          exit with 1 when any state that has a drive failed to be reached
  --help            this text

PW_PORT_OFFSET moves the ports the servers use (from ${PORT_BASE}) by that much.
`;

interface Args {
  pages?: string;
  withStates: boolean;
  sizes?: string;
  out?: string;
  ref: string;
  strict: boolean;
}

function parseArgs(argv: string[]): Args {
  const args: Args = { withStates: false, ref: DEFAULT_REF, strict: false };
  for (let n = 0; n < argv.length; n += 1) {
    const name = argv[n];
    const value = () => {
      const next = argv[(n += 1)];
      if (next === undefined) throw new Error(`${name} needs a value`);
      return next;
    };
    if (name === "--help" || name === "-h") {
      console.log(HELP);
      process.exit(0);
    } else if (name === "--pages") args.pages = value();
    else if (name === "--with-states") args.withStates = true;
    else if (name === "--sizes") args.sizes = value();
    else if (name === "--out") args.out = value();
    else if (name === "--ref") args.ref = value();
    else if (name === "--strict") args.strict = true;
    else throw new Error(`Unknown option ${name}. Try --help.`);
  }
  return args;
}

const web = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const root = resolve(web, "..");

interface Running {
  base: string;
  token: string;
  fake: string | null;
  seed: Record<string, any>;
}

/** Starts the server a set of entries needs, and returns where it answers. */
async function startServer(servers: Servers, name: ServerName, offset: number): Promise<{ running: Running; cleanup: () => void }> {
  if (name === "accounts") {
    const [app, fake, https] = [PORT_BASE + offset, PORT_BASE + 1 + offset, PORT_BASE + 2 + offset];
    const state = stateFolder(app);
    // The app first (it clears the state folder), then the stand-in services that read what it wrote there.
    await servers.start("accounts-app", "tests.e2e_fresh_server", ["--port", String(app), "--state", state, "--https-port", String(https), "--mail", "--no-sent-mail"], `http://127.0.0.1:${app}/api/health`);
    await servers.start("accounts-fake", "tests.fake_services", ["--port", String(fake), "--https-port", String(https), "--state", state, "--accounts", "3"], `http://127.0.0.1:${fake}/__e2e/info`);
    const fakeBase = `http://127.0.0.1:${fake}`;
    const info = (await (await fetch(`${fakeBase}/__e2e/info`)).json()) as { token: string };
    return { running: { base: `http://127.0.0.1:${app}/`, token: info.token, fake: fakeBase, seed: {} }, cleanup: () => removeStateFolder(state) };
  }
  const port = PORT_BASE + 3 + offset;
  await servers.start("sides", "tests.e2e_server", ["--port", String(port), "--base-path", "/", "--many-sides", "--plain-stages"], `http://127.0.0.1:${port}/api/health`);
  return { running: { base: `http://127.0.0.1:${port}/`, token: "e2e-token", fake: null, seed: {} }, cleanup: () => undefined };
}

/** Picks the theme the way a person does, from the user menu, and leaves it kept for this window. */
async function chooseTheme(context: BrowserContext, running: Running, theme: Size["theme"]): Promise<void> {
  const page = await context.newPage();
  try {
    await page.goto(`${running.base}?token=${running.token}#today`);
    await settle(page);
    await page.getByRole("button", { name: /^Menu for / }).click();
    await page.getByRole("menuitemradio", { name: theme === "night" ? "Dark" : "Light", exact: true }).click();
    await page.waitForFunction((want) => document.documentElement.getAttribute("data-theme") === want, theme === "night" ? "dark" : "light", { timeout: 10_000 });
  } finally {
    await page.close();
  }
}

interface Taken {
  file: string;
  firstScreen: boolean;
}

/** Opens one entry in a window of this size and takes its pictures; throws what went wrong. */
async function takeOne(context: BrowserContext, running: Running, entry: Entry, size: Size, out: string): Promise<Taken[]> {
  const page = await context.newPage();
  const env: Env = { page, context, size, base: running.base, token: running.token, fake: running.fake, seed: running.seed, undo: [] };
  try {
    await page.goto(`${running.base}?token=${running.token}#today`);
    await settle(page);
    await entry.open!(env);
    const taken: Taken[] = [];
    const state = entry.title ? slug(entry.title) : null;
    if (FIRST_SCREEN_WIDTHS.includes(size.width)) {
      const file = captureName(entry.page, state, size, true);
      await page.screenshot({ path: join(out, file) });
      taken.push({ file, firstScreen: true });
    }
    const file = captureName(entry.page, state, size);
    await page.screenshot({ path: join(out, file), fullPage: true });
    taken.push({ file, firstScreen: false });
    return taken;
  } finally {
    for (const undo of env.undo.reverse()) await Promise.resolve(undo()).catch(() => undefined);
    for (const open of context.pages()) await open.close().catch(() => undefined);
  }
}

async function main(): Promise<number> {
  const args = parseArgs(process.argv.slice(2));
  const out = resolve(args.out ?? join(web, "visual", "out"));
  const pages = choosePages(args.pages, PAGES, args.withStates);
  const sizes = chooseSizes(args.sizes);
  requireFreshBuild(web);
  const mockups = new Mockups(args.ref, root, web);
  const available = mockups.available();
  const entries = ENTRIES.filter((e) => pages.includes(e.page));
  if (entries.length === 0) throw new Error("Nothing to capture.");
  rmSync(out, { recursive: true, force: true });
  mkdirSync(join(out, "side-by-side"), { recursive: true });
  const logs = join(out, "servers");
  const servers = new Servers(root, pythonFor(root), logs);
  const cleanups: Array<() => void> = [];
  const results: Result[] = [];
  const taken = new Map<string, { entry: Entry; size: Size; file: string; firstScreen: boolean }>();
  const failedEntries = new Set<Entry>();
  const started = Date.now();
  let browser: Browser | null = null;
  try {
    browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined });
    const offset = portOffset();
    for (const name of ["accounts", "sides"] as ServerName[]) {
      const mine = entries.filter((e) => e.server === name);
      if (mine.length === 0) continue;
      const last = Math.max(...mine.map((e) => STAGE_ORDER[name].indexOf(e.stage)));
      const { running, cleanup } = await startServer(servers, name, offset);
      cleanups.push(cleanup);
      console.log(`${name}: started on ${running.base}`);
      const stages = STAGE_ORDER[name].slice(0, last + 1);
      // The first window of the server: its setup steps run in it, and each stage only adds to what the last left.
      const setupContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, ignoreHTTPSErrors: true });
      for (const stage of stages) {
        console.log(`${name}/${stage}: setting up`);
        await setUp(name, stage, { context: setupContext, base: running.base, token: running.token, fake: running.fake, seed: running.seed });
        const here = mine.filter((e) => e.stage === stage);
        if (here.length === 0) continue;
        for (const size of sizes) {
          const driven = here.filter((e) => !e.undrivable);
          if (driven.length === 0) continue;
          const context = await browser.newContext({
            viewport: { width: size.width, height: size.height },
            ignoreHTTPSErrors: true,
            reducedMotion: "reduce",
            permissions: ["clipboard-read", "clipboard-write"],
          });
          context.setDefaultTimeout(12_000);
          try {
            await chooseTheme(context, running, size.theme);
            for (const entry of driven) {
              // A drive that failed at one size is not tried again at the others: it would fail the same way, slowly.
              if (failedEntries.has(entry)) continue;
              const label = `${entry.page}${entry.title ? ` · ${entry.title}` : ""} · ${size.width} ${size.theme}`;
              try {
                for (const one of await takeOne(context, running, entry, size, out)) {
                  taken.set(one.file, { entry, size, ...one });
                }
                console.log(`  captured ${label}`);
              } catch (error) {
                const reason = error instanceof Unreachable ? error.message : `${(error as Error).message.split("\n")[0]}`;
                failedEntries.add(entry);
                results.push({ page: entry.page, title: entry.title ?? null, file: null, sideBySide: null, label: `${size.width} ${size.theme}`, firstScreen: false, problem: { kind: error instanceof Unreachable ? "undrivable" : "failed", reason }, noMockup: false });
                console.log(`  NOT reached ${label}: ${reason}`);
              }
            }
          } finally {
            await context.close();
          }
        }
      }
      await setupContext.close();
    }
    // The states that have no drive at all, listed once each with their reasons.
    for (const entry of entries.filter((e) => e.undrivable)) {
      results.push({ page: entry.page, title: entry.title ?? null, file: null, sideBySide: null, label: "", firstScreen: false, problem: { kind: "undrivable", reason: entry.undrivable! }, noMockup: false });
    }
    // Each capture beside its mockup.
    const cuts = new Map<string, Section[] | null>();
    for (const [file, one] of taken) {
      const { entry, size } = one;
      const mockup = matchMockup(available, entry.page, size, one.firstScreen);
      const result: Result = { page: entry.page, title: entry.title ?? null, file, sideBySide: null, label: `${size.width} ${size.theme}`, firstScreen: one.firstScreen, problem: null, noMockup: false };
      results.push(result);
      // A state is a part of its sheet; the sheet's first screen is not the state's, so the pair is made for the whole page only.
      if (!mockup || (entry.title && one.firstScreen)) {
        result.noMockup = true;
        continue;
      }
      let crop: Section | null = null;
      if (entry.title) {
        const key = `${entry.page}@${size.width}`;
        if (!cuts.has(key)) cuts.set(key, await mockups.sections(browser, entry.page, ENTRIES.filter((e) => e.page === entry.page).map((e) => e.title!), size.width));
        crop = cuts.get(key)?.find((s) => s.title === entry.title) ?? null;
      }
      const caption = `${entry.page}${entry.title ? ` · ${entry.title}` : ""} · ${size.theme} · ${size.width}px${one.firstScreen ? " · first screen" : ""}`;
      await writeSideBySide(browser, join(out, ".work"), { build: join(out, file), mockup: mockups.picture(mockup), crop, width: size.width, caption, to: join(out, "side-by-side", file) });
      result.sideBySide = file;
      console.log(`  side by side ${file}`);
    }
    const commit = execFileSync("git", ["rev-parse", "--short", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
    writeFileSync(join(out, "differences.md"), differencesMarkdown(results, PAGES, { ref: args.ref, build: `commit ${commit}` }), "utf8");
    writeFileSync(join(out, "manifest.json"), JSON.stringify(results, null, 2), "utf8");
    rmSync(join(out, ".work"), { recursive: true, force: true });
    const failed = results.filter((r) => r.problem?.kind === "failed");
    const seconds = Math.round((Date.now() - started) / 1000);
    console.log(`Done in ${seconds} s: ${taken.size} pictures, ${results.filter((r) => r.sideBySide).length} side by side, ${results.filter((r) => r.problem?.kind === "undrivable").length} listed as not drivable, ${failed.length} drives failed. ${join(out, "differences.md")}`);
    return args.strict && failed.length > 0 ? 1 : 0;
  } finally {
    await browser?.close().catch(() => undefined);
    mockups.close();
    await servers.stop();
    for (const cleanup of cleanups) cleanup();
  }
}

main().then(
  (code) => process.exit(code),
  (error: Error) => {
    console.error(`visual:capture stopped: ${error.message}`);
    process.exit(1);
  },
);

