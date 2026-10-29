import "@testing-library/jest-dom/vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { S } from "../lib/api";
import { person, project } from "../lib/records-fixtures";
import { setSideChoice } from "../lib/sides";
import { besidePane, fakeApi, renderApp, type Routes } from "../test-utils";
import { Files } from "./Files";
import { Handled } from "./Handled";
import { OpenItems } from "./OpenItems";
import { People } from "./People";
import { WhatChanged } from "./WhatChanged";

// The same side filter, in the same place, on every list that can hold both sides (design 6.32, 7.8): To-dos, People, Files,
// Handled for you and What changed. It is drawn only for a person with a side beside Personal, and what is on no side shows
// under every choice.

beforeEach(() => {
  besidePane();
  setSideChoice("all");
});

const PERSONAL = "PRJ-personal";
const SHOP = "PRJ-shop";
const SHOP_NAME = "Hale Upholstery";
const withSide: Routes = {
  "GET setup/business": () => ({ business: true, name: SHOP_NAME, personal: PERSONAL, sides: [{ project: SHOP, kind: "business", name: SHOP_NAME, removable: false }], chosen: "work" }),
  "GET projects": () => [project(PERSONAL, "Personal"), project(SHOP, SHOP_NAME), project("PRJ-garden", "Garden", { parent: PERSONAL }), project("PRJ-quotes", "Quotes", { parent: SHOP })],
};
const justMe: Routes = {
  "GET setup/business": () => ({ business: false, name: null, personal: PERSONAL, sides: [], chosen: "me" }),
  "GET projects": () => [project(PERSONAL, "Personal"), project("PRJ-garden", "Garden", { parent: PERSONAL })],
};

const group = () => screen.queryByRole("radiogroup", { name: "Show" });
const choose = async (name: string) => userEvent.setup().click(await screen.findByRole("radio", { name }));

// ---- To-dos ------------------------------------------------------------------------------------------------------------

const action = (id: string, text: string, projectId: string | null, name: string | null, side: string | null = null): S["OpenActionView"] => ({
  id,
  version: 1,
  text,
  state: "open",
  owners: [{ person: "P-1", name: "Quinn Sample" }],
  due: null,
  project: projectId,
  project_name: name ?? "",
  parent_name: null,
  // The server says which side each is on (the side of its project), or none.
  side,
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
    actions: [action("A-1", "Water the beans", "PRJ-garden", "Garden", PERSONAL), action("A-2", "Quote the sofa", "PRJ-quotes", "Quotes", SHOP), action("A-3", "Renew the licence", null, null)],
    questions: [],
    stale_days: 21,
  }),
  "GET people": () => [person("P-1", "Quinn Sample")],
};

test("To-dos has the filter beside its heading, and a side shows its own to-dos and those on no side", async () => {
  const user = userEvent.setup();
  fakeApi({ ...todos, ...withSide });
  renderApp(<OpenItems />);
  expect(await screen.findByText("Water the beans")).toBeInTheDocument();
  const heading = screen.getByRole("heading", { name: "To-dos and questions" });
  expect(heading.closest("[data-page-header]")).toContainElement(await screen.findByRole("radiogroup", { name: "Show" }));
  await user.click(screen.getByRole("radio", { name: "Personal" }));
  await waitFor(() => expect(screen.queryByText("Quote the sofa")).toBeNull());
  expect(screen.getByText("Water the beans")).toBeInTheDocument();
  expect(screen.getByText("Renew the licence")).toBeInTheDocument();
  await user.click(screen.getByRole("radio", { name: SHOP_NAME }));
  expect(await screen.findByText("Quote the sofa")).toBeInTheDocument();
  expect(screen.queryByText("Water the beans")).toBeNull();
});

test("with nothing beside Personal To-dos has no filter", async () => {
  fakeApi({ ...todos, ...justMe });
  renderApp(<OpenItems />);
  expect(await screen.findByText("Water the beans")).toBeInTheDocument();
  await waitFor(() => expect(group()).toBeNull());
});

