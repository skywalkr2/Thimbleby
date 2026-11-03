import "@testing-library/jest-dom/vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import type { S } from "../lib/api";
import { ConnectionProvider } from "../lib/connection";
import { project } from "../lib/records-fixtures";
import { setSideChoice } from "../lib/sides";
import { fakeApi, Refuse, renderApp, type Routes } from "../test-utils";
import { OfflineBanner } from "../ui/OfflineBanner";
import { Files } from "./Files";
import { FollowUps } from "./FollowUps";
import { Handled } from "./Handled";
import { Notes } from "./Notes";
import { OpenItems } from "./OpenItems";
import { People } from "./People";
import { Projects } from "./Projects";
import { WhatChanged } from "./WhatChanged";

// The states every list screen has (VP07): loading as skeleton rows, couldn't load with Try again, offline with what was loaded
// still readable, and filtered to nothing with Clear filter. One table of the screens, so a screen added to it gets the same.

const SIDE = { project: "PRJ-side", kind: "business", name: "Orchard Press" };
const PERSONAL = "PRJ-personal";
const business = { "GET setup/business": () => ({ business: true, name: SIDE.name, personal: PERSONAL, sides: [SIDE], chosen: "work" }) };
const base: Routes = { "GET people": () => [], "GET projects": () => [], ...business };

interface Entry {
  name: string;
  view: () => ReactElement;
  /** The route that carries the list. */
  route: string;
  /** What the screen says when that list could not be loaded. */
  failed: string;
  /** What a list that loaded holds, to prove Try again brings it. */
  loaded: unknown;
  /** The text of one row once loaded; none for a list that loads empty. */
  row?: string;
}

const todo: S["OpenActionView"] = {
  id: "A-1",
  version: 3,
  text: "Send the proof to the printer",
  state: "open",
  owners: [{ person: "P-1", name: "Quinn Sample" }],
  due: null,
  project: "PRJ-1",
  project_name: "Harbor",
  parent_name: null,
  notes: null,
  since: "2026-10-01",
  on_hold: null,
  blocker: null,
  duplicate: null,
  origin: null,
  untouched_days: null,
  owner_question: null,
  to_send: false,
  needs_you: true,
};
const handled = { tab: "read", group: "kind", item: null, groups: [], counts: {} } as unknown as S["HandledView"];

const SCREENS: Entry[] = [
  { name: "To-dos", view: () => <OpenItems />, route: "GET open-items", failed: "To-dos and questions didn't load.", loaded: { actions: [todo], questions: [], stale_days: 21 }, row: "Send the proof to the printer" },
  { name: "Follow-ups", view: () => <FollowUps />, route: "GET followups", failed: "Follow-ups didn't load.", loaded: [] },
  { name: "What changed", view: () => <WhatChanged />, route: "GET changes", failed: "The list didn't load.", loaded: [] },
  { name: "Handled for you", view: () => <Handled />, route: "GET handled", failed: "The list couldn't be loaded.", loaded: handled },
  { name: "People", view: () => <People />, route: "GET people", failed: "The people couldn't be loaded.", loaded: [{ id: "P-1", name: "Quinn Sample", status: "active", aliases: [], how_to_reach: {}, open_items: 0, is_pm: false }], row: "Quinn Sample" },
  { name: "Projects", view: () => <Projects />, route: "GET projects", failed: "The projects couldn't be loaded.", loaded: [project("PRJ-1", "Harbor")], row: "Harbor" },
  { name: "Files", view: () => <Files />, route: "GET files", failed: "The files didn't load.", loaded: [] },
  { name: "Notes", view: () => <Notes />, route: "GET notes", failed: "The notes didn't load.", loaded: [] },
];

const serve = (entry: Entry, answer: Routes[string]) => fakeApi({ ...base, [entry.route]: answer });
const offline = (children: ReactElement) => (
  <ConnectionProvider live={{ state: "offline", lastUpdate: new Date("2026-11-03T10:42:00Z"), refresh: () => undefined, reconnect: () => undefined }}>
    <OfflineBanner />
    {children}
  </ConnectionProvider>
);
/** The alert that carries a failed load: the one that has the screen's words. */
const failedWith = (text: string) =>
  waitFor(() => {
    const found = Array.from(document.querySelectorAll<HTMLElement>('[role="alert"]')).find((el) => el.textContent?.includes(text));
    if (!found) throw new Error(`No alert says: ${text}`);
    return found;
  });

