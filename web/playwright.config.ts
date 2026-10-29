// Browser tests: the acceptance scenario at the root path and under a nested base path, with accessibility checks, and
// the layout check (no screen wider than the window).
// Build the UI first (npm run build); each project starts its own server from the repository root.
import { tmpdir } from "node:os";
import { join } from "node:path";
import { defineConfig, devices } from "@playwright/test";

// PW_PORT_OFFSET moves every port the tests use by that much, so two runs (two checkouts) can share a computer.
const offset = Number(process.env.PW_PORT_OFFSET) || 0;
const servers = [
  { name: "root", port: 8781 + offset, base: "/" },
  { name: "nested", port: 8782 + offset, base: "/admin" },
];
// The layout check has a server of its own, because it holds long made-up text that the other scenarios must not see. The
// check that no screen shows an internal reads the same server, with the demo's history and the work added to it.
const layout = { port: 8786 + offset };
// So does the check of the yes to an AI account reading work mail and notes: its server has a second stand-in account whose
// person said Not now, which the other scenarios must not see on Today.
const access = { port: 8787 + offset };
// And Today's capacity, measured on a fresh demo that no other scenario has added lines to.
const capacity = { port: 8788 + offset };
// And the late-evening check: its server's clock starts just after midnight UTC, the evening before in the demo's time zone
// (which is behind UTC), so a day written or counted in the wrong zone shows as a wait below zero.
const late = { port: 8789 + offset, clockAt: "2026-10-21T00:30:00Z" };

// And the way out: its server has the core's stand-in channel and one message waiting for the person's yes.
const outgoing = { port: 8796 + offset };

// And the acts on mail and calendar: its server's stand-in channel serves a plain mailbox with acting on, and seeds two saved
// messages and an invitation to reply to, file away and answer.
const acts = { port: 8797 + offset };

// And the meetings: its server seeds an entry about to start with another person on it, one that has ended with nothing
// written down, and a promise of theirs gone quiet.
const meetings = { port: 8798 + offset };

// And the "Just me" check: its server is made as a person with no work makes one (nothing besides Personal), with an area, a
// person, a to-do and a question seeded, so no screen is read with work words on it.
const justMe = { port: 8799 + offset };

// And the check that a business is a group and not a project: a workspace made like the "Just me" one, to which the test adds a
// business and a project before it looks at their pages.
const sides = { port: 8763 + offset };

// And the side filter: a workspace made like the "Just me" one with a job and a business added as setup adds them, a to-do, a
// question and a promise on each side, one to-do on none and two calendars each serving a side, so each screen is read under
// every choice of the filter.
const sideFilter = { port: 8765 + offset };

// And people and record pages: a workspace like the side filter's, but a server of its own, because the tests add people, a business and
// a job to it, which the side filter's counts must not see.
const peopleRecords = { port: 8767 + offset };

// And the first day: a workspace made as a person with no work makes it, with a business set up through the setup route and
// nothing else in it but one run waiting for the first go, read as it stands (the check on rows of empty parts, and the
// captures when CAPTURE_DIR is set).
const firstDay = { port: 8764 + offset };
// And quick edits in a row: a server of its own, so a save refused as "changed since you opened it" can only be the
// screen's own race and never another scenario writing Settings at the same moment.
const quickEdits = { port: 8766 + offset };

// The journeys start the app as a person does (a new workspace, then the serve command) beside a process that plays the
// outside services; each pair works in one state folder that the start-up script clears. Two pairs: one for the
// journeys that share a workspace (a new workspace, a folder, an add-on installed from the list), and one for the
// mail journey, whose workspace has the mail add-on on and has not yet pressed Go, and one for the new-start journey,
// whose workspace has nothing and whose catalog offers the mail add-on. The services answer over HTTPS
// as well, with a certificate from a throwaway authority that the app trusts through its environment.
const pair = (port: number, fakePort: number, httpsPort: number) => ({
  port: port + offset,
  fakePort: fakePort + offset,
  httpsPort: httpsPort + offset,
  state: join(tmpdir(), `cockpit-journeys-${port + offset}`),
});
const journeys = pair(8783, 8790, 8791);
const mail = pair(8784, 8792, 8793);
const newStart = pair(8785, 8794, 8795);
const evening = pair(8760, 8761, 8762);

// The browser tests ask the fake services for what they were asked; they read where from here.
process.env.JOURNEY_FAKE_PORT = String(journeys.fakePort);
process.env.JOURNEY_MAIL_FAKE_PORT = String(mail.fakePort);
process.env.JOURNEY_NEW_START_FAKE_PORT = String(newStart.fakePort);
process.env.JOURNEY_EVENING_FAKE_PORT = String(evening.fakePort);

const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined;

