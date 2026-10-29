import "@testing-library/jest-dom/vitest";
import { screen, within } from "@testing-library/react";
import type { S } from "../lib/api";
import { day } from "../lib/dates";
import { person, project } from "../lib/records-fixtures";
import { fakeApi, renderApp } from "../test-utils";
import en from "../wording/en.json";
import { RecordPage } from "./RecordPage";

// A record's page says names, dates and words (design 7.14): references as names, dates as elsewhere, choices as
// labels, no help text while viewing, and the details in the order a reader looks for them.

const WEB = "https" + "://";
const field = (name: string, type: S["FieldView"]["type"], extra: Partial<S["FieldView"]> = {}): S["FieldView"] => ({
  name,
  description: `Help for ${name}, shown only in the edit form.`,
  type,
  required: false,
  editable: true,
  ...extra,
});

const page = (kind: string, id: string, name: string, details: S["RecordPageView"]["details"]): S["RecordPageView"] => ({
  kind,
  id,
  version: 2,
  name,
  details,
  open_actions: [],
  open_questions: [],
  completed_actions: [],
  fact_source: null,
  activity: [],
});

const ref = (kind: string, id: string, name: string) => ({ kind, id, name, removed: false });

function serve(kind: string, id: string, fields: Record<string, unknown>, fieldViews: S["FieldView"][], shown: S["RecordPageView"], extra: Record<string, () => unknown> = {}) {
  const k = encodeURIComponent(kind);
  fakeApi({
    [`GET record?kind=${k}&id=${id}`]: () => ({ kind, id, version: 3, fields: { id, ...fields }, long_text: [] }),
    [`GET kinds/${kind}`]: () => ({ kind, fields: fieldViews }),
    [`GET record-pages/${id}?kind=${k}`]: () => shown,
    "GET people": () => [person("PER-1", "Robin Sample")],
    "GET projects": () => [project("PRJ-1", "Harbor")],
    "GET settings": () => ({ fingerprint: "fp", items: [] }),
    "GET lists": () => [],
    "GET organizations": () => [],
    [`GET plugin-actions?kind=${k}&id=${id}`]: () => [],
    [`GET task-kinds?kind=${k}&id=${id}`]: () => [],
    ...extra,
  });
}

const personFields = [
  field("full_name", "text", { required: true }),
  field("aliases", "list"),
  field("role", "text"),
  field("team", "text"),
  field("org", "reference", { refers_to: "organization" }),
  field("how_to_reach", "other"),
  field("name_verified", "yes_no"),
  field("status", "choice", { options: ["active", "left"] }),
];

test("a person's details say names, words and a label for a choice, in the order a reader looks for them, with no help text", async () => {
  serve(
    "person",
    "PER-1",
    { full_name: "Robin Sample", aliases: ["Rob"], role: "Editor", team: "TEAM-1", org: "ORG-1", how_to_reach: { email: "robin@example.org" }, name_verified: false, status: "active" },
    personFields,
    page("person", "PER-1", "Robin Sample", [
      { field: "team", value: "TEAM-1", type: "text", refs: [ref("team", "TEAM-1", "Quarry Editorial")] },
      { field: "org", value: "ORG-1", type: "text", refs: [ref("organization", "ORG-1", "Quarry House")] },
    ]),
  );
  renderApp(<RecordPage kind="person" id="PER-1" onBack={() => {}} />);
  const details = await screen.findByRole("region", { name: "Details" });
  await within(details).findByText("Quarry House");
  expect(within(details).getAllByRole("term").map((x) => x.textContent)).toEqual(["Role", "Organization", "How to reach", "Other names", "Team", "Status"]);
  const value = (term: string) => within(details).getByText(term).closest("[data-definition]")!.querySelector("dd")!.textContent;
  expect(value("Organization")).toBe("Quarry House");
  expect(value("Team")).toBe("Quarry Editorial");
  expect(value("How to reach")).toBe("Email: robin@example.org");
  // The name is the heading's and a flag that is off says nothing: neither is a row.
  expect(within(details).queryByText("Full name")).toBeNull();
  expect(within(details).queryByText("Name verified")).toBeNull();
  expect(value("Status")).toBe("Active");
  expect(details.textContent).not.toMatch(/Help for/);
  expect(details.textContent).not.toMatch(/\b[A-Z]{2,5}-\d+\b/);
});

