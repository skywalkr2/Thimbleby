import "@testing-library/jest-dom/vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { S } from "../lib/api";
import { fakeApi, renderApp } from "../test-utils";
import { privacyFact, Sources } from "./Sources";

// A connection's privacy follows the side it serves (design 6.32, 7.15): its row says how private what it holds is and why,
// and its Change form sets one of its own or goes back to following its side.

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
  data_level: "restricted",
  data_level_from: "side",
  data_level_sides: ["Personal"],
  data_level_side_level: "restricted",
  ...extra,
});

function open(sources: Source[]) {
  const calls = fakeApi({
    "GET watch": () => sources,
    "GET watch/kinds": () => [{ name: "mailbox", label: "mailbox", plugin: null, items: [], first_run: "baseline" as const }],
    "GET settings": () => ({ fingerprint: "fp-1", items: [] }),
    "GET projects": () => [],
    "GET watch/authors": () => [],
    "POST watch/sources/a": () => ({ changes: [{ key: "watch.sources", before: [], after: [], was_default: false, is_default: false }], fingerprint: "fp-2", needs_restart: false }),
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

const t = (key: string, vars?: Record<string, string | number>) => {
  const words: Record<string, string> = {
    "sources.level.restricted": "Private",
    "sources.level.internal": "Confidential",
    "sources.privacy.plain": "Privacy: {level}",
    "sources.privacy.own": "Privacy: {level}, as you set it",
    "sources.privacy.side": "Privacy: {level}, because it serves {sides}",
  };
  return (words[key] ?? key).replace(/\{(\w+)\}/g, (_, name: string) => String(vars?.[name] ?? ""));
};

test("the row says how private it is and which side it follows", async () => {
  open([source("a")]);
  const item = await screen.findByRole("listitem", { name: "Source a" });
  expect(within(item).getByText(/Privacy: Private, because it serves Personal/)).toBeInTheDocument();
});

test("a level the person set is said as theirs, and one nobody set says only the level", () => {
  expect(privacyFact(source("a", { data_level: "internal", data_level_from: "source", data_level_own: "internal" }), t)).toBe("Privacy: Confidential, as you set it");
  expect(privacyFact(source("a", { data_level: "internal", data_level_from: "default", data_level_sides: [] }), t)).toBe("Privacy: Confidential");
});

test("the form offers following the side first, then the three levels, and shows the connection's own pick", async () => {
  const user = userEvent.setup();
  open([source("a", { data_level: "internal", data_level_from: "source", data_level_own: "internal", data_level_sides: [] })]);
  const form = await change(user, "Source a");
  const pick = within(form).getByLabelText("Privacy");
  expect(within(pick).getAllByRole("option").map((o) => o.textContent)).toEqual(["Like what it serves (Private)", "Open", "Confidential", "Private"]);
  expect(pick).toHaveValue("internal");
});

test("choosing a level saves it with the connection, and following its side sends none", async () => {
  const user = userEvent.setup();
  const calls = open([source("a")]);
  const form = await change(user, "Source a");
  const pick = within(form).getByLabelText("Privacy");
  expect(pick).toHaveValue("");
  await user.selectOptions(pick, "Open");
  await user.click(within(form).getByRole("button", { name: "Save changes" }));
  await waitFor(() => expect(calls.find((c) => c.route === "POST watch/sources/a")?.body).toMatchObject({ data_level: "open", fingerprint: "fp-1" }));
});

test("making a connection less private says what that lets through before it is saved, and making it more private does not", async () => {
  const user = userEvent.setup();
  open([source("a")]);
  const form = await change(user, "Source a");
  const pick = within(form).getByLabelText("Privacy");
  expect(within(form).queryByText(/Making this/)).toBeNull();
  await user.selectOptions(pick, "Open");
  expect(within(form).getByRole("status")).toHaveTextContent("Making this open lets every AI account you have allowed for open material read what it brings in.");
  await user.selectOptions(pick, "Confidential");
  expect(within(form).getByRole("status")).toHaveTextContent("Making this confidential lets every AI account you have allowed for confidential material read what it brings in.");
  await user.selectOptions(pick, "Private");
  expect(within(form).queryByText(/Making this/)).toBeNull();
  await user.selectOptions(pick, "");
  expect(within(form).queryByText(/Making this/)).toBeNull();
});

test("a connection that serves no side offers the usual level instead, and saving without touching it sends no level", async () => {
  const user = userEvent.setup();
  const calls = open([source("a", { data_level: "internal", data_level_from: "default", data_level_sides: [], data_level_side_level: null })]);
  const form = await change(user, "Source a");
  expect(within(within(form).getByLabelText("Privacy")).getAllByRole("option")[0]).toHaveTextContent("The usual for connections");
  await user.click(within(form).getByRole("button", { name: "Save changes" }));
  await waitFor(() => expect(calls.some((c) => c.route === "POST watch/sources/a")).toBe(true));
  expect(calls.find((c) => c.route === "POST watch/sources/a")?.body).not.toHaveProperty("data_level");
});
