import "@testing-library/jest-dom/vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { S } from "../lib/api";
import { day } from "../lib/dates";
import { person, project } from "../lib/records-fixtures";
import { fakeApi, renderApp, type Routes } from "../test-utils";
import { RecordPage } from "./RecordPage";

// A person's page (design 7.14), built from the record-page parts: a header with a crumb, who they are and Edit; tabs for the
// overview, what is open and the history; and a details panel that says each fact once: how to reach them, who they are to you,
// the sides they are on, when you were last in touch, their dates and what matters to them.

const ANA = "Ana Example";
type Item = S["OpenItemView"];
const item = (over: Partial<Item> & Pick<Item, "kind" | "id" | "text">): Item => ({ record: "action", quiet: 0, ...over });

const memory = (over: Partial<S["PersonMemoryView"]> = {}): S["PersonMemoryView"] => ({
  person: "PER-2",
  name: ANA,
  last_in_touch: { kind: "to", on: "2026-10-19", untrusted: false },
  asked_of: [],
  asked_by: [],
  promised_to: [item({ kind: "promised_to", id: "ACT-1", text: "Send the cover" })],
  promised_by: [item({ kind: "promised_by", id: "ACT-2", text: "Return the contract" })],
  reach: { kept: { email: "ana@example.com" }, replies_on: "email", replies_record: "SRC-1" },
  dates: [{ fact: "FACT-1", text: "Birthday is March 3", on: "2027-03-03", yearly: true }],
  matters: [{ fact: "FACT-3", text: "Prefers short notes", as_of: "2026-10-01" }],
  ...over,
});

const action = (id: string, text: string, extra: Partial<S["RecordPageView"]["open_actions"][number]> = {}) => ({ id, text, due: null, owners: [], project: "PRJ-1", project_name: "Harbor", origin: null, ...extra });

const pageOf = (over: Partial<S["RecordPageView"]> = {}): S["RecordPageView"] => ({
  kind: "person",
  id: "PER-2",
  version: 2,
  name: ANA,
  details: [],
  open_actions: [action("ACT-1", "Send the cover"), action("ACT-2", "Return the contract", { owners: [ANA] }), action("ACT-3", "Pick the paper"), action("ACT-4", "Book the room")],
  open_questions: [],
  completed_actions: [{ id: "ACT-9", text: "Choose the font", project: "PRJ-1", project_name: "Harbor", done_by: [], done_on: "2026-10-12" }],
  facts: [],
  fact_source: null,
  activity: [{ at: "2026-10-12T09:00:00Z", kind: "action", id: "ACT-9", name: "Choose the font", op: "action.add#0", field: null, actor: "pm", by_assistant: false }],
  ...over,
});

const sideState = {
  "GET setup/business": () => ({ business: true, name: "Shop", personal: "PRJ-personal", sides: [{ project: "PRJ-shop", name: "Shop", kind: "business" }], chosen: "both" }),
  "GET projects": () => [project("PRJ-personal", "Personal"), project("PRJ-shop", "Shop")],
};

function serve(who: Partial<S["PersonView"]>, extra: Routes = {}, shown: S["RecordPageView"] = pageOf()) {
  return fakeApi({
    "GET record?kind=person&id=PER-2": () => ({ kind: "person", id: "PER-2", version: 3, fields: { id: "PER-2", full_name: ANA, how_to_reach: { email: "ana@example.com" }, aliases: [], name_verified: true, stance: null, ...(who.relation ? { relation: who.relation } : {}) }, long_text: [] }),
    "GET kinds/person": () => ({ kind: "person", fields: [{ name: "full_name", description: "", type: "text", required: true, editable: true }] }),
    "GET record-pages/PER-2?kind=person": () => shown,
    "GET people": () => [person("PER-1", "Robin Sample", { is_pm: true }), person("PER-2", ANA, { how_to_reach: { email: "ana@example.com" }, ...who })],
    "GET people/PER-2/memory": () => memory(),
    "GET me": () => ({ full_name: "Robin Sample", person: "PER-1" }),
    "GET settings": () => ({ fingerprint: "fp", items: [{ key: "workspace.contact_kinds", value: ["email", "phone"] }] }),
    "GET lists": () => [],
    "GET organizations": () => [],
    "GET records/person/PER-2/conversation": () => ({ kind: "person", id: "PER-2", turns: [] }),
    "GET plugin-actions?kind=person&id=PER-2": () => [],
    "GET task-kinds?kind=person&id=PER-2": () => [],
    ...sideState,
    ...extra,
  });
}

const friend = { relation: "my sister", side: "personal" as const, sides: ["PRJ-personal"] };
const colleague = { role: "customer", side: "business" as const, sides: ["PRJ-shop"], org: "ORG-1", org_name: "Shop" };

async function loaded() {
  renderApp(<RecordPage kind="person" id="PER-2" onBack={() => {}} />);
  return screen.findByRole("region", { name: "Details" });
}

