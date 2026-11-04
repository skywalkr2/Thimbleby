import "@testing-library/jest-dom/vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fakeApi, renderApp } from "../test-utils";
import { SearchBox } from "./SearchBox";

const results = [
  { kind: "person", id: "P-1", title: "Priya Example", detail: "Engineer" },
  { kind: "action", id: "A-1", title: "Move the ladder to the shed", detail: null },
  { kind: "file", id: "FILE-1", title: "ladder-safety.pdf", detail: null },
  { kind: "lesson", id: "LES-1", title: "Check the ladder before lending it", detail: null },
];

function open() {
  const calls = fakeApi({ "GET search": (_b, q) => ({ results: q?.get("q") ? results : [] }), "POST ask": () => ({ id: "ASK-1" }) });
  const onOpenRecord = vi.fn();
  const onAsk = vi.fn();
  renderApp(<SearchBox onOpenRecord={onOpenRecord} onAsk={onAsk} />);
  return { calls, onOpenRecord, onAsk };
}

test("typing finds records and people locally, with Ask about it last, and sends no question", async () => {
  const user = userEvent.setup();
  const { calls } = open();
  await user.type(screen.getByRole("searchbox"), "ladder");
  const rows = await screen.findAllByRole("button", { name: /Priya Example|ladder/i });
  expect(rows.map((r) => r.textContent)).toEqual([expect.stringContaining("Priya Example"), expect.stringContaining("Move the ladder"), expect.stringContaining("ladder-safety.pdf"), expect.stringContaining("Check the ladder"), expect.stringContaining("Ask Helper about “ladder”")]);
  expect(calls.some((c) => c.route === "POST ask")).toBe(false);
});

test("a result opens its record; Ask about it opens Ask with the words, unsent", async () => {
  const user = userEvent.setup();
  const { onOpenRecord, onAsk, calls } = open();
  await user.type(screen.getByRole("searchbox"), "priya");
  await user.click(await screen.findByRole("button", { name: /Priya Example/ }));
  expect(onOpenRecord).toHaveBeenCalledWith("person", "P-1");
  await user.type(screen.getByRole("searchbox"), "priya");
  await user.click(await screen.findByRole("button", { name: /Ask Helper about/ }));
  expect(onAsk).toHaveBeenCalledWith("priya");
  expect(calls.some((c) => c.route === "POST ask")).toBe(false);
});

test("with nothing typed there is nothing to ask or find, and nothing found says so", async () => {
  const user = userEvent.setup();
  fakeApi({ "GET search": () => ({ results: [] }) });
  renderApp(<SearchBox onOpenRecord={() => undefined} onAsk={() => undefined} />);
  expect(screen.queryByRole("button", { name: /Ask Helper about/ })).toBeNull();
  await user.type(screen.getByRole("searchbox"), "zzz");
  await waitFor(() => expect(screen.getByText(/Nothing found/)).toBeInTheDocument());
  expect(screen.getByRole("button", { name: /Ask Helper about “zzz”/ })).toBeInTheDocument();
});

test("a file and a piece of what was learned are rows under their own headings", async () => {
  const user = userEvent.setup();
  open();
  await user.type(screen.getByRole("searchbox"), "ladder");
  const file = await screen.findByRole("button", { name: /ladder-safety\.pdf/ });
  expect(file).toBeInTheDocument();
  expect(screen.getByText("Files")).toBeInTheDocument();
  expect(screen.getByText("Learned")).toBeInTheDocument();
});

test("the field is named for the assistant, and with nothing typed the one row is Ask", async () => {
  const user = userEvent.setup();
  const { onAsk } = open();
  const field = screen.getByRole("searchbox");
  expect(field).toHaveAttribute("placeholder", "Search or ask Helper");
  await user.click(field);
  const rows = screen.getAllByRole("button");
  expect(rows).toHaveLength(1);
  await user.click(rows[0]);
  expect(onAsk).toHaveBeenCalledWith("");
});

test("results drop down from the field and close on Escape; the field does not take the cursor by itself", async () => {
  const user = userEvent.setup();
  open();
  const field = screen.getByRole("searchbox");
  expect(field).not.toHaveFocus();
  await user.type(field, "ladder");
  expect(await screen.findByRole("list", { name: "Results" })).toBeInTheDocument();
  await user.keyboard("{Escape}");
  expect(screen.queryByRole("list", { name: "Results" })).toBeNull();
});

test("Enter in the field opens the first row, or asks when there is none", async () => {
  const user = userEvent.setup();
  const { onOpenRecord } = open();
  await user.type(screen.getByRole("searchbox"), "ladder");
  await screen.findByRole("button", { name: /Priya Example/ });
  await user.keyboard("{Enter}");
  expect(onOpenRecord).toHaveBeenCalledWith("person", "P-1");
});

function alone(justMe: boolean) {
  const personal = { id: "PRJ-me", name: "My life", parent: null };
  fakeApi({
    "GET setup/business": () => ({ business: !justMe, name: null, personal: "PRJ-me", sides: justMe ? [] : [{ project: "PRJ-firm", kind: "business", name: "Orchard Press" }], chosen: null }),
    "GET projects": () => (justMe ? [personal] : [personal, { id: "PRJ-firm", name: "Orchard Press", parent: null }]),
    "GET search": (_b, q) => ({ results: q?.get("q") ? [{ kind: "project", id: "PRJ-me", title: "My life", detail: null }] : [] }),
  });
  renderApp(<SearchBox onOpenRecord={() => undefined} onAsk={() => undefined} />);
}