test("a project's details say its owner by name, its target as a day, and its links by title with the domain beside", async () => {
  const long = `${WEB}example.com/press/kit/2026/a-very-long-path-that-would-break-over-several-lines/index.html`;
  serve(
    "project",
    "PRJ-1",
    { name: "Harbor", status: "On track", target: "2026-12-01", owner: "PER-1", links: [{ label: "Press kit", url: long }] },
    [field("name", "text", { required: true }), field("status", "choice", { value_list: "project-status", options: ["On track"] }), field("target", "date"), field("owner", "text"), field("links", "list")],
    page("project", "PRJ-1", "Harbor", [{ field: "owner", value: "PER-1", type: "text", refs: [ref("person", "PER-1", "Robin Sample")] }]),
  );
  renderApp(<RecordPage kind="project" id="PRJ-1" onBack={() => {}} />);
  const details = await screen.findByRole("region", { name: "Details" });
  await within(details).findByText("Robin Sample");
  expect(within(details).getByText(day("2026-12-01"))).toBeInTheDocument();
  expect(within(details).getByText("On track")).toBeInTheDocument();
  const link = within(details).getByRole("link", { name: "Press kit" });
  expect(link).toHaveAttribute("href", long);
  expect(details.textContent).toContain("example.com");
  expect(details.textContent).not.toContain("a-very-long-path");
  expect(details.textContent).not.toMatch(/\d{4}-\d{2}-\d{2}|PER-1/);
});

test("an empty value is no row, and a list of maps shows each map's parts joined without empty ones", async () => {
  serve(
    "project",
    "PRJ-1",
    { name: "Harbor", summary: "", tags: [], roles: [{ person: "PER-1", role: "run" }, { person: "PER-1", role: "" }] },
    [field("name", "text"), field("summary", "text"), field("tags", "list"), field("roles", "list")],
    page("project", "PRJ-1", "Harbor", [{ field: "roles", value: [], type: "list", refs: [ref("person", "PER-1", "Robin Sample")] }]),
  );
  renderApp(<RecordPage kind="project" id="PRJ-1" onBack={() => {}} />);
  const details = await screen.findByRole("region", { name: "Details" });
  await within(details).findByText("Roles");
  expect(within(details).getAllByRole("term").map((x) => x.textContent)).toEqual(["Roles"]);
  const lines = within(details).getByText("Roles").closest("[data-definition]")!.querySelectorAll("dd > div");
  expect([...lines].map((l) => l.textContent)).toEqual(["Robin Sample · Run", "Robin Sample"]);
});

test("a reference to a record that was deleted says it was removed, never its id", async () => {
  serve(
    "person",
    "PER-1",
    { full_name: "Robin Sample", aliases: [], role: "Editor", team: "TEAM-9", org: "ORG-1", how_to_reach: {}, name_verified: true, status: "active" },
    personFields,
    page("person", "PER-1", "Robin Sample", [
      { field: "team", value: "TEAM-9", type: "text", refs: [{ kind: "team", id: "TEAM-9", name: "", removed: true }] },
      { field: "org", value: "ORG-1", type: "text", refs: [ref("organization", "ORG-1", "Quarry House")] },
    ]),
  );
  renderApp(<RecordPage kind="person" id="PER-1" onBack={() => {}} />);
  const details = await screen.findByRole("region", { name: "Details" });
  await within(details).findByText("Quarry House");
  const value = (term: string) => within(details).getByText(term).closest("[data-definition]")!.querySelector("dd")!.textContent;
  expect(value("Team")).toBe("Removed");
  expect(details.textContent).not.toMatch(/\b[A-Z]{2,5}-\d+\b/);
});

const ownSides = (): S["BusinessState"] => ({
  business: true,
  name: "Quarry House",
  personal: "PRJ-1",
  sides: [{ project: "PRJ-7", kind: "business", name: "Quarry House", organization: "ORG-1", removable: false, filed: 0 }],
  chosen: "work",
});

test("the page of an organization that is one of the person's own businesses says so and links to that side", async () => {
  serve(
    "organization",
    "ORG-1",
    { name: "Quarry House" },
    [field("name", "text", { required: true })],
    page("organization", "ORG-1", "Quarry House", []),
    { "GET setup/business": ownSides },
  );
  renderApp(<RecordPage kind="organization" id="ORG-1" onBack={() => {}} />);
  const line = await screen.findByTestId("organization-side");
  expect(line).toHaveTextContent("This is your business.");
  // The heading says the name; the line does not say it again.
  expect(line).not.toHaveTextContent("Quarry House");
  expect(within(line).getByRole("link", { name: "Open its page" })).toHaveAttribute("href", expect.stringContaining("PRJ-7"));
});

