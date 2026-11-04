import "@testing-library/jest-dom/vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { S } from "../lib/api";
import { person, project } from "../lib/records-fixtures";
import { onSide, setSideChoice, viewChoice } from "../lib/sides";
import { waitingUnder } from "../lib/waiting";
import { besidePane, fakeApi, renderApp, type Routes } from "../test-utils";
import { OpenItems } from "./OpenItems";
import { SideFilter } from "./SideFilter";
import { Views } from "./Views";

// Views (design 6.32): the side filter lists the person's views under their side, a view's choice shows what is in its
// projects plus what is on no project, a line in two views carries both tags, and the person manages views on Projects.

beforeEach(() => {
  besidePane();
  setSideChoice("all");
});

const PERSONAL = "PRJ-personal";
const WORK = "PRJ-work";
const WORK_NAME = "Example Works";
const BOTH = "PRJ-both";
const FIRST = "PRJ-first";
const REST = "PRJ-rest";
const PORTFOLIO = "VIEW-1";
const OWN = "VIEW-2";

const view = (id: string, name: string, label: string, projects: string[]): S["WorkViewView"] => ({
  id,
  name,
  label,
  side: WORK,
  side_name: WORK_NAME,
  projects: projects.map((p) => ({ id: p, name: p.replace("PRJ-", "") })),
});
const views = [view(PORTFOLIO, "Manager's portfolio", "Portfolio", [BOTH, FIRST]), view(OWN, "My projects", "Mine", [BOTH])];

const routes: Routes = {
  "GET setup/business": () => ({ business: true, name: WORK_NAME, personal: PERSONAL, sides: [{ project: WORK, kind: "job", name: WORK_NAME, removable: false }], chosen: "work" }),
  "GET projects": () => [
    project(PERSONAL, "Personal", { side: true }),
    project(WORK, WORK_NAME, { side: true }),
    project(BOTH, "Shared plan", { parent: WORK }),
    project(FIRST, "Portfolio only", { parent: WORK }),
    project(REST, "Left over", { parent: WORK }),
  ],
  "GET views": () => views,
  "GET people": () => [person("P-1", "Quinn Sample")],
};

const action = (id: string, text: string, projectId: string | null, name: string | null, side: string | null, held: string[]): S["OpenActionView"] => ({
  id,
  version: 1,
  text,
  state: "open",
  owners: [{ person: "P-1", name: "Quinn Sample" }],
  due: null,
  project: projectId,
  project_name: name ?? "",
  parent_name: null,
  side,
  views: held,
  notes: null,
  since: "2026-10-01",
  on_hold: null,
  blocker: null,
  duplicate: null,
  origin: null,
  untouched_days: null,
  owner_question: null,
  to_send: false,
});
const todos: Routes = {
  "GET open-items": () => ({
    actions: [
      action("A-1", "Draft the shared plan", BOTH, "Shared plan", WORK, [PORTFOLIO, OWN]),
      action("A-2", "Review the portfolio", FIRST, "Portfolio only", WORK, [PORTFOLIO]),
      action("A-3", "Tidy the leftovers", REST, "Left over", WORK, []),
      action("A-4", "Renew the licence", null, null, null, []),
      action("A-5", "Book the dentist", PERSONAL, "Personal", PERSONAL, []),
      action("A-6", "File the side's papers", WORK, null, WORK, []),
    ],
    questions: [],
    stale_days: 21,
  }),
};