test("the page has a crumb back to People, says who they are under the name, and has Edit beside its menu", async () => {
  serve(friend);
  await loaded();
  const crumb = screen.getByRole("link", { name: "People" });
  expect(crumb.getAttribute("href")).toMatch(/#records\/people$/);
  expect(await screen.findByRole("heading", { level: 1, name: ANA })).toBeInTheDocument();
  expect(screen.getAllByText("my sister").length).toBeGreaterThan(0);
  expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Edit details" })).toBeNull();
});

test("the details panel says each fact once: how to reach them, who they are, the sides, the last contact, dates and what matters", async () => {
  serve({ ...friend, sides: ["PRJ-personal", "PRJ-shop"], side: "both" });
  const details = await loaded();
  await within(details).findByText("Prefers short notes");
  const terms = within(details).getAllByRole("term").map((x) => x.textContent);
  expect(terms).toEqual(["Email", "Phone", "Who they are", "Sides", "Last contact", "Dates", "What matters to them"]);
  const value = (term: string) => within(details).getByText(term).closest("[data-definition]")!.querySelector("dd")!.textContent;
  expect(value("Email")).toBe("ana@example.com");
  expect(value("Phone")).toBe("Add phone");
  expect(value("Sides")).toBe("PersonalShop");
  expect(value("Last contact")).toContain(day("2026-10-19"));
  expect(value("Dates")).toContain("Birthday is March 3");
  // The internal bookkeeping is nowhere, and the way to reach them is not said a second time anywhere on the page.
  expect(screen.queryByText("Name checked")).toBeNull();
  expect(screen.queryByText("How to reach them")).toBeNull();
  expect(screen.getAllByText("ana@example.com")).toHaveLength(1);
});

test("Add phone opens the person's form, where it can be typed", async () => {
  const user = userEvent.setup();
  serve(friend);
  const details = await loaded();
  await user.click(await within(details).findByRole("button", { name: "Add phone" }));
  const dialog = await screen.findByRole("dialog", { name: "Edit person" });
  expect(within(dialog).getByLabelText("Phone")).toBeInTheDocument();
});

test("how you work with them is asked only of someone from a side of work, never of a sister", async () => {
  serve(friend);
  await loaded();
  await screen.findByText("Prefers short notes");
  expect(screen.queryByText("How you work with them")).toBeNull();
  expect(screen.queryByText(/I manage them/)).toBeNull();
});

test("someone from a side of work is asked how you work with them, and can be marked as left; a friend can't", async () => {
  const user = userEvent.setup();
  serve(colleague);
  await loaded();
  expect(await screen.findByText("How you work with them")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: `More actions for ${ANA}` }));
  expect(await screen.findByRole("menuitem", { name: "Mark as left" })).toBeInTheDocument();
});

test("a to-do they were handed says it is theirs to do, and a promise says who promised it; each is listed once", async () => {
  serve(friend);
  await loaded();
  const open = await screen.findByRole("region", { name: `Open with ${ANA}` });
  expect(within(open).getAllByRole("link", { name: "Send the cover" })).toHaveLength(1);
  expect(within(open).getByRole("link", { name: "Send the cover" }).closest("li")).toHaveTextContent("you promised Ana");
  expect(within(open).getByRole("link", { name: "Return the contract" }).closest("li")).toHaveTextContent("Ana promised you");
  expect(within(open).getByRole("link", { name: "Pick the paper" }).closest("li")).not.toHaveTextContent("promised");
  // There is no second list of the same promises.
  expect(screen.queryByText("Ana promised you", { selector: "h4" })).toBeNull();
});

test("the overview shows the first three open items and See all, which opens the tab with all of them and what finished", async () => {
  const user = userEvent.setup();
  serve(friend);
  await loaded();
  const open = await screen.findByRole("region", { name: `Open with ${ANA}` });
  expect(within(open).getAllByRole("link")).toHaveLength(3);
  expect(screen.queryByRole("region", { name: "Completed" })).toBeNull();
  await user.click(within(open).getByRole("button", { name: "See all" }));
  await waitFor(() => expect(screen.getByRole("button", { name: /^Open with Ana/ })).toHaveAttribute("aria-pressed", "true"));
  const all = screen.getByRole("region", { name: `Open with ${ANA}` });
  expect(within(all).getAllByRole("link")).toHaveLength(4);
  expect(screen.getByRole("region", { name: "Completed" })).toBeInTheDocument();
});

test("the activity tab has the whole history, and the box to ask about them is one line on the overview", async () => {
  const user = userEvent.setup();
  serve(friend);
  await loaded();
  expect(await screen.findByRole("textbox", { name: "What do you want to know, or have done?" })).toBeInTheDocument();
  expect(screen.queryByText("Nothing has been said about this yet.")).toBeNull();
  await user.click(screen.getByRole("button", { name: "Activity" }));
  expect(await screen.findByRole("region", { name: "Activity" })).toBeInTheDocument();
  expect(screen.queryByRole("region", { name: `Open with ${ANA}` })).toBeNull();
});
