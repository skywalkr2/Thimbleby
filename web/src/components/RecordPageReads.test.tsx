import "@testing-library/jest-dom/vitest";
import { screen, waitFor, within } from "@testing-library/react";
import type { S } from "../lib/api";
import { day } from "../lib/dates";
import { person, project } from "../lib/records-fixtures";
import { fakeApi, renderApp } from "../test-utils";
import { RecordPage } from "./RecordPage";

// A record's page is read in words: no id while the names are still on their way, a map keyed by records said by their
// names, a to-do's own words with a date in them written as a day, and its fields called by the same plain labels as its form.

const field = (name: string, type: S["FieldView"]["type"], extra: Partial<S["FieldView"]> = {}): S["FieldView"] => ({
  name,
  description: "",
  type,
  required: false,
  editable: true,
  ...extra,
});

const page = (kind: string, id: string, name: string, details: S["RecordPageView"]["details"] = []): S["RecordPageView"] => ({
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

function serve(kind: string, id: string, fields: Record<string, unknown>, fieldViews: S["FieldView"][], shown: () => unknown) {
  const k = encodeURIComponent(kind);
  fakeApi({
    [`GET record?kind=${k}&id=${id}`]: () => ({ kind, id, version: 3, fields: { id, ...fields }, long_text: [] }),
    [`GET kinds/${kind}`]: () => ({ kind, fields: fieldViews }),
    [`GET record-pages/${id}?kind=${k}`]: shown,
    "GET people": () => [person("PER-1", "Robin Sample"), person("PER-3", "Sam Okoro")],
    "GET projects": () => [project("PRJ-1", "Harbor")],
    "GET settings": () => ({ fingerprint: "fp", items: [] }),
    "GET lists": () => [],
    "GET organizations": () => [],
    "GET me": () => ({ person: "PER-1", full_name: "Robin Sample" }),
    [`GET plugin-actions?kind=${k}&id=${id}`]: () => [],
    [`GET task-kinds?kind=${k}&id=${id}`]: () => [],
  });
}

test("while a page's names are on their way it shows no id: not in its heading and not in its details", async () => {
  serve("person", "PER-3", { full_name: "Sam Okoro", org: "ORG-1", team: "TEAM-1" }, [field("full_name", "text"), field("org", "reference", { refers_to: "organization" })], () => new Promise(() => {}));
  renderApp(<RecordPage kind="person" id="PER-3" onBack={() => {}} />);
  await screen.findByRole("region", { name: "Details" });
  await waitFor(() => expect(document.querySelector("[data-skeleton]")).not.toBeNull());
  expect(document.body.textContent).not.toMatch(/\b[A-Z]{2,5}-\d+\b/);
  expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("");
});

test("a map keyed by records says each by its name, and an id the page can't name is not a label", async () => {
  serve(
    "action",
    "ACT-1",
    { text: "Send the index", told: { "PER-3": "2026-10-28", "PER-9": "2026-10-29" } },
    [field("text", "long_text"), field("told", "other")],
    () => page("action", "ACT-1", "Send the index", [{ field: "told", value: "", type: "map", refs: [{ kind: "person", id: "PER-3", name: "Sam Okoro", removed: false }] }]),
  );
  renderApp(<RecordPage kind="action" id="ACT-1" onBack={() => {}} />);
  const details = await screen.findByRole("region", { name: "Details" });
  await within(details).findByText(`Sam Okoro: ${day("2026-10-28")}`);
  expect(within(details).getByText("Who was told")).toBeInTheDocument();
  expect(details.textContent).not.toMatch(/PER[ -]\d/);
  expect(details.textContent).toContain(day("2026-10-29"));
});

test("a to-do's page writes a date in its words as a day, in the heading and the details", async () => {
  serve(
    "action",
    "ACT-2",
    { text: "Lend us the trailer on 2026-11-07", evidence: { quote: "Sam will lend us the trailer on 2026-11-07", source: "note" } },
    [field("text", "long_text"), field("evidence", "other")],
    () => page("action", "ACT-2", "Lend us the trailer on 2026-11-07"),
  );
  renderApp(<RecordPage kind="action" id="ACT-2" onBack={() => {}} />);
  expect(await screen.findByRole("heading", { level: 1, name: `Lend us the trailer on ${day("2026-11-07")}` })).toBeInTheDocument();
  const details = await screen.findByRole("region", { name: "Details" });
  expect(details.textContent).toContain(`Sam will lend us the trailer on ${day("2026-11-07")}`);
  expect(document.body.textContent).not.toMatch(/\d{4}-\d{2}-\d{2}/);
});