test("the page of any other organization says nothing about a side", async () => {
  serve("organization", "ORG-2", { name: "Elsewhere" }, [field("name", "text", { required: true })], page("organization", "ORG-2", "Elsewhere", []), {
    "GET setup/business": ownSides,
  });
  renderApp(<RecordPage kind="organization" id="ORG-2" onBack={() => {}} />);
  await screen.findByRole("heading", { level: 1, name: "Elsewhere" });
  expect(screen.queryByTestId("organization-side")).toBeNull();
});

test("the page of a side says its own organization once, as \"Your business\" linking to its page, and its name is not repeated", async () => {
  serve(
    "project",
    "PRJ-7",
    { name: "Quarry House", organization: "ORG-1" },
    [field("name", "text", { required: true }), field("organization", "reference", { refers_to: "organization" })],
    page("project", "PRJ-7", "Quarry House", [{ field: "organization", value: "ORG-1", type: "text", refs: [ref("organization", "ORG-1", "Quarry House")] }]),
    { "GET setup/business": ownSides },
  );
  renderApp(<RecordPage kind="project" id="PRJ-7" onBack={() => {}} />);
  const details = await screen.findByRole("region", { name: "Details" });
  const term = await within(details).findByText("Organization");
  const value = term.closest("[data-definition]")!.querySelector("dd")!;
  expect(value).toHaveTextContent("Your business");
  expect(within(value as HTMLElement).getByRole("link", { name: "Your business" })).toHaveAttribute("href", expect.stringContaining("ORG-1"));
  // The heading is the only place the name is said.
  expect(within(details).queryByText("Quarry House")).toBeNull();
  expect(within(details).queryByText("Name")).toBeNull();
});

// A yes or no says only what is so (first day, F2): a flag that is off is left out of Details, and one that is on is said in
// the wording sheet's words, never as "Area: Yes".
test("a project's details leave out an area flag that is off and say one that is on in words", async () => {
  const fields = [field("name", "text", { required: true }), field("area", "yes_no")];
  serve("project", "PRJ-1", { name: "Harbor", area: false }, fields, page("project", "PRJ-1", "Harbor", []));
  const first = renderApp(<RecordPage kind="project" id="PRJ-1" onBack={() => {}} />);
  const details = await screen.findByRole("region", { name: "Details" });
  expect(within(details).queryByText("Area")).toBeNull();
  expect(details).not.toHaveTextContent(/\bNo\b/);
  first.unmount();
  serve("project", "PRJ-1", { name: "Harbor", area: true }, fields, page("project", "PRJ-1", "Harbor", []));
  renderApp(<RecordPage kind="project" id="PRJ-1" onBack={() => {}} />);
  const on = await screen.findByRole("region", { name: "Details" });
  const row = (await within(on).findByText("Area")).closest("[data-definition]")!;
  expect(row.querySelector("dd")).toHaveTextContent("An area of life: ongoing, with no end date");
  expect(on).not.toHaveTextContent(/Yes/);
});

// Every yes or no a core record has is said in the sheet's words (its `flag.<field>` phrase), so none falls back to "Yes".
test("every yes or no of a core record that can show in details has a phrase of its own in the wording sheet", () => {
  const FLAGS = ["name_verified", "track_only", "area", "reply_reviewed", "reply_owed", "due_check", "due_by_person", "key", "reaches_children", "cancelled", "invitation", "plain"];
  for (const name of FLAGS) expect(en as Record<string, string>, name).toHaveProperty(`flag.${name}`);
});

test("a person's page does not say the person's name under the heading that says it", async () => {
  serve(
    "person",
    "PER-1",
    { full_name: "Robin Sample", role: "Editor" },
    [field("full_name", "text", { required: true }), field("role", "text")],
    page("person", "PER-1", "Robin Sample", []),
  );
  renderApp(<RecordPage kind="person" id="PER-1" onBack={() => {}} />);
  const details = await screen.findByRole("region", { name: "Details" });
  expect(within(details).getByText("Editor")).toBeInTheDocument();
  expect(within(details).queryByText("Robin Sample")).toBeNull();
  expect(within(details).queryByText("Full name")).toBeNull();
});
