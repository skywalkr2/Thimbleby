import "@testing-library/jest-dom/vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { S } from "../lib/api";
import { project } from "../lib/records-fixtures";
import { fakeApi, renderApp } from "../test-utils";
import { RecordPage } from "./RecordPage";

// Personal's page and each side's page (design 6.32, 7.8): the top project says what is inside it, and never calls itself a
// project; for a person with no side beside Personal no word of the page is about projects, stages or owners.

const PERSONAL = project("PRJ-personal", "Personal", { no_end: true, side: true });
const AREA = project("PRJ-area", "Home", { parent: "PRJ-personal", no_end: true, open_actions: 2, open_questions: 1 });
const SIDE = { project: "PRJ-side", kind: "business" as const, name: "Orchard Press" };
const BOOK = project("PRJ-book", "The spring catalog", { parent: "PRJ-side", open_actions: 3 });
const OTHER = project("PRJ-other", "Elsewhere");

const knows = (id: string, name: string): S["ProjectKnowsView"] => ({
  id,
  name,
  sources: [],
  facts: [],
  terms: [],
  routing: [],
  unknown: [{ field: "owner", kind: "field" }],
  area: false,
  reading: { state: "none", levels: [], readers: [] },
});

const page = (id: string, name: string): S["RecordPageView"] => ({
  kind: "project",
  id,
  version: 2,
  name,
  details: [],
  open_actions: [],
  open_questions: [],
  completed_actions: [],
  facts: [],
  fact_source: null,
  activity: [],
});

function show(id: string, name: string, sides: Array<typeof SIDE>, fields: Record<string, unknown> = {}, extra: Record<string, (body: unknown) => unknown> = {}) {
  // With no side the workspace holds Personal and what is inside it; with a side, that side and its project too.
  const projects = [PERSONAL, AREA, ...(sides.length ? [OTHER, project(SIDE.project, SIDE.name, { side: true, summary: "An independent publishing imprint.", aliases: ["Orchard"] }), BOOK] : [])];
  const calls = fakeApi({
    [`GET record?kind=project&id=${id}`]: () => ({ kind: "project", id, version: 2, fields: { id, name, ...fields }, long_text: [] }),
    "GET kinds/project": () => ({ kind: "project", fields: [] }),
    [`GET record-pages/${id}?kind=project`]: () => page(id, name),
    [`GET projects/${id}/knows`]: () => knows(id, name),
    "GET people": () => [],
    "GET projects": () => projects,
    "GET settings": () => ({ fingerprint: "fp", items: [] }),
    "GET lists": () => [],
    "GET organizations": () => [],
    [`GET plugin-actions?kind=project&id=${id}`]: () => [],
    [`GET task-kinds?kind=project&id=${id}`]: () => [],
    "GET setup/business": () => ({ business: sides.length > 0, name: sides[0]?.name ?? null, personal: PERSONAL.id, sides, chosen: null }),
    ...extra,
  });
  renderApp(<RecordPage kind="project" id={id} onBack={() => {}} />);
  return calls;
}

test("with no side besides Personal its page lists its areas, with what is open in each, and calls nothing a project", async () => {
  show(PERSONAL.id, PERSONAL.name, []);
  const areas = await screen.findByRole("region", { name: "Areas" });
  const row = within(areas).getByRole("link", { name: "Home" }).closest("li")!;
  expect(row).toHaveTextContent("2 open to-dos");
  expect(row).toHaveTextContent("1 open question");
  // What is not inside Personal is not listed, and the page names no kind of record.
  expect(within(areas).queryByText("Elsewhere")).toBeNull();
  await screen.findByRole("heading", { level: 2, name: /What .* knows/ });
  const text = document.body.textContent ?? "";
  expect(text).not.toMatch(/\b(Work|Projects?|Stages?|Organizations?|Owners?|Templates?)\b/);
  // The parts about who answers what and what is still unknown (its owner, its phase) are left out for Personal.
  expect(screen.queryByRole("heading", { name: "Still unknown" })).toBeNull();
  expect(screen.queryByRole("heading", { name: "Who answers what" })).toBeNull();
});

test("with no area yet, Personal's page says how areas come", async () => {
  fakeApi({
    "GET record?kind=project&id=PRJ-personal": () => ({ kind: "project", id: PERSONAL.id, version: 2, fields: { id: PERSONAL.id, name: "Personal" }, long_text: [] }),
    "GET kinds/project": () => ({ kind: "project", fields: [] }),
    "GET record-pages/PRJ-personal?kind=project": () => page(PERSONAL.id, "Personal"),
    "GET projects/PRJ-personal/knows": () => knows(PERSONAL.id, "Personal"),
    "GET people": () => [],
    "GET projects": () => [PERSONAL],
    "GET settings": () => ({ fingerprint: "fp", items: [] }),
    "GET lists": () => [],
    "GET organizations": () => [],
    "GET plugin-actions?kind=project&id=PRJ-personal": () => [],
    "GET task-kinds?kind=project&id=PRJ-personal": () => [],
    "GET setup/business": () => ({ business: false, name: null, personal: PERSONAL.id, sides: [], chosen: null }),
  });
  renderApp(<RecordPage kind="project" id={PERSONAL.id} onBack={() => {}} />);
  expect(await screen.findByText(/No areas yet/)).toBeInTheDocument();
});

