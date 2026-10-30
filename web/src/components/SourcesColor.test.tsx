import "@testing-library/jest-dom/vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { S } from "../lib/api";
import { fakeApi, renderApp } from "../test-utils";
import { Sources } from "./Sources";

// A calendar can carry a color for its mark on the schedule, picked from a short named list in the source's own form.
// Only a calendar has the field; the color is optional and can be taken away again.

type Source = S["WatchSourceView"];

const source = (id: string, extra: Partial<Source> = {}): Source => ({
  id,
  label: `Source ${id}`,
  connector: "folder",
  connector_label: "A folder",
  enabled: true,
  every_minutes: 15,
  items: 0,
  last: null,
  read_at: null,
  failures: 0,
  problem: null,
  reads: [],
  ...extra,
});

const NAMES = ["Blue", "Teal", "Green", "Orange", "Red", "Pink", "Purple", "Gray"];

function open(sources: Source[], extra: Record<string, (b: unknown) => unknown> = {}) {
  const calls = fakeApi({
    "GET watch": () => sources,
    "GET watch/kinds": () => ["folder", "calendar", "mailbox"].map((name) => ({ name, label: name, plugin: null, items: [], first_run: "baseline" as const })),
    "GET settings": () => ({ fingerprint: "fp-1", items: [] }),
    "GET projects": () => [],
    "GET watch/authors": () => [],
    "POST watch/sources/cal": () => ({ changes: [{ key: "watch.sources", before: [], after: [], was_default: false, is_default: false }], fingerprint: "fp-2", needs_restart: false }),
    ...extra,
  });
  renderApp(<Sources onAsk={vi.fn()} />);
  return calls;
}

async function change(user: ReturnType<typeof userEvent.setup>, label: string) {
  const item = await screen.findByRole("row", { name: label });
  await user.click(within(item).getByRole("button", { name: `More actions for ${label}` }));
  await user.click(await screen.findByRole("menuitem", { name: "Change" }));
  return screen.findByRole("form", { name: `Change ${label}` });
}

test("a calendar's form offers its color as a list of names, with no color first", async () => {
  const user = userEvent.setup();
  open([source("cal", { connector: "calendar", reads: ["calendar"] })]);
  const form = await change(user, "Source cal");
  const pick = within(form).getByLabelText("Color on the schedule");
  expect(pick.tagName).toBe("SELECT");
  expect(within(pick).getAllByRole("option").map((o) => o.textContent)).toEqual(["No color", ...NAMES]);
  expect(pick).toHaveValue("");
  expect(within(form).getByText(/The name is always shown too\./)).toBeInTheDocument();
});

test("a source that is not a calendar has no color to pick", async () => {
  const user = userEvent.setup();
  open([source("a"), source("m", { connector: "mailbox", reads: ["mail"] })]);
  expect(within(await change(user, "Source a")).queryByLabelText("Color on the schedule")).toBeNull();
});

test("the picked color is saved with the source, and the saved one is shown when the form opens", async () => {
  const user = userEvent.setup();
  const calls = open([source("cal", { connector: "calendar", reads: ["calendar"], color: "purple" })]);
  const form = await change(user, "Source cal");
  expect(within(form).getByLabelText("Color on the schedule")).toHaveValue("purple");
  await user.selectOptions(within(form).getByLabelText("Color on the schedule"), "Teal");
  await user.click(within(form).getByRole("button", { name: "Save changes" }));
  await waitFor(() => expect(calls.find((c) => c.route === "POST watch/sources/cal")?.body).toMatchObject({ color: "teal", fingerprint: "fp-1" }));
});

test("choosing no color sends none, which takes the saved one away", async () => {
  const user = userEvent.setup();
  const calls = open([source("cal", { connector: "calendar", reads: ["calendar"], color: "blue" })]);
  const form = await change(user, "Source cal");
  await user.selectOptions(within(form).getByLabelText("Color on the schedule"), "No color");
  await user.click(within(form).getByRole("button", { name: "Save changes" }));
  await waitFor(() => expect(calls.find((c) => c.route === "POST watch/sources/cal")?.body).toMatchObject({ color: null }));
});
