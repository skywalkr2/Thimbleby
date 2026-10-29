import "@testing-library/jest-dom/vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { S } from "../lib/api";
import { person, project } from "../lib/records-fixtures";
import { fakeApi, renderApp, type Routes } from "../test-utils";
import { OpenItems } from "./OpenItems";

// A to-do on the list: its title opens its page and reads the same everywhere, and its menu has one Edit with every field.

const action = (over: Partial<S["OpenActionView"]> = {}): S["OpenActionView"] => ({
  id: "A-1",
  version: 3,
  text: "Send the headcount by 2026-11-04.",
  state: "open",
  owners: [{ person: "P-1", name: "Quinn Sample" }],
  due: "2026-11-04",
  project: "PRJ-1",
  project_name: "Harbor",
  parent_name: null,
  notes: null,
  since: "2026-10-01",
  on_hold: null,
  blocker: null,
  duplicate: null,
  origin: null,
  untouched_days: null,
  owner_question: null,
  to_send: false,
  ...over,
});

function serve(over: Partial<S["OpenActionView"]> = {}, extra: Routes = {}) {
  return fakeApi({
    "GET open-items": () => ({ actions: [action(over)], questions: [], stale_days: 21 }),
    "GET people": () => [person("P-1", "Quinn Sample"), person("P-3", "Sam Twin")],
    "GET projects": () => [project("PRJ-1", "Harbor"), project("PRJ-2", "Lighthouse")],
    "POST records/edit": () => ({ changeset: "CS-1" }),
    "POST changesets/CS-1/undo": () => ({ restored: [0], skipped: [] }),
    ...extra,
  });
}

const rowOf = async () => (await within(await screen.findByRole("list", { name: "Open to-dos" })).findAllByRole("listitem"))[0];

async function menuOf(user: ReturnType<typeof userEvent.setup>) {
  const row = await rowOf();
  await user.click(within(row).getByRole("button", { name: /More actions for/ }));
}

test("a to-do's title opens its page", async () => {
  serve();
  renderApp(<OpenItems />);
  const row = await rowOf();
  const link = within(row).getByRole("link", { name: /Send the headcount/ });
  expect(link.getAttribute("href")).toContain("records/action/A-1");
});

test("the title reads the same in the list and in the editor, with no date added to it", async () => {
  const user = userEvent.setup();
  const calls = serve();
  renderApp(<OpenItems />);
  const row = await rowOf();
  expect(within(row).getByRole("link", { name: "Send the headcount." })).toBeInTheDocument();
  await menuOf(user);
  await user.click(await screen.findByRole("menuitem", { name: "Edit" }));
  const title = await screen.findByRole("textbox", { name: "Title" });
  expect(title).toHaveValue("Send the headcount.");
  // Saving with the title as shown changes nothing about it.
  await user.click(screen.getByRole("button", { name: "Cancel" }));
  expect(calls.some((c) => c.route === "POST records/edit")).toBe(false);
});

test("the menu has one Edit, no Edit… and no Change this or Reassign, and Drop is its own red section at the end", async () => {
  const user = userEvent.setup();
  serve();
  renderApp(<OpenItems />);
  await menuOf(user);
  const items = screen.getAllByRole("menuitem").map((m) => m.querySelector('[slot="label"]')?.textContent ?? m.textContent);
  expect(items).toContain("Edit");
  for (const gone of ["Edit…", "Change this", "Reassign…"]) expect(items).not.toContain(gone);
  expect(items[items.length - 1]).toBe("Drop");
  expect(screen.getByRole("menuitem", { name: /^Drop/ })).toHaveAttribute("data-danger");
  expect(screen.getAllByRole("separator").length).toBeGreaterThanOrEqual(1);
});

test("Edit has the title, project, owner and due date, and sends only what changed", async () => {
  const user = userEvent.setup();
  const calls = serve();
  renderApp(<OpenItems />);
  await menuOf(user);
  await user.click(await screen.findByRole("menuitem", { name: "Edit" }));
  const title = await screen.findByRole("textbox", { name: "Title" });
  await waitFor(() => expect(title).toHaveFocus());
  expect(screen.getByRole("combobox", { name: "Project" })).toHaveValue("PRJ-1");
  expect(screen.getByRole("combobox", { name: "Owner" })).toHaveValue("P-1");
  expect(screen.getByLabelText("Due")).toBeInTheDocument();
  await user.selectOptions(screen.getByRole("combobox", { name: "Project" }), "PRJ-2");
  await user.selectOptions(screen.getByRole("combobox", { name: "Owner" }), "P-3");
  await user.click(screen.getByRole("button", { name: "Save" }));
  await waitFor(() =>
    expect(calls.find((c) => c.route === "POST records/edit")?.body).toEqual({
      kind: "action",
      id: "A-1",
      read_version: 3,
      fields: { project: "PRJ-2", owners: [{ person: "P-3" }] },
    }),
  );
});

