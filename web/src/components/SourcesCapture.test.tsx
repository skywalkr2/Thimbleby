import "@testing-library/jest-dom/vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { S } from "../lib/api";
import { fakeApi, renderApp } from "../test-utils";
import { Sources } from "./Sources";

// A mail source can hold the person's own capture (design 6.32): everything in a folder or label they move mail to, or mail to an
// address of theirs. It is a setting on the source, offered from Connections in the source's own form, and only a mail source has it.

type Source = S["WatchSourceView"];

const source = (id: string, extra: Partial<Source> = {}): Source => ({
  id,
  label: `Source ${id}`,
  connector: "mailbox",
  connector_label: "A mailbox",
  enabled: true,
  every_minutes: 15,
  items: 0,
  last: null,
  read_at: null,
  failures: 0,
  problem: null,
  reads: ["mail"],
  ...extra,
});

function open(sources: Source[]) {
  const calls = fakeApi({
    "GET watch": () => sources,
    "GET watch/kinds": () => ["folder", "mailbox"].map((name) => ({ name, label: name, plugin: null, items: [], first_run: "baseline" as const })),
    "GET settings": () => ({ fingerprint: "fp-1", items: [] }),
    "GET projects": () => [],
    "GET watch/authors": () => [],
    "POST watch/sources/notes": () => ({ changes: [{ key: "watch.sources", before: [], after: [], was_default: false, is_default: false }], fingerprint: "fp-2", needs_restart: false }),
  });
  renderApp(<Sources onAsk={vi.fn()} />);
  return calls;
}

async function change(user: ReturnType<typeof userEvent.setup>, label: string) {
  const item = await screen.findByRole("listitem", { name: label });
  await user.click(within(item).getByRole("button", { name: `More actions for ${label}` }));
  await user.click(await screen.findByRole("menuitem", { name: "Change" }));
  return screen.findByRole("form", { name: `Change ${label}` });
}

test("a mail source's form offers its own capture: a box for everything in it and an address", async () => {
  const user = userEvent.setup();
  open([source("notes")]);
  const form = await change(user, "Source notes");
  const group = within(form).getByRole("group", { name: "Your own capture" });
  expect(within(group).getByRole("checkbox", { name: "Everything in it is mail I send myself to keep track of" })).not.toBeChecked();
  expect(within(group).getByLabelText("Capture address")).toHaveValue("");
  expect(within(group).getByText(/Mail from anyone else is read as usual, as outside content\./)).toBeInTheDocument();
});

test("a source that is not mail has no capture to set", async () => {
  const user = userEvent.setup();
  open([source("plain", { connector: "folder", reads: [] })]);
  expect(within(await change(user, "Source plain")).queryByRole("group", { name: "Your own capture" })).toBeNull();
});

test("what is saved shows when the form opens, and a change sends only what the person changed", async () => {
  const user = userEvent.setup();
  const calls = open([source("notes", { capture: true, capture_address: "name+capture@example.com" })]);
  const form = await change(user, "Source notes");
  expect(within(form).getByRole("checkbox", { name: /Everything in it is mail I send myself/ })).toBeChecked();
  expect(within(form).getByLabelText("Capture address")).toHaveValue("name+capture@example.com");
  await user.click(within(form).getByRole("checkbox", { name: /Everything in it is mail I send myself/ }));
  await user.click(within(form).getByRole("button", { name: "Save changes" }));
  await waitFor(() => expect(calls.find((c) => c.route === "POST watch/sources/notes")).toBeDefined());
  const body = calls.find((c) => c.route === "POST watch/sources/notes")?.body as Record<string, unknown>;
  expect(body.capture).toBe(false);
  expect("capture_address" in body).toBe(false);
});

test("an address typed is saved with the source and cleared by emptying it", async () => {
  const user = userEvent.setup();
  const calls = open([source("notes")]);
  const form = await change(user, "Source notes");
  await user.type(within(form).getByLabelText("Capture address"), "name+capture@example.com");
  await user.click(within(form).getByRole("button", { name: "Save changes" }));
  await waitFor(() => expect(calls.find((c) => c.route === "POST watch/sources/notes")).toBeDefined());
  expect(calls.find((c) => c.route === "POST watch/sources/notes")?.body).toMatchObject({ capture_address: "name+capture@example.com", fingerprint: "fp-1" });
});
