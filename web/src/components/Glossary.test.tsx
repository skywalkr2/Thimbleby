import "@testing-library/jest-dom/vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Item } from "../lib/knowledge";
import { fakeSettings, settingItem } from "../lib/settings-fixtures";
import type { Routes } from "../test-utils";
import { renderApp } from "../test-utils";
import { Glossary } from "./Glossary";

const KEY = "language.known_terms";
const items = (value: string[] = []) => [settingItem(KEY, { type: "list", value, default: [] })];
const posted = (calls: ReturnType<typeof fakeSettings>) => calls.filter((c) => c.route === "POST settings").map((c) => c.body as { changes: Record<string, unknown> });

// The answer to "What does folio mean here?" is kept as a glossary entry in the person's words: its word and its meaning.
function entry(over: Partial<Item> = {}): Item {
  return {
    id: "GLOSS-1",
    kind: "glossary_entry",
    version: 3,
    text: "folio: a page number",
    status: "active",
    learnedFrom: "person",
    untrusted: false,
    scope: { scope: "workspace", task_kinds: [], records: [], filter: {}, projects: [], people: [], except: [] },
    used: 0,
    given: 0,
    lastUsed: null,
    learnedAt: "2026-10-20T09:00:00Z",
    enforced: false,
    origin: null,
    constrains: [],
    term: "folio",
    meaning: "a page number",
    ...over,
  };
}

function show(entries: Item[], known: string[] = [], extra: Routes = {}, onActed = vi.fn()) {
  const calls = fakeSettings(items(known), extra);
  renderApp(<Glossary entries={entries} now={new Date("2026-10-28T09:00:00Z")} onActed={onActed} />);
  return { calls, onActed };
}

test("an answer to a question about a word is listed with the word, what it means and that it is the person's own", async () => {
  show([entry()]);
  const list = await screen.findByRole("list", { name: "Your words" });
  const [row] = within(list).getAllByRole("listitem");
  expect(row).toHaveTextContent("folio");
  expect(row).toHaveTextContent("a page number");
  expect(row).toHaveTextContent("Your own words");
  expect(row).toHaveTextContent("Never used");
});

test("with no words there is no list, only the two boxes", async () => {
  show([]);
  expect(await screen.findByRole("heading", { level: 2, name: "Your words" })).toBeInTheDocument();
  expect(screen.queryByRole("list")).toBeNull();
  expect(screen.getByLabelText("A word")).toBeInTheDocument();
  expect(screen.getByLabelText("What it means")).toBeInTheDocument();
});

test("a word with its meaning is added through the glossary, at once, trimmed, and the boxes are emptied", async () => {
  const user = userEvent.setup();
  const onActed = vi.fn();
  const { calls } = show([], [], { "POST knowledge/terms": () => ({ changeset: "CS-1" }) }, onActed);
  await user.type(await screen.findByLabelText("A word"), "  zed   corp ");
  await user.type(screen.getByLabelText("What it means"), "the  print shop");
  await user.click(screen.getByRole("button", { name: "Add word" }));
  await waitFor(() => expect(calls.find((c) => c.route === "POST knowledge/terms")?.body).toEqual({ term: "zed corp", meaning: "the print shop" }));
  expect(await screen.findByText("Added zed corp to your words.")).toBeInTheDocument();
  expect(screen.getByLabelText("A word")).toHaveValue("");
  expect(screen.getByLabelText("What it means")).toHaveValue("");
  expect(onActed).toHaveBeenCalled();
  expect(posted(calls)).toHaveLength(0);
});

test("a word with no meaning is only added to the words never asked about, saved at once", async () => {
  const user = userEvent.setup();
  const { calls } = show([], ["acme"]);
  expect(await screen.findByRole("heading", { level: 3, name: "Words Helper never asks about" })).toBeInTheDocument();
  await user.type(screen.getByLabelText("A word"), "zed");
  await user.click(screen.getByRole("button", { name: "Add word" }));
  await waitFor(() => expect(posted(calls)).toHaveLength(1));
  expect(posted(calls)[0].changes).toEqual({ [KEY]: ["acme", "zed"] });
  expect(await screen.findByText("Added zed to your words.")).toBeInTheDocument();
  expect(screen.getByLabelText("A word")).toHaveValue("");
});

test("a word already there, in any case, as a word with a meaning or without, is not added twice", async () => {
  const user = userEvent.setup();
  const { calls } = show([entry()], ["Acme"]);
  await user.type(await screen.findByLabelText("A word"), "FOLIO");
  expect(screen.getByRole("button", { name: "Add word" })).toBeDisabled();
  expect(screen.getByText("FOLIO is in your words already.")).toBeInTheDocument();
  await user.clear(screen.getByLabelText("A word"));
  await user.type(screen.getByLabelText("A word"), "acme");
  expect(screen.getByRole("button", { name: "Add word" })).toBeDisabled();
  expect(posted(calls)).toHaveLength(0);
});

test("a plain word is removed from its own button, with a read-back and Undo that puts it back", async () => {
  const user = userEvent.setup();
  const { calls } = show([], ["acme", "zed"]);
  await user.click(await screen.findByRole("button", { name: "Remove acme" }));
  await waitFor(() => expect(posted(calls)).toHaveLength(1));
  expect(posted(calls)[0].changes).toEqual({ [KEY]: ["zed"] });
  expect(await screen.findByText("Took acme out of your words.")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Undo" }));
  await waitFor(() => expect(posted(calls)).toHaveLength(2));
  expect(posted(calls)[1]).toMatchObject({ changes: { [KEY]: ["acme", "zed"] } });
});

test("Stop using on a word retires it with the version that was read", async () => {
  const user = userEvent.setup();
  const { calls, onActed } = show([entry()], [], { "POST knowledge/GLOSS-1/retire": () => ({ changeset: "CS-2" }) });
  await user.click(await screen.findByRole("button", { name: "Stop using folio" }));
  await waitFor(() => expect(calls.find((c) => c.route === "POST knowledge/GLOSS-1/retire")?.body).toEqual({ read_version: 3 }));
  await waitFor(() => expect(onActed).toHaveBeenCalled());
});

test("when the plain words can't be edited, a word needs its meaning", async () => {
  const user = userEvent.setup();
  fakeSettings([settingItem(KEY, { type: "list", value: [], default: [], editable: false })]);
  renderApp(<Glossary entries={[]} now={new Date()} onActed={vi.fn()} />);
  await user.type(await screen.findByLabelText("A word"), "zed");
  expect(screen.getByRole("button", { name: "Add word" })).toBeDisabled();
  await user.type(screen.getByLabelText("What it means"), "a name");
  expect(screen.getByRole("button", { name: "Add word" })).toBeEnabled();
});