test("only one editor is open on a to-do at a time: opening another closes the first", async () => {
  const user = userEvent.setup();
  serve();
  renderApp(<OpenItems />);
  await menuOf(user);
  await user.click(await screen.findByRole("menuitem", { name: "Edit" }));
  await screen.findByRole("textbox", { name: "Title" });
  await menuOf(user);
  await user.click(await screen.findByRole("menuitem", { name: "Pause" }));
  await screen.findByRole("textbox", { name: "What is it waiting for?" });
  expect(screen.queryByRole("textbox", { name: "Title" })).toBeNull();
  await menuOf(user);
  await user.click(await screen.findByRole("menuitem", { name: /^Drop/ }));
  await screen.findByRole("textbox", { name: "Why isn't it needed?" });
  expect(screen.queryByRole("textbox", { name: "What is it waiting for?" })).toBeNull();
  expect(screen.getAllByRole("textbox", { name: /./ }).filter((x) => x.closest("form"))).toHaveLength(1);
});

test("Escape closes the open editor, from any field, and the row gets the cursor back", async () => {
  const user = userEvent.setup();
  serve();
  renderApp(<OpenItems />);
  await menuOf(user);
  await user.click(await screen.findByRole("menuitem", { name: "Edit" }));
  const owner = await screen.findByRole("combobox", { name: "Owner" });
  owner.focus();
  await user.keyboard("{Escape}");
  expect(screen.queryByRole("textbox", { name: "Title" })).toBeNull();
  await menuOf(user);
  await user.click(await screen.findByRole("menuitem", { name: "Pause" }));
  const waiting = await screen.findByRole("textbox", { name: "What is it waiting for?" });
  await user.click(screen.getByRole("combobox", { name: "Or pick what it waits on" }));
  await user.keyboard("{Escape}");
  expect(waiting).not.toBeInTheDocument();
});

test("Pause on a to-do that does not repeat asks what it is waiting for", async () => {
  const user = userEvent.setup();
  serve();
  renderApp(<OpenItems />);
  await menuOf(user);
  await user.click(await screen.findByRole("menuitem", { name: "Pause" }));
  expect(await screen.findByRole("textbox", { name: "What is it waiting for?" })).toBeInTheDocument();
  expect(screen.getByRole("combobox", { name: "Or pick what it waits on" })).toBeInTheDocument();
});

test("a repeating chore's Pause does not ask what it is waiting for", async () => {
  const user = userEvent.setup();
  const calls = serve(
    { repeat: { phrase: "every Monday", rule: "FREQ=WEEKLY;BYDAY=MO", start: "2026-11-02", shape: { kind: "weekly", interval: 1, weekday: "monday", weekdays: [], days: [], ordinals: [] } } as S["OpenActionView"]["repeat"] },
    { "POST actions/A-1/hold": () => ({ ok: "A-1", previous: null }) },
  );
  renderApp(<OpenItems />);
  await menuOf(user);
  await user.click(await screen.findByRole("menuitem", { name: "Pause" }));
  const field = await screen.findByRole("textbox", { name: "Paused until when?" });
  expect(screen.queryByText("What is it waiting for?")).toBeNull();
  expect(screen.queryByRole("combobox", { name: "Or pick what it waits on" })).toBeNull();
  await user.type(field, "away until January");
  await user.click(screen.getByRole("button", { name: "Pause" }));
  await waitFor(() => expect(calls.find((c) => c.route === "POST actions/A-1/hold")?.body).toEqual({ waiting_for: "away until January" }));
});

test("a typed to-do has no Where it came from, and one that came from a note or mail does", async () => {
  serve({ origin: null });
  const first = renderApp(<OpenItems />);
  const typed = await rowOf();
  expect(within(typed).queryByText("Where it came from")).toBeNull();
  first.unmount();
  serve({ origin: { kind: "source", source: "S-1" } });
  renderApp(<OpenItems />);
  expect(within(await rowOf()).getByRole("button", { name: "Where it came from" })).toBeInTheDocument();
});
