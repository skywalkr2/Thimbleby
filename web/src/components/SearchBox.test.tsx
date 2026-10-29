import "@testing-library/jest-dom/vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

test("a file and a piece of what was learned are rows with their own labels", async () => {
  const user = userEvent.setup();
  open();
  await user.type(screen.getByRole("searchbox"), "ladder");
  const file = await screen.findByRole("button", { name: /ladder-safety\.pdf/ });
  expect(file).toHaveTextContent("File");
  expect(screen.getByRole("button", { name: /Check the ladder/ })).toHaveTextContent("Learned");
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
  expect(row).not.toHaveTextContent("Project");
  expect(row).toHaveTextContent("My life");
});

test("a work workspace keeps the usual placeholder and the Project label", async () => {
  const user = userEvent.setup();
  alone(false);
  await user.type(screen.getByRole("searchbox"), "life");
  expect(await screen.findByRole("button", { name: /My life/ })).toHaveTextContent("Project");
  expect(screen.getByRole("searchbox")).toHaveAttribute("placeholder", "Search or ask Helper");
});
