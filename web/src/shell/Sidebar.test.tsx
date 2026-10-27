import "@testing-library/jest-dom/vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { S } from "../lib/api";
import { project } from "../lib/records-fixtures";
import { fakeApi, renderApp } from "../test-utils";
import { Sidebar } from "./Sidebar";

const panel = (name: string, tab: string, title: string): S["PanelView"] => ({
  name,
  title,
  tab,
  kind: "demo/goal",
  view: "table",
  columns: ["title"],
  primary_action: null,
  row_actions: [],
});

const change = (id: string, state: string) => ({ id, state, changeset: null }) as unknown as S["ChangeItem"];

const line = (key: string): S["QueueLineView"] => ({ key, group: "review", kind: "review", count: 1, untrusted: false, unpriced: 0, actions: [], questions: [], outcome: {} });
const plugin = { plugin: "demo", id: "L-1", text: "Look at this", about: null, action: null, action_is: null, why: "", until: null };

function show(opts: { current?: Parameters<typeof Sidebar>[0]["current"]; expanded?: boolean; panels?: S["PanelView"][]; onToggle?: () => void } = {}) {
  fakeApi({
    "GET panels": () => opts.panels ?? [],
    "GET changes": () => [change("a", "review"), change("b", "needs_you"), change("c", "done")],
    "GET followups": () => [{ person: "p", name: "Sam", is_pm: false, message: "", questions: [], actions: [], to_send: 3 }],
    "GET today/queue": () => [line("a"), line("b"), line("c")],
    "GET plugin-today": () => [plugin],
    "GET stages/requests": () => [],
    "GET stages/records": () => [],
    "GET stages/ready": () => [],
  });
  renderApp(<Sidebar current={opts.current ?? "today"} expanded={opts.expanded ?? true} onToggle={opts.onToggle ?? (() => undefined)} />);
}

const nav = () => screen.getByRole("navigation", { name: "Views" });