test("a side's page lists its projects and links to every project", async () => {
  show(SIDE.project, SIDE.name, [SIDE]);
  const projects = await screen.findByRole("region", { name: "Projects" });
  const row = within(projects).getByRole("link", { name: BOOK.name }).closest("li")!;
  expect(row).toHaveTextContent("3 open to-dos");
  expect(within(projects).queryByText("Home")).toBeNull();
  expect(within(projects).getByRole("link", { name: "See every project" })).toHaveAttribute("href", expect.stringMatching(/#records\/projects$/));
  // A side's page keeps the full account of what the assistant knows, including what is still unknown.
  expect(await screen.findByRole("heading", { name: "Still unknown" })).toBeInTheDocument();
});

test("a project that is not the top of a side lists nothing inside it", async () => {
  show(OTHER.id, OTHER.name, [SIDE]);
  await screen.findByRole("heading", { level: 1, name: OTHER.name });
  expect(screen.queryByRole("region", { name: "Areas" })).toBeNull();
  expect(screen.queryByRole("region", { name: "Projects" })).toBeNull();
});

test("a side's Edit details is a small drawer with only Name, Other names and Description, never the project form", async () => {
  const user = userEvent.setup();
  show(SIDE.project, SIDE.name, [SIDE]);
  await user.click(await screen.findByRole("button", { name: "Edit details" }));
  const drawer = await screen.findByRole("dialog", { name: `Edit ${SIDE.name}` });
  expect(within(drawer).getByRole("textbox", { name: "Name" })).toHaveValue(SIDE.name);
  expect(within(drawer).getByRole("textbox", { name: /Other names/ })).toHaveValue("Orchard");
  expect(within(drawer).getByRole("textbox", { name: "Description" })).toHaveValue("An independent publishing imprint.");
  // The first field has the cursor.
  await waitFor(() => expect(within(drawer).getByRole("textbox", { name: "Name" })).toHaveFocus());
  for (const projectOnly of [/Target/, /Status/, /Phase/, /Stage/, /Priority/, /Group/, /Owner/, /Your role/, /Inside/, /Language/, /Budget/, /spending limit/]) {
    expect(within(drawer).queryByLabelText(projectOnly)).toBeNull();
  }
  expect(screen.queryByRole("dialog", { name: "Edit project" })).toBeNull();
});

test("saving a side's details sends only its name, other names and description", async () => {
  const user = userEvent.setup();
  const calls = show(SIDE.project, SIDE.name, [SIDE], {}, { [`POST projects/${SIDE.project}`]: () => ({ ok: true }) });
  await user.click(await screen.findByRole("button", { name: "Edit details" }));
  const drawer = await screen.findByRole("dialog", { name: `Edit ${SIDE.name}` });
  const description = within(drawer).getByRole("textbox", { name: "Description" });
  await user.clear(description);
  await user.type(description, "A small publisher.");
  await user.click(within(drawer).getByRole("button", { name: "Save" }));
  await waitFor(() => expect(calls.some((c) => c.route === `POST projects/${SIDE.project}`)).toBe(true));
  expect(calls.find((c) => c.route === `POST projects/${SIDE.project}`)?.body).toEqual({ name: SIDE.name, aliases: ["Orchard"], summary: "A small publisher." });
});

test("a side's Details list shows no project-only rows, only its name, other names and description", async () => {
  show(SIDE.project, SIDE.name, [SIDE], { status: "Open", phase: "Drafting", owner: "PER-1", role: "run", language: "en-US", summary: "An independent publishing imprint.", aliases: ["Orchard"] });
  const details = await screen.findByRole("region", { name: "Details" });
  expect(await within(details).findByText("An independent publishing imprint.")).toBeInTheDocument();
  expect(within(details).queryByText("Open")).toBeNull();
  expect(within(details).queryByText("Drafting")).toBeNull();
  expect(within(details).queryByText("PER-1")).toBeNull();
});

test("a side's page offers adding a project, which starts inside that side and warns of nothing to be moved", async () => {
  const user = userEvent.setup();
  show(SIDE.project, SIDE.name, [SIDE]);
  const projects = await screen.findByRole("region", { name: "Projects" });
  await user.click(within(projects).getByRole("button", { name: "Add a project" }));
  const dialog = await screen.findByRole("dialog", { name: "Add a project" });
  expect(within(dialog).getByRole("combobox", { name: "Inside" })).toHaveValue(SIDE.project);
});

test("a project's page says which side it is on, and Personal's own page offers no add button", async () => {
  show(BOOK.id, BOOK.name, [SIDE]);
  expect(await screen.findByText("Project in Orchard Press")).toBeInTheDocument();
});

test("Personal's page offers no Add a project", async () => {
  show(PERSONAL.id, PERSONAL.name, [SIDE]);
  await screen.findByRole("region", { name: "Areas" });
  expect(screen.queryByRole("button", { name: "Add a project" })).toBeNull();
});