const freshServer = (p: ReturnType<typeof pair>, flags: string) => ({
  command: `uv run python -m tests.e2e_fresh_server --port ${p.port} --state "${p.state}" --https-port ${p.httpsPort} ${flags}`,
  cwd: "..",
  url: `http://127.0.0.1:${p.port}/api/health`,
  reuseExistingServer: false,
  timeout: 60_000,
});

// Started after the app, which clears the state folder first.
const fakeServices = (p: ReturnType<typeof pair>, flags = "") => ({
  command: `uv run python -m tests.fake_services --port ${p.fakePort} --https-port ${p.httpsPort} --state "${p.state}" ${flags}`,
  cwd: "..",
  url: `http://127.0.0.1:${p.fakePort}/__e2e/info`,
  reuseExistingServer: false,
  timeout: 60_000,
});

export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  // One lane per server: each project has its own server and workspace, so projects run side by side, while the tests
  // inside a project (and the two that share a server, below) run in order. PW_WORKERS lowers it on a small machine.
  fullyParallel: false,
  workers: Number(process.env.PW_WORKERS) || 5,
  reporter: [["list"]],
  use: {
    ...devices["Desktop Chrome"],
    launchOptions: { executablePath },
    // Opt-in only: PW_CHANNEL=chrome runs the tests in the installed Google Chrome instead of the bundled browser.
    ...(process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {}),
    permissions: ["clipboard-read", "clipboard-write"],
    // No entry animations, so accessibility checks never catch a toast half faded in.
    contextOptions: { reducedMotion: "reduce" },
  },
  projects: [
    // The acceptance scenario and the shell checks share a server, so the shell checks wait for the scenario to finish.
    ...servers.flatMap((s) => {
      const use = { baseURL: `http://127.0.0.1:${s.port}${s.base === "/" ? "/" : `${s.base}/`}` };
      return [
        { name: s.name, testMatch: /acceptance\.spec\.ts/, use },
        { name: `${s.name}-shell`, testMatch: /shell\.spec\.ts/, use, dependencies: [s.name] },
        // The panes the shell opens (drawer, Ask pane, the stages board, review mode), and every main screen's accessibility
        // checks in light and dark at four widths (once, at the root; the nested path changes no screen).
        { name: `${s.name}-panes`, testMatch: /panes\.spec\.ts/, use, dependencies: [s.name] },
        ...(s.base === "/" ? [{ name: `${s.name}-settings`, testMatch: /settings-walk\.spec\.ts/, use, dependencies: [s.name] }] : []),
        ...(s.base === "/" ? [{ name: `${s.name}-a11y`, testMatch: /a11y\.spec\.ts/, use, dependencies: [s.name] }] : []),
        // The schedule at a phone, a tablet and a desktop width, and moving through its days (once, at the root).
        ...(s.base === "/" ? [{ name: `${s.name}-schedule`, testMatch: /schedule\.spec\.ts/, use, dependencies: [s.name] }] : []),
        // The tables beside the detail pane at 1440px (once, at the root).
        ...(s.base === "/" ? [{ name: `${s.name}-tables`, testMatch: /tables\.spec\.ts/, use, dependencies: [s.name] }] : []),
      ];
    }),
    { name: "layout", testMatch: /(layout|handled|guards|internals)\.spec\.ts/, use: { baseURL: `http://127.0.0.1:${layout.port}/` } },
    { name: "access", testMatch: /work-access\.spec\.ts/, use: { baseURL: `http://127.0.0.1:${access.port}/` } },
    { name: "capacity", testMatch: /today-(capacity|review)\.spec\.ts/, use: { baseURL: `http://127.0.0.1:${capacity.port}/` } },
    { name: "outgoing", testMatch: /outgoing\.spec\.ts/, use: { baseURL: `http://127.0.0.1:${outgoing.port}/` } },
    { name: "acts", testMatch: /acts-journey\.spec\.ts/, use: { baseURL: `http://127.0.0.1:${acts.port}/` } },
    { name: "meetings", testMatch: /meetings-journey\.spec\.ts/, use: { baseURL: `http://127.0.0.1:${meetings.port}/` } },
    { name: "just-me", testMatch: /just-me\.spec\.ts/, use: { baseURL: `http://127.0.0.1:${justMe.port}/` } },
    { name: "sides", testMatch: /side-is-a-group\.spec\.ts/, use: { baseURL: `http://127.0.0.1:${sides.port}/` } },
    { name: "side-filter", testMatch: /side-filter\.spec\.ts/, use: { baseURL: `http://127.0.0.1:${sideFilter.port}/` } },
    { name: "people-records", testMatch: /people-records\.spec\.ts/, use: { baseURL: `http://127.0.0.1:${peopleRecords.port}/` } },
    { name: "first-day", testMatch: /first-day.*\.spec\.ts/, use: { baseURL: `http://127.0.0.1:${firstDay.port}/` } },
    { name: "quick-edits", testMatch: /quick-edits\.spec\.ts/, use: { baseURL: `http://127.0.0.1:${quickEdits.port}/` } },
    { name: "late", testMatch: /late-evening\.spec\.ts/, use: { baseURL: `http://127.0.0.1:${late.port}/` } },
    {
      name: "journeys",
      testMatch: /journeys\.spec\.ts/,
      // The made-up services' sign-in page is served with the throwaway authority's certificate, which this browser
      // doesn't know; the app itself is told to trust it (see the start-up script), and the real one is never touched.
      use: { baseURL: `http://127.0.0.1:${journeys.port}/`, ignoreHTTPSErrors: true },
    },
    {
      name: "journeys-mail",
      testMatch: /journeys-mail\.spec\.ts/,
      use: { baseURL: `http://127.0.0.1:${mail.port}/`, ignoreHTTPSErrors: true },
    },
    {
      name: "journeys-new-start",
      testMatch: /journeys-new-start\.spec\.ts/,
      use: { baseURL: `http://127.0.0.1:${newStart.port}/`, ignoreHTTPSErrors: true },
    },
    {
      name: "journeys-owner-evening",
      testMatch: /journeys-owner-evening\.spec\.ts/,
      use: { baseURL: `http://127.0.0.1:${evening.port}/`, ignoreHTTPSErrors: true },
    },
  ],
  webServer: [
    ...servers.map((s) => ({
      command: `uv run python -m tests.e2e_server --port ${s.port} --base-path ${s.base}`,
      cwd: "..",
      url: `http://127.0.0.1:${s.port}${s.base === "/" ? "" : s.base}/api/health`,
      reuseExistingServer: false,
      timeout: 60_000,
    })),
    {
      command: `uv run python -m tests.e2e_server --port ${layout.port} --base-path / --layout-stress`,
      cwd: "..",
      url: `http://127.0.0.1:${layout.port}/api/health`,
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: `uv run python -m tests.e2e_server --port ${access.port} --base-path / --standin-account`,
      cwd: "..",
      url: `http://127.0.0.1:${access.port}/api/health`,
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: `uv run python -m tests.e2e_server --port ${capacity.port} --base-path /`,
      cwd: "..",
      url: `http://127.0.0.1:${capacity.port}/api/health`,
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: `uv run python -m tests.e2e_server --port ${outgoing.port} --base-path / --fake-channel`,
      cwd: "..",
      url: `http://127.0.0.1:${outgoing.port}/api/health`,
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: `uv run python -m tests.e2e_server --port ${acts.port} --base-path / --acts`,
      cwd: "..",
      url: `http://127.0.0.1:${acts.port}/api/health`,
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: `uv run python -m tests.e2e_server --port ${meetings.port} --base-path / --meetings`,
      cwd: "..",
      url: `http://127.0.0.1:${meetings.port}/api/health`,
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: `uv run python -m tests.e2e_server --port ${sides.port} --base-path / --just-me --plain-stages`,
      cwd: "..",
      url: `http://127.0.0.1:${sides.port}/api/health`,
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: `uv run python -m tests.e2e_server --port ${sideFilter.port} --base-path / --sides --plain-stages`,
      cwd: "..",
      url: `http://127.0.0.1:${sideFilter.port}/api/health`,
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: `uv run python -m tests.e2e_server --port ${peopleRecords.port} --base-path / --sides --plain-stages`,
      cwd: "..",
      url: `http://127.0.0.1:${peopleRecords.port}/api/health`,
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: `uv run python -m tests.e2e_server --port ${quickEdits.port} --base-path /`,
      cwd: "..",
      url: `http://127.0.0.1:${quickEdits.port}/api/health`,
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: `uv run python -m tests.e2e_server --port ${firstDay.port} --base-path / --first-day --plain-stages`,
      cwd: "..",
      url: `http://127.0.0.1:${firstDay.port}/api/health`,
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: `uv run python -m tests.e2e_server --port ${justMe.port} --base-path / --just-me`,
      cwd: "..",
      url: `http://127.0.0.1:${justMe.port}/api/health`,
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: `uv run python -m tests.e2e_server --port ${late.port} --base-path / --clock-at ${late.clockAt}`,
      cwd: "..",
      url: `http://127.0.0.1:${late.port}/api/health`,
      reuseExistingServer: false,
      timeout: 60_000,
    },
    freshServer(journeys, "--add-ons"),
    fakeServices(journeys),
    freshServer(mail, "--mail --no-sent-mail"),
    fakeServices(mail),
    // The new-start journey changes nothing by hand: the catalog is named through the environment, and what the app
    // prints is kept so the restarts can be counted.
    freshServer(newStart, "--add-ons --catalog-by-environment --log"),
    fakeServices(newStart, "--catalog journey_mail --sent-mail"),
    // The owner's first evening: the same start as the new-start journey, with the fake services' evening mail and model list.
    freshServer(evening, "--add-ons --catalog-by-environment --log --no-sent-mail"),
    fakeServices(evening, "--catalog journey_mail --evening"),
  ],
});