test("for a person with only their own life the field uses no work words and the Personal page is labelled by its name", async () => {
  const user = userEvent.setup();
  alone(true);
  await waitFor(() => expect(screen.getByRole("searchbox")).toHaveAttribute("placeholder", "A person or a to-do"));
  await user.type(screen.getByRole("searchbox"), "life");
  const row = await screen.findByRole("button", { name: /My life/ });
  expect(row).toHaveTextContent("My life");
  expect(screen.getByText("Areas")).toBeInTheDocument();
  expect(screen.queryByText("Projects")).toBeNull();
});

test("a work workspace keeps the usual placeholder and the Project label", async () => {
  const user = userEvent.setup();
  alone(false);
  await user.type(screen.getByRole("searchbox"), "life");
  await screen.findByRole("button", { name: /My life/ });
  expect(screen.getByText("Projects")).toBeInTheDocument();
  expect(screen.getByRole("searchbox")).toHaveAttribute("placeholder", "Search or ask Helper");
});

test("a result's title and detail never show a day as year-month-day", async () => {
  const user = userEvent.setup();
  fakeApi({ "GET search": () => ({ results: [{ kind: "action", id: "A-2", title: "Send the venue list by 2026-11-02.", detail: "Due 2026-11-02" }] }) });
  renderApp(<SearchBox onOpenRecord={vi.fn()} onAsk={vi.fn()} />);
  await user.type(screen.getByRole("searchbox"), "venue");
  const row = await screen.findByRole("button", { name: /Send the venue list/ });
  expect(row.textContent).not.toMatch(/2026-11-02/);
});

test("each result has a glyph and no square tag, and Asking is set apart from the results by a rule and its own glyph", async () => {
  const user = userEvent.setup();
  open();
  await user.type(screen.getByRole("searchbox"), "ladder");
  const person = (await screen.findByRole("button", { name: /Priya Example/ })).closest("li")!;
  expect(person.querySelector("svg")).not.toBeNull();
  expect(person.querySelector("[data-pill]")).toBeNull();
  expect(screen.getByRole("button", { name: /Move the ladder/ }).closest("li")!.querySelector("[data-pill]")).toBeNull();
  // The Ask row is not a result: it has no kind tag, its own glyph and a rule above it (its own list item).
  const ask = screen.getByRole("button", { name: /Ask Helper about/ }).closest("li")!;
  expect(ask.querySelector("[data-pill]")).toBeNull();
  expect(ask.querySelector("svg")).not.toBeNull();
  expect(ask.className).toMatch(/askItem/);
  // The note about what asking does is inside the same panel as the rows.
  const panel = screen.getByRole("list", { name: "Results" }).parentElement!;
  expect(panel.textContent).toContain("Searching is free.");
});

test("nothing found says which records were searched and that mail and notes are not", async () => {
  const user = userEvent.setup();
  fakeApi({ "GET search": () => ({ results: [] }) });
  renderApp(<SearchBox onOpenRecord={() => undefined} onAsk={() => undefined} />);
  await user.type(screen.getByRole("searchbox"), "zzz");
  expect(await screen.findByText("Nothing found for “zzz” in your people, projects, to-dos and files. Mail and notes are not searched.")).toBeInTheDocument();
});

test("results are grouped under what they are and counted, and the question to ask is the last of the same list", async () => {
  const user = userEvent.setup();
  open();
  await user.type(screen.getByRole("searchbox"), "ladder");
  await screen.findByRole("button", { name: /Priya Example/ });
  for (const heading of ["People", "To-dos", "Files", "Learned"]) expect(screen.getByText(heading)).toBeInTheDocument();
  expect(screen.getByText("4 matches")).toBeInTheDocument();
  const list = screen.getByRole("list", { name: "Results" });
  const items = within(list).getAllByRole("listitem");
  expect(items[items.length - 1]).toContainElement(screen.getByRole("button", { name: /Ask Helper about/ }));
  // A row says no kind of its own: the glyph and the group's heading do.
  expect(screen.getByRole("button", { name: /Priya Example/ })).not.toHaveTextContent("Person");
});

test("a long result title keeps to two lines and the question to ask stays at the foot of the scrolling panel", () => {
  const css = readFileSync(join(__dirname, "SearchBox.module.css"), "utf8");
  expect(css).toMatch(/\.main \{[^}]*-webkit-line-clamp: 2/);
  expect(css).toMatch(/\.drop \{[^}]*overflow-y: auto/);
  expect(css).toMatch(/\.askItem \{[^}]*position: sticky; bottom:/);
});

test("the key that reaches the search box shows in it while it is empty, and goes once something is typed", async () => {
  fakeApi({ "GET search": () => ({ results: [] }) });
  renderApp(<SearchBox keyHint="/" onOpenRecord={vi.fn()} onAsk={vi.fn()} />);
  const hint = document.querySelector("[data-key-hint]");
  expect(hint).toHaveTextContent("/");
  await userEvent.setup().type(screen.getByRole("searchbox"), "x");
  expect(document.querySelector("[data-key-hint]")).toBeNull();
});
