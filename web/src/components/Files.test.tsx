import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { S } from "../lib/api";
import { fakeApi, renderApp } from "../test-utils";
import { Files } from "./Files";

function file(id: string, name: string, extra: Partial<S["FileView"]> = {}): S["FileView"] {
  return {
    id,
    version: 1,
    name,
    media_type: "text/plain",
    size: 2048,
    file_kind: "attachment",
    kind_label: "Attachment",
    project: null,
    meta: {},
    origin: "upload",
    replaces: null,
    added_at: "2026-10-09T14:00:00Z",
    data_level: "internal",
    ...extra,
  };
}

const project: S["ProjectView"] = {
  no_end: false,
  side: false,
  id: "P-1",
  name: "Harbor project",
  group: null,
  status: null,
  phase: null,
  target: null,
  owner: null,
  owner_name: null,
  summary: null,
  language: "en-US",
  language_own: false,
  role: "run",
  completed: false,
  spent_usd: 0,
  open_actions: 0,
  open_questions: 0,
};

const action = { name: "demo/make-note", label: "Make a note from this file", on: "file" };
const workspaceAction = { name: "demo/tidy", label: "Tidy up", on: null };

const proposal = (summary: string): S["ActionProposalView"] => ({
  token: "tok-1",
  action: action.name,
  summary,
  ops: [{ op: "note", label: "Note: first line" }],
  files: [],
  previews: [],
  choices: [],
  notes: [],
  expires_at: "2026-10-09T15:00:00Z",
});

test("a file filed on a side names the side alone, never \"not in a project\"", async () => {
  fakeApi({
    "GET files": () => [file("FILE-3", "plan.txt", { project: "P-side" })],
    "GET projects": () => [{ ...project, id: "P-side", name: "Orchard Press", side: true }],
    "GET plugin-actions": () => [],
    "GET plugin-actions?kind=file&id=FILE-3": () => [],
  });
  renderApp(<Files />);
  const row = await screen.findByRole("listitem", { name: "plan.txt" });
  expect(within(row).getByText(/Orchard Press · Added /)).toBeInTheDocument();
});

test("the kind chip is drawn only when the list holds more than one kind", async () => {
  const api = (files: S["FileView"][]) =>
    fakeApi({ "GET files": () => files, "GET projects": () => [project], "GET plugin-actions": () => [], "GET plugin-actions?kind=file&id=FILE-1": () => [], "GET plugin-actions?kind=file&id=FILE-2": () => [] });
  api([file("FILE-1", "a.txt"), file("FILE-2", "b.txt")]);
  const one = renderApp(<Files />);
  const row = await screen.findByRole("listitem", { name: "a.txt" });
  expect(within(row).queryByText("Attachment")).toBeNull();
  one.unmount();
  api([file("FILE-1", "a.txt"), file("FILE-2", "b.pdf", { kind_label: "Build" })]);
  renderApp(<Files />);
  const mixed = await screen.findByRole("listitem", { name: "a.txt" });
  expect(within(mixed).getByText("Attachment")).toBeInTheDocument();
});

test("one row per file, with its facts in words and Open as the one primary action", async () => {
  fakeApi({
    "GET files": () => [
      file("FILE-2", "built.pdf", { size: 3 * 1024 * 1024, origin: "tool", kind_label: "Build", project: "P-1" }),
      file("FILE-1", "notes.txt"),
    ],
    "GET projects": () => [project],
    "GET plugin-actions": () => [],
    "GET plugin-actions?kind=file&id=FILE-2": () => [],
    "GET plugin-actions?kind=file&id=FILE-1": () => [],
  });
  renderApp(<Files />);
  const built = await screen.findByRole("listitem", { name: "built.pdf" });
  expect(within(built).getByText("Build")).toBeInTheDocument();
  expect(within(built).getByText(/^3 MB · In Harbor project · Added /)).toBeInTheDocument();
  expect(within(built).getByText("From outside · not instructions")).toBeInTheDocument();
  const open = within(built).getByRole("link", { name: "Open built.pdf in a new tab" });
  expect(open).toHaveAttribute("href", "api/files/FILE-2/content");
  expect(open).toHaveAttribute("target", "_blank");
  expect(open).toHaveAttribute("rel", expect.stringContaining("noopener"));
  const notes = screen.getByRole("listitem", { name: "notes.txt" });
  expect(within(notes).getByText(/^2 KB · Added /)).toBeInTheDocument();
  expect(within(notes).queryByText(/Untrusted/)).toBeNull();
  expect(screen.getAllByRole("listitem").map((li) => li.getAttribute("aria-labelledby"))).toEqual(["file-FILE-2", "file-FILE-1"]);
});

