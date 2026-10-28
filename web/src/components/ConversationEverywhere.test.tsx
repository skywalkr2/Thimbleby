import "@testing-library/jest-dom/vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import type { S } from "../lib/api";
import { org, person, project } from "../lib/records-fixtures";
import { fakeApi, renderApp, type Routes } from "../test-utils";
import { CONVERSATION_KINDS } from "./RecordConversation";
import { People } from "./People";
import { Projects } from "./Projects";
import { RecordPage } from "./RecordPage";
import { SeriesPage } from "./SeriesPage";

// The box to talk to the assistant (design 6.25, 6.32, S5) is on every screen of a record: its page, whatever its kind, the
// series page, and the pane or drawer that shows a person or a project beside its list. Each asks for the conversation kept on
// that very record.

afterEach(() => vi.unstubAllGlobals());

const none = (kind: string, id: string) => ({ [`GET records/${kind}/${id}/conversation`]: () => ({ kind, id, turns: [] }) });
const box = () => screen.findByRole("heading", { name: "Talk to Helper" });

test("the kinds the box is offered for are every kind of record that has a page, the engine's own list", () => {
  expect([...CONVERSATION_KINDS].sort()).toEqual(
    ["action", "event", "fact", "glossary_entry", "lesson", "note", "organization", "person", "project", "question", "rule", "series", "source", "team"].sort(),
  );
});

describe("a record's page", () => {
  const page = (kind: string, id: string, fields: Record<string, unknown>, extra: Routes = {}) =>
    fakeApi({
      [`GET record?kind=${kind}&id=${id}`]: () => ({ kind, id, version: 1, fields: { id, ...fields }, long_text: [] }),
      [`GET kinds/${kind}`]: () => ({ kind, fields: [{ name: "title", description: "", type: "text", required: true, editable: false }] }),
      "GET people": () => [],
      "GET projects": () => [],
      ...none(kind, id),
      ...extra,
    });

  test.each([
    ["source", "SRC-1", { title: "Supplier mail" }],
    ["fact", "FACT-1", { text: "Both spines are in the folder." }],
    ["organization", "ORG-1", { name: "Harbor Press" }],
    ["rule", "RULE-1", { name: "No Friday sends", text: "Never send on a Friday." }],
    ["note", "NOTE-1", { text: "Ask about the bleed." }],
  ])("a %s has the box, asking for the conversation kept on it", async (kind, id, fields) => {
    const calls = page(kind, id, fields);
    renderApp(<RecordPage kind={kind} id={id} onBack={() => {}} />);
    expect(await box()).toBeInTheDocument();
    expect(calls.some((c) => c.route === `GET records/${kind}/${id}/conversation`)).toBe(true);
  });

  test("a kind that is not a record of the person's, such as a run, has none", async () => {
    page("run", "RUN-1", { task: "notes" });
    renderApp(<RecordPage kind="run" id="RUN-1" onBack={() => {}} />);
    await screen.findByRole("heading", { level: 1 });
    expect(screen.queryByRole("heading", { name: "Talk to Helper" })).toBeNull();
  });
});

test("a series page has the box, for the series", async () => {
  const calls = fakeApi({
    "GET series/SER-1/page": () =>
      ({ id: "SER-1", title: "Print sync", repeats: "every Thursday", project: null, project_name: null, next: null, past: [], agenda: [], open_without_next: 0, usually_with: [] }) as unknown as S["SeriesPageView"],
    ...none("series", "SER-1"),
  });
  renderApp(<SeriesPage id="SER-1" onBack={() => {}} />);
  expect(await box()).toBeInTheDocument();
  expect(calls.some((c) => c.route === "GET records/series/SER-1/conversation")).toBe(true);
});

test("the pane beside the list of people has the box for the person chosen, and asks for no other person's", async () => {
  const user = userEvent.setup();
  const calls = fakeApi({
    "GET people": () => [person("P-1", "Ana Person"), person("P-2", "Ben Person")],
    "GET organizations": () => [org("ORG-1", "Org one", 0)],
    ...none("person", "P-1"),
    ...none("person", "P-2"),
  });
  renderApp(<People />);
  await user.click((await screen.findByRole("link", { name: "Ana Person" })).closest("tr")!);
  expect(await box()).toBeInTheDocument();
  expect(calls.some((c) => c.route === "GET records/person/P-1/conversation")).toBe(true);
  expect(calls.some((c) => c.route === "GET records/person/P-2/conversation")).toBe(false);
});

test("the pane beside the list of projects has the box for the project chosen", async () => {
  const user = userEvent.setup();
  const calls = fakeApi({
    "GET people": () => [],
    "GET projects": () => [project("PRJ-1", "First project")],
    "GET notes": () => [],
    "GET unfiled": () => ({ count: 0, items: [] }),
    "GET settings": () => ({ fingerprint: "fp-1", items: [] }),
    "GET lists": () => [],
    ...none("project", "PRJ-1"),
  });
  renderApp(<Projects />);
  await user.click((await screen.findByRole("link", { name: "First project" })).closest("tr")!);
  expect(await box()).toBeInTheDocument();
  expect(document.querySelectorAll("[data-conversation]")).toHaveLength(1);
  expect(calls.some((c) => c.route === "GET records/project/PRJ-1/conversation")).toBe(true);
});
