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
  reach: { kept: { email: ["ana@example.com"] }, replies_on: "email", replies_record: "SRC-1" },
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
    "GET record?kind=person&id=PER-2": () => ({ kind: "person", id: "PER-2", version: 3, fields: { id: "PER-2", full_name: ANA, how_to_reach: { email: ["ana@example.com"] }, aliases: [], name_verified: true, stance: null, ...(who.relation ? { relation: who.relation } : {}) }, long_text: [] }),
    "GET kinds/person": () => ({ kind: "person", fields: [{ name: "full_name", description: "", type: "text", required: true, editable: true }] }),
    "GET record-pages/PER-2?kind=person": () => shown,
    "GET people": () => [person("PER-1", "Robin Sample", { is_pm: true }), person("PER-2", ANA, { how_to_reach: { email: ["ana@example.com"] }, ...who })],
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
  // The one filled button adds a to-do for them; Edit is on their contact card.
  expect(screen.getByRole("button", { name: "Add a to-do for Ana" })).toBeInTheDocument();
  const card = document.querySelector<HTMLElement>("[data-contact-card]")!;
  expect(within(card).getByRole("button", { name: "Edit" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Edit details" })).toBeNull();
});

test("the details panel says each fact once: how to reach them, who they are, the sides, the last contact, dates and what matters", async () => {
  serve({ ...friend, sides: ["PRJ-personal", "PRJ-shop"], side: "both" });
  const details = await loaded();
  await within(details).findByText("Prefers short notes");
  const terms = within(details).getAllByRole("term").map((x) => x.textContent);
  expect(terms).toEqual(["Email", "Phone", "Who they are", "Sides", "Dates", "What matters to them"]);
  const value = (term: string) => within(details).getByText(term).closest("[data-definition]")!.querySelector("dd")!.textContent;
  expect(value("Email")).toContain("ana@example.com");
  expect(value("Phone")).toBe("Add phone");
  expect(value("Sides")).toBe("PersonalShop");
  // How you were last in touch is the head of the card, with their initials, not a row of it.
  const head = document.querySelector<HTMLElement>("[data-contact-card] .contact-head")!;
  expect(head).toHaveTextContent("Last contact");
  expect(head).toHaveTextContent(day("2026-10-19"));
  expect(within(head).getByText("AE")).toBeInTheDocument();
  expect(value("Dates")).toContain("Birthday is March 3");
  // The internal bookkeeping is nowhere, and the way to reach them is not said a second time anywhere on the page.
  expect(screen.queryByText("Name checked")).toBeNull();
  expect(screen.queryByText("How to reach them")).toBeNull();
  expect(screen.getAllByText("ana@example.com")).toHaveLength(1);
});

test("Add phone opens a box in place, and adding it acts at once with an Undo that puts back what was there", async () => {
  const user = userEvent.setup();
  const calls = serve(friend, { "POST people/PER-2": () => ({ ok: "PER-2" }) });
  const details = await loaded();
  await user.click(await within(details).findByRole("button", { name: "Add phone" }));
  await user.type(within(details).getByLabelText("New phone for Ana Example"), "555 0100");
  await user.click(within(details).getByRole("button", { name: "Add" }));
  await waitFor(() => expect(calls.some((c) => c.route === "POST people/PER-2")).toBe(true));
  expect(calls.find((c) => c.route === "POST people/PER-2")!.body).toEqual({ how_to_reach: { email: ["ana@example.com"], phone: ["555 0100"] } });
  expect(await screen.findByText("Added 555 0100 for Ana Example.")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Undo" }));
  await waitFor(() => expect(calls.filter((c) => c.route === "POST people/PER-2")).toHaveLength(2));
  expect(calls.filter((c) => c.route === "POST people/PER-2")[1].body).toEqual({ how_to_reach: { email: ["ana@example.com"] } });
});

test("every address or number they have is listed, a second one is added beside the first, and Remove takes one away with Undo", async () => {
  const user = userEvent.setup();
  const two = { "GET record?kind=person&id=PER-2": () => ({ kind: "person", id: "PER-2", version: 3, fields: { id: "PER-2", full_name: ANA, how_to_reach: { email: ["ana@example.com", "ana.home@example.net"] }, aliases: [], name_verified: true, stance: null, relation: "my sister" }, long_text: [] }) };
  const calls = serve(friend, { ...two, "POST people/PER-2": () => ({ ok: "PER-2" }) });
  const details = await loaded();
  expect(await within(details).findByText("ana@example.com")).toBeInTheDocument();
  expect(within(details).getByText("ana.home@example.net")).toBeInTheDocument();
  // Adding another keeps the two it has.
  await user.click(within(details).getByRole("button", { name: "Add another email" }));
  await user.type(within(details).getByLabelText("New email for Ana Example"), "ana.work@example.org");
  await user.click(within(details).getByRole("button", { name: "Add" }));
  await waitFor(() => expect(calls.some((c) => c.route === "POST people/PER-2")).toBe(true));
  expect(calls.find((c) => c.route === "POST people/PER-2")!.body).toEqual({ how_to_reach: { email: ["ana@example.com", "ana.home@example.net", "ana.work@example.org"] } });
  // Remove takes only that one, and Undo sends the set as it was.
  await user.click(within(details).getByRole("button", { name: "Remove ana.home@example.net" }));
  await waitFor(() => expect(calls.filter((c) => c.route === "POST people/PER-2")).toHaveLength(2));
  expect(calls.filter((c) => c.route === "POST people/PER-2")[1].body).toEqual({ how_to_reach: { email: ["ana@example.com"] } });
  expect(await screen.findByText("Removed ana.home@example.net from Ana Example.")).toBeInTheDocument();
  await user.click(screen.getAllByRole("button", { name: "Undo" }).at(-1)!);
  await waitFor(() => expect(calls.filter((c) => c.route === "POST people/PER-2")).toHaveLength(3));
  expect(calls.filter((c) => c.route === "POST people/PER-2")[2].body).toEqual({ how_to_reach: { email: ["ana@example.com", "ana.home@example.net"] } });
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

test("the person's own page lists every job and business they keep, not only the organization their record names", async () => {
  serve(
    { ...friend, org: "ORG-1", org_name: "Studio" },
    {
      "GET me": () => ({ full_name: ANA, person: "PER-2" }),
      "GET setup/business": () => ({
        business: true,
        name: "Shop",
        personal: "PRJ-personal",
        sides: [
          { project: "PRJ-shop", name: "Shop", kind: "business", removable: false, filed: 0 },
          { project: "PRJ-job", name: "Studio", kind: "job", removable: false, filed: 0 },
        ],
        chosen: "work",
      }),
      "GET projects": () => [project("PRJ-personal", "Personal"), project("PRJ-shop", "Shop"), project("PRJ-job", "Studio")],
    },
  );
  renderApp(<RecordPage kind="person" id="PER-2" onBack={() => {}} />);
  const row = await screen.findByText("Your jobs and businesses");
  expect(row.closest("[data-definition]")!.querySelector("dd")!.textContent).toBe("ShopStudio");
});

// ---- the page to the 4.6 mockups: the primary, the contact card, the timeline and the box to ask --------------------------

test("the one filled button adds a to-do for them: the form opens with the cursor in its words and them as the one who does it", async () => {
  const user = userEvent.setup();
  serve(friend);
  await loaded();
  await user.click(screen.getByRole("button", { name: "Add a to-do for Ana" }));
  const dialog = await screen.findByRole("dialog", { name: "Add a to-do" });
  expect(within(dialog).getByRole("combobox", { name: "Who does it" })).toHaveValue("PER-2");
  expect(document.activeElement).toBe(within(dialog).getByRole("textbox", { name: /^What/ }));
});

test("the contact card has their initials on the color of their side, how you were last in touch and Edit, and the page marks the order of its parts", async () => {
  serve({ ...friend, sides: ["PRJ-personal", "PRJ-shop"], side: "both" });
  await loaded();
  const card = document.querySelector<HTMLElement>("[data-contact-card]")!;
  expect(within(card).getByText("AE")).toHaveAttribute("data-avatar", "");
  expect(within(card).getByText("AE")).toHaveAttribute("aria-hidden", "true");
  // The parts a narrow window puts in order: what is open, then the card, then the history, then the box to ask.
  const grid = document.querySelector<HTMLElement>("[data-person-page]")!;
  expect(grid.querySelector('[data-slot="open"]')).not.toBeNull();
  expect(grid.querySelector('[data-slot="rest"]')).not.toBeNull();
  expect(grid.querySelector('[data-slot="ask"]')).not.toBeNull();
  expect(card.closest(".record-rail")).not.toBeNull();
});

test("the box to ask is a card of the rail, titled with their first name, with a send button inside it", async () => {
  serve(friend);
  await loaded();
  expect(await screen.findByRole("heading", { name: "Ask about Ana" })).toBeInTheDocument();
  const ask = document.querySelector<HTMLElement>('[data-slot="ask"]')!;
  expect(within(ask).getByPlaceholderText("Ask anything about Ana")).toBeInTheDocument();
  expect(within(ask).getByRole("button", { name: "Send" })).toBeInTheDocument();
});

test("each line of the timeline has an icon for who did it", async () => {
  serve(friend, {}, pageOf({ activity: [
    { at: "2026-10-12T09:00:00Z", kind: "action", id: "ACT-9", name: "Choose the font", op: "action.add#0", field: null, actor: "pm", by_assistant: false, made: "added" },
    { at: "2026-10-12T10:00:00Z", kind: "action", id: "ACT-8", name: "Pick the paper", op: "action.add#0", field: null, actor: "assistant", by_assistant: true, made: "added" },
  ] }));
  await loaded();
  const entries = await screen.findAllByRole("listitem").then((all) => all.filter((li) => li.hasAttribute("data-activity-entry")));
  expect(entries).toHaveLength(2);
  for (const entry of entries) expect(entry.querySelector("svg")).not.toBeNull();
});

test("with nothing open with them the page says so once, with the way to add a to-do for them", async () => {
  const user = userEvent.setup();
  serve(friend, {}, pageOf({ open_actions: [], open_questions: [], completed_actions: [] }));
  await loaded();
  const empty = await screen.findByText("Nothing with Ana yet");
  expect(empty).toBeInTheDocument();
  expect(screen.getByText("To-dos, questions and messages with Ana Example show up here.")).toBeInTheDocument();
  const box = empty.closest("[data-person-nothing]") as HTMLElement;
  await user.click(within(box).getByRole("button", { name: "Add a to-do for Ana" }));
  expect(await screen.findByRole("dialog", { name: "Add a to-do" })).toBeInTheDocument();
});