test("the views are links, in the fixed groups, with plugin panels only under Work or Records", async () => {
  show({
    panels: [panel("demo/goals", "work", "Goals"), panel("demo/contacts", "people", "Contacts"), panel("demo/admin", "settings", "Admin things"), panel("demo/board", "today", "Board")],
  });
  // Wait for the panels to arrive by their text, which is cheap to poll; then read every link once, because looking each
  // one up by role and name walks the whole tree again and is what made this test slow under load.
  await screen.findByText("Goals");
  const links = within(nav())
    .getAllByRole("link")
    .map((a) => ({ label: a.querySelector('[class*="label"]')?.textContent, href: a.getAttribute("href") }));
  expect(links.map((l) => l.label)).toEqual([
    "Today",
    "What changed",
    "Handled for you",
    "Follow-ups",
    "To-dos and questions",
    "Stages",
    "Goals",
    "Projects",
    "People",
    "Files",
    "Knowledge",
    "Contacts",
    "Settings",
  ]);
  const href = (label: string) => links.find((l) => l.label === label)?.href;
  for (const link of links) expect(link.href).toContain("#");
  expect(href("Stages")).toMatch(/#work\/stages$/);
  expect(href("Goals")).toMatch(/#work\/panel\/demo%2Fgoals$/);
  expect(href("Contacts")).toMatch(/#records\/panel\/demo%2Fcontacts$/);
});

test("the side menu has no Connections, Add-ons or Waiting to go out entry: they are Settings' sections and Follow-ups' To send tab", async () => {
  show();
  await screen.findByText("Follow-ups");
  for (const name of ["Connections", "Add-ons", "Waiting to go out"]) expect(within(nav()).queryByRole("link", { name })).toBeNull();
  expect(within(nav()).getByRole("link", { name: "Settings" })).toBeInTheDocument();
});

test("the current view is marked, and it is the only one", async () => {
  show({ current: "work/followups" });
  const current = await screen.findAllByRole("link", { current: "page" });
  expect(current).toHaveLength(1);
  expect(current[0]).toHaveTextContent("Follow-ups");
});

test("a plugin panel is the current view when its address is", async () => {
  show({ current: "work/panel/demo%2Fgoals", panels: [panel("demo/goals", "work", "Goals")] });
  expect(await screen.findByRole("link", { name: "Goals", current: "page" })).toBeInTheDocument();
});

test("counts show where they help and an empty count shows nothing", async () => {
  show();
  const changed = await screen.findByRole("link", { name: /^What changed/ });
  await waitFor(() => expect(screen.getByRole("link", { name: /^Follow-ups/ })).toHaveTextContent("3"));
  // What changed is the history: what waits is counted on Today, so it has no count even when the screen lists changes.
  expect(changed).toHaveTextContent(/^What changed$/);
  // Today counts its own lines (the queue's and the add-ons'), the same number its heading gives; the views with no count
  // have none.
  await within(screen.getByRole("link", { name: /^Today/ })).findByText("4");
  expect(screen.getByRole("link", { name: "Stages" })).toHaveTextContent(/^Stages$/);
});

test("with the sidebar collapsed to a rail, each icon still has its name, and the toggle pins it open", async () => {
  const user = userEvent.setup();
  const onToggle = vi.fn();
  show({ expanded: false, onToggle });
  const stages = await screen.findByRole("link", { name: "Stages" });
  while (document.activeElement !== stages) await user.tab();
  expect(await screen.findByRole("tooltip")).toHaveTextContent("Stages");
  await user.click(screen.getByRole("button", { name: "Keep the side menu open" }));
  expect(onToggle).toHaveBeenCalledTimes(1);
});

test("the toggle collapses a sidebar that shows labels", async () => {
  show({ expanded: true });
  expect(await screen.findByRole("button", { name: "Hide the side menu" })).toBeInTheDocument();
});

// ---- sides (design 6.32, 7.8) ---------------------------------------------------------------------------------------

const PERSONAL = "PRJ-personal";
const FIRST = { project: "PRJ-first", kind: "business", name: "Orchard Press" };
const SECOND = { project: "PRJ-second", kind: "job", name: "Lantern Works" };

/** The sidebar once the person's sides have been read, with the other views as in any workspace. */
function showWithSides(sides: Array<typeof FIRST>) {
  fakeApi({
    "GET panels": () => [],
    "GET changes": () => [],
    "GET followups": () => [],
    "GET today/queue": () => [],
    "GET plugin-today": () => [],
    "GET stages/requests": () => [],
    "GET stages/records": () => [],
    "GET stages/ready": () => [],
    "GET setup/business": () => ({ business: sides.length > 0, name: sides[0]?.name ?? null, personal: PERSONAL, sides, chosen: null }),
    // The person's projects: Personal's own, and each side's top project.
    "GET projects": () => [project(PERSONAL, "Personal"), ...sides.map((s) => project(s.project, s.name))],
  });
  renderApp(<Sidebar current="today" expanded onToggle={() => undefined} />);
}

const labels = () =>
  within(nav())
    .getAllByRole("link")
    .map((a) => a.querySelector('[class*="label"]')?.textContent);

test("with no side besides Personal the first group has no Work heading, and Stages and Projects are not listed", async () => {
  showWithSides([]);
  await screen.findByRole("link", { name: "Personal" });
  expect(labels()).toEqual([
    "Today",
    "What changed",
    "Handled for you",
    "Follow-ups",
    "To-dos and questions",
    "Personal",
    "People",
    "Files",
    "Knowledge",
    "Settings",
  ]);
  expect(within(nav()).queryByText("Work")).toBeNull();
  // The group is still one group for a screen reader, named without the word.
  expect(within(nav()).getByRole("group", { name: "Your day" })).toBeInTheDocument();
  // Personal is a page of its own: the Personal project's page.
  expect(screen.getByRole("link", { name: "Personal" })).toHaveAttribute("href", expect.stringMatching(new RegExp(`#records/project/${PERSONAL}$`)));
});

test("with sides the menu has Personal and each side by its own name, each a link to that top project's page, and the work views return", async () => {
  showWithSides([FIRST, SECOND]);
  await screen.findByRole("link", { name: FIRST.name });
  expect(labels()).toEqual([
    "Today",
    "What changed",
    "Handled for you",
    "Follow-ups",
    "To-dos and questions",
    "Stages",
    "Personal",
    FIRST.name,
    SECOND.name,
    "People",
    "Files",
    "Knowledge",
    "Settings",
  ]);
  expect(within(nav()).getByText("Work")).toBeInTheDocument();
  expect(within(nav()).queryByRole("link", { name: "Projects" })).toBeNull();
  expect(screen.getByRole("link", { name: FIRST.name })).toHaveAttribute("href", expect.stringMatching(new RegExp(`#records/project/${FIRST.project}$`)));
  expect(screen.getByRole("link", { name: SECOND.name })).toHaveAttribute("href", expect.stringMatching(new RegExp(`#records/project/${SECOND.project}$`)));
});

test("the current top project's page is the marked one", async () => {
  fakeApi({
    "GET panels": () => [],
    "GET changes": () => [],
    "GET followups": () => [],
    "GET today/queue": () => [],
    "GET plugin-today": () => [],
    "GET setup/business": () => ({ business: true, name: FIRST.name, personal: PERSONAL, sides: [FIRST], chosen: "work" }),
    "GET projects": () => [project(PERSONAL, "Personal"), project(FIRST.project, FIRST.name)],
  });
  renderApp(<Sidebar current={`records/project/${FIRST.project}`} expanded onToggle={() => undefined} />);
  expect(await screen.findByRole("link", { name: FIRST.name, current: "page" })).toBeInTheDocument();
});

test("a workspace with projects of its own and no side keeps the Projects and Stages entries", async () => {
  fakeApi({
    "GET panels": () => [],
    "GET changes": () => [],
    "GET followups": () => [],
    "GET today/queue": () => [],
    "GET plugin-today": () => [],
    "GET setup/business": () => ({ business: false, name: null, personal: PERSONAL, sides: [], chosen: null }),
    "GET projects": () => [project(PERSONAL, "Personal"), project("PRJ-own", "A project of its own")],
  });
  renderApp(<Sidebar current="today" expanded onToggle={() => undefined} />);
  await screen.findByText("Work");
  expect(labels()).toEqual(expect.arrayContaining(["Stages", "Projects"]));
  expect(labels()).not.toContain("Personal");
});