// A choice may carry the count of what the open tab holds ("All, 3 waiting"): it is found by its name first.
const named = (name: RegExp | string) => (typeof name === "string" ? new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(,|$)`) : name);
// More than four choices are one "Side" button with a sheet of them: open it, then read or pick a choice in it.
const openSheet = async () => {
  await userEvent.setup().click(await screen.findByRole("button", { name: /^Side: / }));
  return within(await screen.findByRole("dialog"));
};
const choices = (sheet: ReturnType<typeof within>): HTMLElement[] => sheet.getAllByRole("button").filter((b: HTMLElement) => b.hasAttribute("data-side-option"));
const choose = async (name: RegExp | string) => userEvent.setup().click((await openSheet()).getByRole("button", { name: named(name) }));

test("the filter lists the person's views under their side, each named with its side", async () => {
  fakeApi(routes);
  renderApp(<SideFilter />);
  const sheet = await openSheet();
  expect(choices(sheet).map((b) => b.textContent)).toEqual(["All", "Personal", WORK_NAME, `${WORK_NAME}: Manager's portfolio`, `${WORK_NAME}: My projects`]);
});

test("without a side there are no views to choose, whatever the server holds", async () => {
  fakeApi({ ...routes, "GET setup/business": () => ({ business: false, name: null, personal: PERSONAL, sides: [], chosen: "me" }) });
  renderApp(<SideFilter />);
  await waitFor(() => expect(screen.queryByRole("button", { name: /^Side: / })).toBeNull());
});

test("a view's choice shows what is in its projects, what is on no project and what is on no side, and none disappear on the other view", async () => {
  fakeApi({ ...routes, ...todos });
  renderApp(<OpenItems />);
  expect(await screen.findByText("Draft the shared plan")).toBeInTheDocument();
  await choose(`${WORK_NAME}: Manager's portfolio`);
  await waitFor(() => expect(screen.queryByText("Tidy the leftovers")).toBeNull());
  expect(screen.getByText("Draft the shared plan")).toBeInTheDocument();
  expect(screen.getByText("Review the portfolio")).toBeInTheDocument();
  expect(screen.getByText("Renew the licence")).toBeInTheDocument(); // on no side
  expect(screen.getByText("File the side's papers")).toBeInTheDocument(); // on the side, in no project
  expect(screen.queryByText("Book the dentist")).toBeNull(); // another side
  // The project in both views is still there under the other one; the one only in the first is not.
  await choose(`${WORK_NAME}: My projects`);
  await waitFor(() => expect(screen.queryByText("Review the portfolio")).toBeNull());
  expect(screen.getByText("Draft the shared plan")).toBeInTheDocument();
  expect(screen.getByText("Renew the licence")).toBeInTheDocument();
  // The side's own choice shows all of its work, whatever the views.
  await choose(WORK_NAME);
  expect(await screen.findByText("Tidy the leftovers")).toBeInTheDocument();
  expect(screen.getByText("Review the portfolio")).toBeInTheDocument();
});

test("a row in two views carries both labels, one in one view carries one, and one in none carries none", async () => {
  fakeApi({ ...routes, ...todos });
  renderApp(<OpenItems />);
  const row = async (text: string) => (await screen.findByText(text)).closest("[data-row]") as HTMLElement;
  const tags = async (text: string) => within(await row(text)).queryAllByText(/^(Portfolio|Mine)$/).map((e) => e.textContent);
  expect(await tags("Draft the shared plan")).toEqual(["Portfolio", "Mine"]);
  expect(await tags("Review the portfolio")).toEqual(["Portfolio"]);
  expect(await tags("Tidy the leftovers")).toEqual([]);
  expect(await tags("Renew the licence")).toEqual([]);
});

test("a person with no view sees no tags", async () => {
  fakeApi({ ...routes, ...todos, "GET views": () => [] });
  renderApp(<OpenItems />);
  expect(await screen.findByText("Draft the shared plan")).toBeInTheDocument();
  expect(screen.queryByText("Portfolio")).toBeNull();
});

test("a stored choice that names a view that is gone falls back to All, and one that names a side keeps working", async () => {
  fakeApi({ ...routes, ...todos });
  setSideChoice(viewChoice("VIEW-gone"));
  renderApp(<OpenItems />);
  expect(await screen.findByText("Book the dentist")).toBeInTheDocument();
  expect(await screen.findByRole("button", { name: "Side: All" })).toBeInTheDocument();
  await choose("Personal");
  expect(await screen.findByRole("button", { name: "Side: Personal" })).toBeInTheDocument();
  expect(screen.queryByText("Draft the shared plan")).toBeNull();
});