beforeEach(() => setSideChoice("all"));

describe.each(SCREENS)("$name", (entry) => {
  test("while it loads it shows skeleton rows, not words", () => {
    serve(entry, () => new Promise(() => undefined));
    renderApp(entry.view());
    const loading = screen.getAllByRole("status", { name: "Loading…" });
    expect(loading.length).toBeGreaterThan(0);
    expect(loading[0]).toHaveAttribute("aria-busy", "true");
  });

  test("when it can't be loaded it says so plainly with Try again, and Try again loads it", async () => {
    const user = userEvent.setup();
    let ok = false;
    serve(entry, () => (ok ? entry.loaded : new Refuse(500, "The folder is locked.")));
    renderApp(entry.view());
    const failed = await failedWith(entry.failed);
    ok = true;
    await user.click(within(failed).getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(Array.from(document.querySelectorAll('[role="alert"]')).some((el) => el.textContent?.includes(entry.failed))).toBe(false));
    if (entry.row) expect(await screen.findByText(entry.row)).toBeVisible();
  });

  test("offline, what could not be loaded says the app can't reach its server, under the one offline banner", async () => {
    serve(entry, () => new Refuse(500, ""));
    renderApp(offline(entry.view()));
    expect(await failedWith(entry.failed)).toHaveTextContent("The app can't reach its server.");
    expect(screen.getByText("You're offline.")).toBeVisible();
  });
});

test("offline, a list that was loaded stays readable under the banner", async () => {
  fakeApi({ ...base, "GET notes": () => [{ id: "N-1", text: "Order paper", project: null, project_name: null, side_name: null, created_at: "2026-10-20T09:00:00Z", trust: "trusted" }] });
  renderApp(offline(<Notes />));
  expect(await screen.findByRole("link", { name: "Order paper" })).toBeVisible();
  expect(screen.getByText("You're offline.")).toBeVisible();
});

// ---- filtered to nothing ------------------------------------------------------------------------------------------------

test("the to-dos filtered to a side with none say which side, and Clear filter shows everything again", async () => {
  const user = userEvent.setup();
  fakeApi({
    ...base,
    "GET open-items": () => ({ actions: [{ ...todo, side: PERSONAL }], questions: [], stale_days: 21 }),
    "GET projects": () => [project(PERSONAL, "Personal", { side: true }), project(SIDE.project, SIDE.name, { side: true })],
  });
  setSideChoice(SIDE.project);
  renderApp(<OpenItems />);
  expect(await screen.findByText("Nothing open on the Orchard Press side.")).toBeVisible();
  await user.click(screen.getByRole("button", { name: "Clear filter" }));
  expect(await screen.findByText("Send the proof to the printer")).toBeVisible();
});

test("the notes filtered to a side with none say which side, and Clear filter shows them again", async () => {
  const user = userEvent.setup();
  fakeApi({
    ...base,
    "GET notes": () => [{ id: "N-1", text: "Order paper", project: "PRJ-personal", project_name: "Personal", side_name: null, created_at: "2026-10-20T09:00:00Z", trust: "trusted" }],
    "GET projects": () => [project(PERSONAL, "Personal", { side: true }), project(SIDE.project, SIDE.name, { side: true })],
  });
  setSideChoice(SIDE.project);
  renderApp(<Notes />);
  expect(await screen.findByText("No notes on the Orchard Press side.")).toBeVisible();
  await user.click(screen.getByRole("button", { name: "Clear filter" }));
  expect(await screen.findByRole("link", { name: "Order paper" })).toBeVisible();
});

test("the to-dos narrowed by the screen's own filters to nothing say so, and Clear filter shows them again", async () => {
  const user = userEvent.setup();
  fakeApi({ ...base, "GET open-items": () => ({ actions: [todo], questions: [], stale_days: 21 }) });
  const { chooseFilters } = await import("../lib/open-items");
  chooseFilters({ person: "P-9" });
  renderApp(<OpenItems />);
  expect(await screen.findByText("Nothing matches these filters.")).toBeVisible();
  await user.click(screen.getByRole("button", { name: "Clear filter" }));
  expect(await screen.findByText("Send the proof to the printer")).toBeVisible();
});
