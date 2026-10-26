import "@testing-library/jest-dom/vitest";
import { screen, within } from "@testing-library/react";
import type { S } from "../lib/api";
import { project } from "../lib/records-fixtures";
import { fakeApi, renderApp } from "../test-utils";
import { RecordPage } from "./RecordPage";

// Personal's page and each side's page (design 6.32, 7.8): the top project says what is inside it, and never calls itself a
// project; for a person with no side beside Personal no word of the page is about projects, stages or owners.

const PERSONAL = project("PRJ-personal", "Personal", { no_end: true });
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

function show(id: string, name: string, sides: Array<typeof SIDE>) {
  // With no side the workspace holds Personal and what is inside it; with a side, that side and its project too.
  const projects = [PERSONAL, AREA, ...(sides.length ? [OTHER, project(SIDE.project, SIDE.name), BOOK] : [])];
  fakeApi({
    [`GET record?kind=project&id=${id}`]: () => ({ kind: "project", id, version: 2, fields: { id, name }, long_text: [] }),
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
  });
  renderApp(<RecordPage kind="project" id={id} onBack={() => {}} />);
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