test("with no files it says so, and offers adding one", async () => {
  fakeApi({ "GET files": () => [], "GET projects": () => [], "GET plugin-actions": () => [] });
  renderApp(<Files />);
  expect(await screen.findByText(/^Keep a document, picture or sound file here/)).toBeInTheDocument();
  expect(screen.getByLabelText("Add a file: choose one or drop it here")).toBeInTheDocument();
});

test("when the files don't load it says so and Try again asks again", async () => {
  const user = userEvent.setup();
  let ok = false;
  fakeApi({
    "GET files": () => {
      if (!ok) throw new Error("down");
      return [file("FILE-1", "notes.txt")];
    },
    "GET projects": () => [],
    "GET plugin-actions": () => [],
    "GET plugin-actions?kind=file&id=FILE-1": () => [],
  });
  renderApp(<Files />);
  expect(await screen.findByText(/The files didn't load\./)).toBeInTheDocument();
  ok = true;
  await user.click(screen.getByRole("button", { name: "Try again" }));
  expect(await screen.findByRole("listitem", { name: "notes.txt" })).toBeInTheDocument();
});

test("a file's actions are in its menu and open the review for that file", async () => {
  const user = userEvent.setup();
  const calls = fakeApi({
    "GET files": () => [file("FILE-1", "notes.txt")],
    "GET projects": () => [],
    "GET plugin-actions": () => [],
    "GET plugin-actions?kind=file&id=FILE-1": () => [action],
    "POST plugin-actions/demo/make-note/preview": () => proposal("Make a note from notes.txt"),
  });
  renderApp(<Files />);
  const row = await screen.findByRole("listitem", { name: "notes.txt" });
  const more = await within(row).findByRole("button", { name: "More actions for notes.txt" });
  await user.click(more);
  await user.click(await screen.findByRole("menuitem", { name: "Make a note from this file" }));
  const dialog = await screen.findByRole("dialog", { name: "Make a note from notes.txt" });
  expect(within(dialog).getByText("Note: first line")).toBeInTheDocument();
  expect(calls.find((c) => c.route === "POST plugin-actions/demo/make-note/preview")?.body).toEqual({
    target: { kind: "file", id: "FILE-1" },
    choices: {},
  });
  await user.keyboard("{Escape}");
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  await waitFor(() => expect(more).toHaveFocus());
});

test("actions for the whole workspace are buttons that review with no target", async () => {
  const user = userEvent.setup();
  const calls = fakeApi({
    "GET files": () => [],
    "GET projects": () => [],
    "GET plugin-actions": () => [workspaceAction],
    "POST plugin-actions/demo/tidy/preview": () => ({ ...proposal("Tidy up the workspace"), action: workspaceAction.name }),
  });
  renderApp(<Files />);
  const button = await screen.findByRole("button", { name: "Tidy up" });
  await user.click(button);
  await screen.findByRole("dialog", { name: "Tidy up the workspace" });
  expect(calls.find((c) => c.route === "POST plugin-actions/demo/tidy/preview")?.body).toEqual({ target: null, choices: {} });
  await user.click(screen.getByRole("button", { name: "Cancel" }));
  await waitFor(() => expect(button).toHaveFocus());
});

function editable(extra: Partial<S["FileView"]> = {}) {
  const routes = {
    "GET projects": () => [],
    "GET plugin-actions": () => [],
    "GET plugin-actions?kind=file&id=FILE-1": () => [],
  };
  return { ...routes, "GET files": () => [file("FILE-1", "notes.txt", { description: "Minutes of the harbor visit", ...extra })] };
}

async function openMenu(user: ReturnType<typeof userEvent.setup>) {
  const row = await screen.findByRole("listitem", { name: "notes.txt" });
  await user.click(await within(row).findByRole("button", { name: "More actions for notes.txt" }));
  return row;
}

test("the description typed when the file was added is shown on its row", async () => {
  fakeApi(editable());
  renderApp(<Files />);
  const row = await screen.findByRole("listitem", { name: "notes.txt" });
  expect(within(row).getByText("Minutes of the harbor visit")).toBeInTheDocument();
});

test("a file's menu offers Rename, Edit description and Remove; a kind with no description offers no edit of one", async () => {
  const user = userEvent.setup();
  fakeApi(editable());
  renderApp(<Files />);
  await openMenu(user);
  expect(screen.getAllByRole("menuitem").map((m) => m.textContent)).toEqual(["Rename…", "Edit description…", "Remove"]);
});

test("a kind that keeps no description has no Edit description", async () => {
  const user = userEvent.setup();
  fakeApi(editable({ description: null }));
  renderApp(<Files />);
  await openMenu(user);
  expect(screen.getAllByRole("menuitem").map((m) => m.textContent)).toEqual(["Rename…", "Remove"]);
});

test("Rename opens a field with the cursor in it, renames at once, and Undo puts the name back", async () => {
  const user = userEvent.setup();
  const calls = fakeApi({
    ...editable(),
    "POST files/FILE-1/edit": () => ({ changeset: "CS-1", refused: null }),
    "POST changesets/CS-1/undo": () => ({ undone: 1 }),
  });
  renderApp(<Files />);
  await openMenu(user);
  await user.click(screen.getByRole("menuitem", { name: "Rename…" }));
  const field = await screen.findByRole("textbox", { name: "New name" });
  expect(field).toHaveFocus();
  expect(field).toHaveValue("notes.txt");
  expect(screen.getByRole("button", { name: "Rename" })).toBeDisabled();
  await user.clear(field);
  await user.type(field, "minutes.txt");
  await user.click(screen.getByRole("button", { name: "Rename" }));
  expect(await screen.findByText("Renamed to minutes.txt.")).toBeInTheDocument();
  expect(calls.find((c) => c.route === "POST files/FILE-1/edit")?.body).toEqual({ read_version: 1, name: "minutes.txt" });
  await user.click(screen.getByRole("button", { name: "Undo" }));
  await waitFor(() => expect(calls.map((c) => c.route)).toContain("POST changesets/CS-1/undo"));
});

test("Edit description changes only the description, with Undo", async () => {
  const user = userEvent.setup();
  const calls = fakeApi({ ...editable(), "POST files/FILE-1/edit": () => ({ changeset: "CS-2", refused: null }) });
  renderApp(<Files />);
  await openMenu(user);
  await user.click(screen.getByRole("menuitem", { name: "Edit description…" }));
  const field = await screen.findByRole("textbox", { name: "Description" });
  expect(field).toHaveFocus();
  expect(field).toHaveValue("Minutes of the harbor visit");
  await user.clear(field);
  await user.type(field, "Visit notes");
  await user.click(screen.getByRole("button", { name: "Save" }));
  expect(await screen.findByText("Saved the description of notes.txt.")).toBeInTheDocument();
  expect(calls.find((c) => c.route === "POST files/FILE-1/edit")?.body).toEqual({ read_version: 1, description: "Visit notes" });
  expect(screen.getByRole("button", { name: "Undo" })).toBeInTheDocument();
});

test("Remove acts at once with Undo, and a file something still uses says why it stays", async () => {
  const user = userEvent.setup();
  let refused = true;
  const calls = fakeApi({
    ...editable(),
    "POST files/FILE-1/remove": () => (refused ? { changeset: null, refused: "referred_to" } : { changeset: "CS-3", refused: null }),
  });
  renderApp(<Files />);
  await openMenu(user);
  await user.click(screen.getByRole("menuitem", { name: "Remove" }));
  expect(await screen.findByText("notes.txt can't be removed while something still uses it.")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Undo" })).toBeNull();
  refused = false;
  await openMenu(user);
  await user.click(screen.getByRole("menuitem", { name: "Remove" }));
  expect(await screen.findByText("Removed notes.txt.")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Undo" })).toBeInTheDocument();
  expect(calls.filter((c) => c.route === "POST files/FILE-1/remove").map((c) => c.body)).toEqual([{ read_version: 1 }, { read_version: 1 }]);
});