test("what a view's count adds up to is the server's, and a view's choice reads its own count", async () => {
  const counts: S["WaitingCount"] = {
    total: 6,
    sides: [{ side: WORK, count: 5 }],
    views: [
      { view: PORTFOLIO, count: 4 },
      { view: OWN, count: 2 },
    ],
  };
  expect(waitingUnder(counts, viewChoice(PORTFOLIO))).toBe(4);
  expect(waitingUnder(counts, viewChoice(OWN))).toBe(2);
  expect(waitingUnder(counts, viewChoice("VIEW-gone"))).toBe(0);
  expect(waitingUnder(counts, WORK)).toBe(5);
  expect(waitingUnder(counts, "all")).toBe(6);
  fakeApi({
    ...routes,
    "GET waiting": () => ({ changed: counts, followups: counts, open: counts, handled: counts }),
  });
  renderApp(<SideFilter waiting="open" />);
  const sheet = await openSheet();
  expect(sheet.getByRole("button", { name: `${WORK_NAME}: Manager's portfolio, 4 waiting` })).toBeInTheDocument();
  expect(sheet.getByRole("button", { name: `${WORK_NAME}: My projects, 2 waiting` })).toBeInTheDocument();
});

test("onSide reads a view's choice by the side the filter last read for it", async () => {
  fakeApi(routes);
  renderApp(<SideFilter />);
  await openSheet();
  const choice = viewChoice(OWN);
  expect(onSide(WORK, choice, [OWN], true)).toBe(true);
  expect(onSide(WORK, choice, [PORTFOLIO], true)).toBe(false);
  expect(onSide(WORK, choice, [], true)).toBe(false); // in a project no view holds
  expect(onSide(WORK, choice, [], false)).toBe(true); // on no project at all
  expect(onSide(null, choice, [], true)).toBe(true); // on no side
  expect(onSide(PERSONAL, choice, [], false)).toBe(false); // another side
  expect(onSide(WORK, choice)).toBe(true); // a list that does not know views shows the view's whole side
  expect(onSide(PERSONAL, choice)).toBe(false);
});

// ---- Managing views --------------------------------------------------------------------------------------------------