// ---- People ------------------------------------------------------------------------------------------------------------

const folks = [
  person("P-1", "Ana Person", { sides: [PERSONAL], side: "personal", relation: "my sister" }),
  person("P-2", "Ben Person", { sides: [SHOP], side: "business", role: "Supplier" }),
  person("P-3", "Cy Person", { sides: [], side: null }),
];
const people: Routes = { "GET people": () => folks, "GET organizations": () => [] };

test("People has the filter, and a side shows its people and those on no known side", async () => {
  const user = userEvent.setup();
  fakeApi({ ...people, ...withSide });
  renderApp(<People />);
  expect(await screen.findByRole("link", { name: "Ben Person" })).toBeInTheDocument();
  expect(await screen.findByRole("radiogroup", { name: "Show" })).toBeInTheDocument();
  await user.click(screen.getByRole("radio", { name: "Personal" }));
  await waitFor(() => expect(screen.queryByRole("link", { name: "Ben Person" })).toBeNull());
  expect(screen.getByRole("link", { name: "Ana Person" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Cy Person" })).toBeInTheDocument();
});

test("with nothing beside Personal People has no filter", async () => {
  fakeApi({ ...people, ...justMe });
  renderApp(<People />);
  expect(await screen.findByRole("link", { name: "Ana Person" })).toBeInTheDocument();
  await waitFor(() => expect(group()).toBeNull());
});

// ---- Files -------------------------------------------------------------------------------------------------------------

const file = (id: string, name: string, projectId: string | null): S["FileView"] => ({
  id,
  version: 1,
  name,
  media_type: "application/pdf",
  size: 2048,
  file_kind: "attachment",
  kind_label: "Attachment",
  project: projectId,
  meta: {},
  origin: "upload",
  replaces: null,
  added_at: "2026-10-09T14:00:00Z",
  data_level: "internal",
});
const files: Routes = {
  "GET files": () => [file("FILE-1", "seeds.pdf", "PRJ-garden"), file("FILE-2", "fabric.pdf", "PRJ-quotes"), file("FILE-3", "licence.pdf", null)],
  "GET plugin-actions": () => [],
  "GET plugin-actions?kind=file&id=FILE-1": () => [],
  "GET plugin-actions?kind=file&id=FILE-2": () => [],
  "GET plugin-actions?kind=file&id=FILE-3": () => [],
};

test("Files has the filter, and a side shows the files in its projects and those in none", async () => {
  const user = userEvent.setup();
  fakeApi({ ...files, ...withSide });
  renderApp(<Files />);
  expect(await screen.findByRole("listitem", { name: "fabric.pdf" })).toBeInTheDocument();
  expect(await screen.findByRole("radiogroup", { name: "Show" })).toBeInTheDocument();
  await user.click(screen.getByRole("radio", { name: SHOP_NAME }));
  await waitFor(() => expect(screen.queryByRole("listitem", { name: "seeds.pdf" })).toBeNull());
  expect(screen.getByRole("listitem", { name: "fabric.pdf" })).toBeInTheDocument();
  expect(screen.getByRole("listitem", { name: "licence.pdf" })).toBeInTheDocument();
});

test("with nothing beside Personal Files has no filter", async () => {
  fakeApi({ ...files, ...justMe });
  renderApp(<Files />);
  expect(await screen.findByRole("listitem", { name: "seeds.pdf" })).toBeInTheDocument();
  await waitFor(() => expect(group()).toBeNull());
});

// ---- Handled for you ---------------------------------------------------------------------------------------------------

const handledView = (side: string | null): S["HandledView"] => ({
  tab: "set_aside",
  group: "kind",
  query: "",
  item: null,
  kept_days: 30,
  page_rows: 25,
  counts: { set_aside: side ? 0 : 1, read: 0 },
  kinds: [],
  groups: [],
});

test("Handled for you has the filter, and a side is asked of the server so its counts follow", async () => {
  const calls = fakeApi({
    "GET handled?tab=set_aside&q=": () => handledView(null),
    [`GET handled?tab=set_aside&q=&side=${SHOP}`]: () => handledView(SHOP),
    "GET silent-closes": () => ({ count: 0, closes: [], measure: { days: 14, since: "", until: "", total: 0, silent: 0, by_person: 0, approved: 0, rate: null, kinds: [] } }),
    "GET settings": () => ({ fingerprint: "fp-1", items: [] }),
    ...withSide,
  });
  renderApp(<Handled />);
  await choose(SHOP_NAME);
  await waitFor(() => expect(calls.some((c) => c.route === `GET handled?tab=set_aside&q=&side=${SHOP}`)).toBe(true));
  expect(await screen.findByText(`Nothing handled on the ${SHOP_NAME} side.`)).toBeInTheDocument();
});

test("Handled for you with nothing beside Personal has no filter", async () => {
  fakeApi({
    "GET handled?tab=set_aside&q=": () => handledView(null),
    "GET silent-closes": () => ({ count: 0, closes: [], measure: { days: 14, since: "", until: "", total: 0, silent: 0, by_person: 0, approved: 0, rate: null, kinds: [] } }),
    "GET settings": () => ({ fingerprint: "fp-1", items: [] }),
    ...justMe,
  });
  renderApp(<Handled />);
  await screen.findByRole("heading", { name: "Handled for you" });
  await waitFor(() => expect(group()).toBeNull());
});

// ---- What changed (the control only) ----------------------------------------------------------------------------------

const changesRoutes: Routes = {
  "GET changes": () => [],
  "GET plugin-today": () => [],
  "GET stages/records": () => [],
  "GET stages/ready": () => [],
  "GET stages/requests": () => [],
  "GET runs/first-go": () => ({ items: 0, estimate_usd: 0, ready: false }),
  "GET status": () => ({}),
};

test("What changed has the control beside its heading for a person with a side, and none otherwise", async () => {
  fakeApi({ ...changesRoutes, ...withSide });
  const first = renderApp(<WhatChanged />);
  const heading = await screen.findByRole("heading", { name: "What changed" });
  expect(await within(heading.closest("[data-page-header]") as HTMLElement).findByRole("radiogroup", { name: "Show" })).toBeInTheDocument();
  first.unmount();
  fakeApi({ ...changesRoutes, ...justMe });
  renderApp(<WhatChanged />);
  await screen.findByRole("heading", { name: "What changed" });
  await waitFor(() => expect(group()).toBeNull());
});

const changeOn = (id: string, title: string, projectId: string | null): S["ChangeItem"] => ({
  id,
  version: 1,
  dismissed: false,
  stage_task: false,
  first_go: false,
  refused: false,
  state: "done",
  waiting: null,
  created_at: "2026-10-09T14:00:00Z",
  note: null,
  source: null,
  source_title: title,
  changeset: null,
  project: projectId,
});

test("What changed shows a side's own changes and those on no side, and an empty side says so", async () => {
  const user = userEvent.setup();
  // The chosen change also shows in the detail pane, so a title may be on screen twice.
  const shown = (text: string) => screen.queryAllByText(text).length > 0;
  fakeApi({
    ...changesRoutes,
    ...withSide,
    "GET changes": () => [changeOn("REQ-1", "Water the beans", "PRJ-garden"), changeOn("REQ-2", "Quote the sofa", "PRJ-quotes"), changeOn("REQ-3", "Renew the licence", null)],
  });
  renderApp(<WhatChanged />);
  await waitFor(() => expect(shown("Water the beans")).toBe(true));
  expect(shown("Quote the sofa")).toBe(true);
  await user.click(screen.getByRole("radio", { name: "Personal" }));
  await waitFor(() => expect(shown("Quote the sofa")).toBe(false));
  expect(shown("Water the beans")).toBe(true);
  expect(shown("Renew the licence")).toBe(true);
  await user.click(screen.getByRole("radio", { name: SHOP_NAME }));
  await waitFor(() => expect(shown("Quote the sofa")).toBe(true));
  expect(shown("Water the beans")).toBe(false);
  expect(shown("Renew the licence")).toBe(true);
});