test("Projects lists the views with their side, tag and projects, and offers Add view", async () => {
  fakeApi(routes);
  renderApp(<Views />);
  const list = await screen.findByRole("list", { name: "Your views" });
  expect(within(list).getByText("Manager's portfolio")).toBeInTheDocument();
  expect(within(list).getByText(`${WORK_NAME} · Portfolio · 2 projects`)).toBeInTheDocument();
  expect(within(list).getByText(`${WORK_NAME} · Mine · 1 project`)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Add view" })).toBeInTheDocument();
});

test("the views section is not drawn for a person with no side of work", async () => {
  fakeApi({ ...routes, "GET setup/business": () => ({ business: false, name: null, personal: PERSONAL, sides: [], chosen: "me" }) });
  const { container } = renderApp(<Views />);
  await waitFor(() => expect(container.querySelector("[data-views]")).toBeNull());
});

test("adding a view takes a name, a tag and the side's projects ticked from a list, and Undo takes it back", async () => {
  const user = userEvent.setup();
  const calls = fakeApi({
    ...routes,
    "POST views": () => ({ changeset: "CS-1", view: "VIEW-3" }),
    "POST changesets/CS-1/undo": () => ({ restored: ["VIEW-3"], skipped: [] }),
  });
  renderApp(<Views />);
  await user.click(await screen.findByRole("button", { name: "Add view" }));
  const dialog = await screen.findByRole("dialog");
  expect(within(dialog).getByRole("textbox", { name: /Name/ })).toHaveFocus();
  // Projects are ticked from the side's list, never typed as ids.
  expect((await within(dialog).findAllByRole("checkbox")).map((c) => c.closest("label")?.textContent)).toEqual(["Shared plan", "Portfolio only", "Left over"]);
  expect(within(dialog).getByRole("button", { name: "Add view" })).toBeDisabled();
  await user.type(within(dialog).getByRole("textbox", { name: /Name/ }), "Side jobs");
  await user.click(within(dialog).getByRole("checkbox", { name: "Left over" }));
  await user.click(within(dialog).getByRole("checkbox", { name: "Shared plan" }));
  await user.click(within(dialog).getByRole("button", { name: "Add view" }));
  await waitFor(() => expect(calls.some((c) => c.route === "POST views")).toBe(true));
  expect(calls.find((c) => c.route === "POST views")?.body).toEqual({ name: "Side jobs", label: null, side: WORK, projects: [REST, BOTH] });
  await user.click(await screen.findByRole("button", { name: "Undo" }));
  await waitFor(() => expect(calls.some((c) => c.route === "POST changesets/CS-1/undo")).toBe(true));
});

test("a view is renamed and its projects picked from a menu, each with Undo", async () => {
  const user = userEvent.setup();
  const calls = fakeApi({
    ...routes,
    [`POST views/${OWN}/rename`]: () => ({ changeset: "CS-2" }),
    [`POST views/${OWN}/projects`]: () => ({ changeset: "CS-3" }),
  });
  renderApp(<Views />);
  await user.click(await screen.findByRole("button", { name: "More actions for My projects" }));
  await user.click(await screen.findByRole("menuitem", { name: "Rename" }));
  let dialog = await screen.findByRole("dialog");
  const name = within(dialog).getByRole("textbox", { name: /Name/ });
  expect(name).toHaveValue("My projects");
  await user.clear(name);
  await user.type(name, "My own work");
  await user.click(within(dialog).getByRole("button", { name: "Save" }));
  await waitFor(() => expect(calls.find((c) => c.route === `POST views/${OWN}/rename`)?.body).toEqual({ name: "My own work", label: "Mine" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  await user.click(await screen.findByRole("button", { name: "More actions for My projects" }));
  await user.click(await screen.findByRole("menuitem", { name: "Pick projects" }));
  dialog = await screen.findByRole("dialog");
  expect(within(dialog).getByRole("checkbox", { name: "Shared plan" })).toBeChecked();
  await user.click(within(dialog).getByRole("checkbox", { name: "Portfolio only" }));
  await user.click(within(dialog).getByRole("button", { name: "Save" }));
  await waitFor(() => expect(calls.find((c) => c.route === `POST views/${OWN}/projects`)?.body).toEqual({ projects: [BOTH, FIRST] }));
});

test("removing a view acts at once and Undo brings it back", async () => {
  const user = userEvent.setup();
  const calls = fakeApi({
    ...routes,
    [`DELETE views/${OWN}`]: () => ({ changeset: "CS-4" }),
    "POST changesets/CS-4/undo": () => ({ restored: [OWN], skipped: [] }),
  });
  renderApp(<Views />);
  await user.click(await screen.findByRole("button", { name: "More actions for My projects" }));
  await user.click(await screen.findByRole("menuitem", { name: "Remove" }));
  await waitFor(() => expect(calls.some((c) => c.route === `DELETE views/${OWN}`)).toBe(true));
  expect(screen.queryByRole("dialog")).toBeNull();
  await user.click(await screen.findByRole("button", { name: "Undo" }));
  await waitFor(() => expect(calls.some((c) => c.route === "POST changesets/CS-4/undo")).toBe(true));
});

test("with no view yet the section is one quiet line with Add view, not a card with an empty state", async () => {
  fakeApi({ ...routes, "GET views": () => [] });
  const { container } = renderApp(<Views />);
  expect(await screen.findByText(/^No views yet\./)).toBeInTheDocument();
  expect(screen.getAllByRole("button", { name: "Add view" })).toHaveLength(1);
  expect(container.querySelector("[data-empty]")).toBeNull();
  expect(screen.queryByRole("list", { name: "Your views" })).toBeNull();
});
