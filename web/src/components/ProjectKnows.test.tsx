import "@testing-library/jest-dom/vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { S } from "../lib/api";
import { monthDay } from "../lib/dates";
import { Refuse, fakeApi, renderApp, type Routes } from "../test-utils";
import { ProjectKnows } from "./ProjectKnows";

// What the assistant knows about a project (design 7.18), on its page: where its inputs come from and the last of each,
// its facts with who they rest on and when (answer 29), the terms used there, who answers what, and what is still unknown
// with the question asked for it. One row per thing; a part with nothing in it is not shown, and a page with nothing in any
// of them says so in one plain line.

type View = S["ProjectKnowsView"];

const WEB = "https://";

const knows = (over: Partial<View> = {}): View => ({
  id: "PRJ-1",
  name: "Harbor",
  sources: [],
  facts: [],
  terms: [],
  routing: [],
  unknown: [],
  area: false,
  reading: { state: "none", levels: [], readers: [] },
  ...over,
});

const FULL = knows({
  sources: [
    { key: "kind:pasted", label: null, kind: "pasted", inputs: 3, last: { id: "SRC-3", title: "Thursday notes", received_at: "2026-10-12T09:00:00Z" } },
    { key: "watch:folder", label: "Production folder", kind: null, inputs: 1, last: { id: "SRC-4", title: "Press schedule", received_at: "2026-10-09T09:00:00Z" } },
  ],
  facts: [
    { id: "FACT-1", version: 2, text: "Trim size is fixed.", key: true, source: { basis: "person", on: "2026-10-08", origin: { kind: "source", source: "SRC-1" } } },
    { id: "FACT-2", version: 4, text: "Both spines are in the folder.", key: false, source: { basis: "inferred", kind: "email", sender: "Robin Sample", on: "2026-10-12", origin: { kind: "source", source: "SRC-2" } } },
    { id: "FACT-3", version: 1, text: "The proof is approved.", key: false, source: { basis: null, on: null, origin: null } },
  ],
  terms: [
    { id: "GLOSS-1", term: "Bleed", meaning: "the part of the art that is trimmed off", confidence: "confirmed" },
    { id: "GLOSS-2", term: "Gutter", meaning: "the inner margin", confidence: "assumed" },
    { id: "GLOSS-3", term: "Folio", meaning: "not known yet", confidence: "unknown" },
  ],
  routing: [
    { id: "ROUTE-1", topic: "Printing", who: "Robin Sample", negative: false, look_up: null },
    { id: "ROUTE-2", topic: "Legal", who: "Dara Keene", negative: true, look_up: "the style sheet" },
  ],
  unknown: [
    { kind: "term", field: null, term: "Folio", entry: "GLOSS-3", question: { id: "Q-1", title: "What does folio mean here?", to: "PER-1", to_name: "Robin Sample", status: "open", asked_on: "2026-10-12" } },
  ],
});

function show(view: View, routes: Routes = {}) {
  const calls = fakeApi({ "GET projects/PRJ-1/knows": () => view, ...routes });
  renderApp(<ProjectKnows id="PRJ-1" />);
  return calls;
}

const section = (name: string) => screen.findByRole("region", { name });

test("a section for each part, headed by what the assistant knows, each row one thing", async () => {
  show(FULL);
  expect(await screen.findByRole("heading", { level: 2, name: "What Helper knows" })).toBeInTheDocument();
  await section("Sources");
  const titles = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
  expect(titles).toEqual(["Sources", "Facts", "Terms used here", "Who answers what", "Still unknown"]);
  // Who reads it is one plain line under the heading, not a part of its own.
  expect(screen.queryByRole("region", { name: "Who reads it" })).toBeNull();
  expect(screen.getByText("Who reads it:", { exact: false })).toBeInTheDocument();
});

test("each source says how many inputs it gave and the last one, which opens", async () => {
  show(FULL);
  const sources = await section("Sources");
  const rows = within(sources).getAllByRole("listitem");
  expect(rows[0]).toHaveTextContent("Pasted notes");
  expect(rows[0]).toHaveTextContent(`3 inputs · last ${monthDay("2026-10-12")}`);
  expect(within(rows[0]).getByRole("button", { name: "Thursday notes" })).toBeInTheDocument();
  expect(rows[1]).toHaveTextContent("Production folder");
  expect(rows[1]).toHaveTextContent(`1 input · last ${monthDay("2026-10-09")}`);
});

test("a fact has its source label in the meta line, key facts are marked, and what was worked out is Inferred with Confirm it", async () => {
  const user = userEvent.setup();
  const calls = show(FULL, {
    "POST records/edit": () => ({ changeset: "CS-5" }),
    "POST changesets/CS-5/undo": () => ({ restored: [0], skipped: [] }),
  });
  const facts = await section("Facts");
  const rows = within(facts).getAllByRole("listitem");
  expect(rows).toHaveLength(3);
  expect(within(rows[0]).getByText("Key")).toBeInTheDocument();
  expect(within(rows[0]).getByRole("button", { name: `from you, ${monthDay("2026-10-08")}` })).toBeInTheDocument();
  expect(within(rows[0]).queryByText("Inferred")).toBeNull();
  const inferred = rows[1].querySelector("[data-fact-source]") as HTMLElement;
  expect(inferred.querySelector("[data-inferred]")).not.toBeNull();
  expect(inferred).toHaveTextContent(`Helper inferred this from Robin Sample's email, ${monthDay("2026-10-12")}`);
  expect(within(inferred).getByText("Inferred by the assistant, not stated")).toBeInTheDocument();
  expect(getComputedStyle(inferred).fontStyle).not.toBe("italic");
  // a fact with no source and no day says it was recorded, with nothing made up
  expect(rows[2]).toHaveTextContent("recorded");
  await user.click(within(inferred).getByRole("button", { name: "Confirm it" }));
  await waitFor(() =>
    expect(calls.find((c) => c.route === "POST records/edit")?.body).toEqual({ kind: "fact", id: "FACT-2", fields: { basis: "person" }, read_version: 4 }),
  );
  expect(await screen.findByText("Confirmed. It is now from you.")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Undo" }));
  await waitFor(() => expect(calls.some((c) => c.route === "POST changesets/CS-5/undo")).toBe(true));
});

test("the source label is kept out of what is copied: it is its own marked element and the fact's text stands alone", async () => {
  show(FULL);
  const facts = await section("Facts");
  for (const row of within(facts).getAllByRole("listitem")) {
    const label = row.querySelector("[data-fact-source]") as HTMLElement;
    expect(label.closest("[data-copy='never']")).not.toBeNull();
    const copyable = row.cloneNode(true) as HTMLElement;
    copyable.querySelectorAll("[data-copy='never']").forEach((el) => el.remove());
    expect(copyable.textContent?.replace(/\s+/g, " ").trim()).toMatch(/^(Key)?(Trim size is fixed\.|Both spines are in the folder\.|The proof is approved\.)$/);
  }
});

test("each term is marked confirmed, assumed or not known yet, and a term not known has no made-up meaning", async () => {
  show(FULL);
  const terms = await section("Terms used here");
  const rows = within(terms).getAllByRole("listitem");
  expect(rows[0]).toHaveTextContent("Bleed");
  expect(rows[0]).toHaveTextContent("the part of the art that is trimmed off");
  expect(within(rows[0]).getByText("Confirmed")).toBeInTheDocument();
  expect(within(rows[1]).getByText("Assumed")).toBeInTheDocument();
  expect(within(rows[2]).getByText("Not known yet")).toBeInTheDocument();
  expect(rows[2].textContent).not.toContain("not known yet");
});

test("who answers what names the person or team, or says who doesn't and where to look instead", async () => {
  show(FULL);
  const routing = await section("Who answers what");
  const rows = within(routing).getAllByRole("listitem");
  expect(rows[0]).toHaveTextContent("Printing");
  expect(rows[0]).toHaveTextContent("Robin Sample answers");
  expect(rows[1]).toHaveTextContent("Legal");
  expect(rows[1]).toHaveTextContent("Dara Keene doesn't answer this · Look it up: the style sheet");
});

test("what is still unknown lists only what a question was asked about, with who was asked and the day", async () => {
  show(FULL);
  const unknown = await section("Still unknown");
  const rows = within(unknown).getAllByRole("listitem");
  expect(rows).toHaveLength(1);
  expect(rows[0]).toHaveTextContent("What “Folio” means isn't known");
  expect(within(rows[0]).getByRole("link", { name: "What does folio mean here?" })).toHaveAttribute("href", expect.stringContaining("question"));
  expect(rows[0]).toHaveTextContent("Asked Robin Sample on Oct 12");
  expect(unknown.textContent).not.toContain("Nobody has been asked");
});

test("a project nothing is known about shows no empty part, only one line that says so and who reads it", async () => {
  show(knows());
  expect(await screen.findByText("Helper doesn't know anything here yet; it learns from what comes in and what you tell it.")).toBeInTheDocument();
  expect(screen.queryAllByRole("heading", { level: 3 })).toHaveLength(0);
  expect(screen.queryByText(/Nothing has come in|No facts are recorded|No terms are used|No one is named|Nothing is unknown/)).toBeNull();
  expect(screen.getByText("Who reads it:", { exact: false })).toBeInTheDocument();
});

test("only the parts that have something are shown, and the line saying nothing is known goes away", async () => {
  show(knows({ terms: [{ id: "GLOSS-1", term: "Bleed", meaning: "the part trimmed off", confidence: "confirmed" }] }));
  await section("Terms used here");
  expect(screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual(["Terms used here"]);
  expect(screen.queryByText(/doesn't know anything here yet/)).toBeNull();
});

test("a load that fails says so with Try again", async () => {
  const user = userEvent.setup();
  let fail = true;
  fakeApi({ "GET projects/PRJ-1/knows": () => (fail ? new Refuse(500, "no") : FULL) });
  renderApp(<ProjectKnows id="PRJ-1" />);
  expect(await screen.findByText("What Helper knows about this project couldn't be loaded.")).toBeInTheDocument();
  fail = false;
  await user.click(screen.getByRole("button", { name: "Try again" }));
  expect(await section("Sources")).toBeInTheDocument();
});

test("the page says in one line which accounts read the project and whether anything leaves the computer", async () => {
  show(knows({ area: true, reading: { state: "local", levels: ["private"], readers: [{ account: "localbox", name: "Local server", leaves: false }] } }));
  const line = (await screen.findByText("Who reads it:", { exact: false })).closest("p")!;
  expect(line).toHaveTextContent("Read by Local server, which runs on this computer: nothing from it leaves this computer.");
  expect(line).toHaveTextContent("Its material is marked private.");
  expect(screen.getByText("An area of your life: it never finishes, so it has no end day and is never behind.")).toBeInTheDocument();
  // One line, not a card with a list of accounts.
  expect(line.closest("ul")).toBeNull();
  expect(screen.queryByRole("list")).toBeNull();
});

test("an account that sends what it reads away is named as such, and no account at all says nothing is sent", async () => {
  show(knows({ reading: { state: "away", levels: [], readers: [{ account: "hosted", name: "Hosted service", leaves: true }] } }));
  expect(await screen.findByText("Read by Hosted service. What it reads is sent away from this computer to reach it.", { exact: false })).toBeInTheDocument();
});

test("when no account may read it, the page says nothing from it is sent anywhere", async () => {
  show(knows({ reading: { state: "none", levels: ["private"], readers: [] } }));
  expect(await screen.findByText("No AI account of yours may read this, so nothing from it is sent anywhere.", { exact: false })).toBeInTheDocument();
});

test("a fact from mail with a local address shows a short label, never the full address, and an outside link its real domain", async () => {
  const local = { kind: "link" as const, url: "http://127.0.0.1:8765/#mail/MSG-7", source: "SRC-7" };
  const outside = { kind: "link" as const, url: `${WEB}pages.example.com/p/12`, source: "SRC-8" };
  show(
    knows({
      facts: [
        { id: "FACT-7", version: 1, text: "The parcel arrives Friday.", key: false, source: { basis: "said", kind: "email", title: "Your parcel", on: "2026-10-12", origin: local } },
        { id: "FACT-8", version: 1, text: "The page is current.", key: false, source: { basis: "said", kind: "calendar", on: "2026-10-12", origin: outside } },
      ],
    }),
  );
  const facts = await section("Facts");
  expect(within(facts).getByText("Mail · Your parcel")).toBeInTheDocument();
  expect(within(facts).queryByText(/127\.0\.0\.1/)).toBeNull();
  expect(within(facts).getByText(/pages\.example\.com/)).toBeInTheDocument();
});

describe("the accounts that may read an area", () => {
  const choices: S["ReaderChoice"][] = [
    { account: "localbox", name: "Local server", reads: true, leaves: false },
    { account: "hosted", name: "Hosted service", reads: true, leaves: true },
    { account: "stub", name: "Stand-in account", reads: false, leaves: true, locked: "parent" },
  ];
  const area = (over: Partial<S["ProjectReading"]> = {}, choose = choices) =>
    knows({ area: true, reading: { state: "away", levels: [], readers: [{ account: "localbox", name: "Local server", leaves: false }], choices: choose, ...over } });

  test("each account is a box ticked when it may read the area, saying in words whether reading sends it away", async () => {
    show(area());
    const group = await screen.findByRole("group", { name: "Accounts that may read this area" });
    expect(within(group).getByRole("checkbox", { name: "Local server: stays on this computer" })).toBeChecked();
    expect(within(group).getByRole("checkbox", { name: "Hosted service: sends it away from this computer" })).toBeChecked();
    const locked = within(group).getByRole("checkbox", { name: "Stand-in account: sends it away from this computer" });
    expect(locked).not.toBeChecked();
    expect(locked).toBeDisabled();
    expect(within(group).getByText("kept out by the privacy of the project above this area")).toBeInTheDocument();
  });

  test("unticking an account saves who may read the area at once, and Undo asks for who read it before", async () => {
    const user = userEvent.setup();
    const after: S["ProjectReading"] = { state: "local", levels: ["area-harbor"], readers: [{ account: "localbox", name: "Local server", leaves: false }], choices: choices.map((c) => (c.account === "hosted" ? { ...c, reads: false } : c)) };
    const calls = show(area(), { "POST projects/PRJ-1/readers": () => after });
    await user.click(await screen.findByRole("checkbox", { name: "Hosted service: sends it away from this computer" }));
    await waitFor(() => expect(calls.filter((c) => c.route === "POST projects/PRJ-1/readers")).toHaveLength(1));
    expect(calls.find((c) => c.route === "POST projects/PRJ-1/readers")?.body).toEqual({ accounts: ["localbox"] });
    expect(await screen.findByText("Changed which accounts may read Harbor.")).toBeInTheDocument();
    await user.click(await screen.findByRole("button", { name: "Undo" }));
    await waitFor(() => expect(calls.filter((c) => c.route === "POST projects/PRJ-1/readers")).toHaveLength(2));
    expect(calls.filter((c) => c.route === "POST projects/PRJ-1/readers")[1].body).toEqual({ accounts: ["localbox", "hosted"] });
  });

  test("a refusal says why and a project that isn't an area has no boxes", async () => {
    const user = userEvent.setup();
    show(area(), { "POST projects/PRJ-1/readers": () => new Refuse(409, "Local server can't read this area") });
    await user.click(await screen.findByRole("checkbox", { name: "Local server: stays on this computer" }));
    expect(await screen.findByText(/Local server can't read this area/)).toBeInTheDocument();
  });

  test("a project that is not an area offers no choice of accounts", async () => {
    show(knows({ area: false, reading: { state: "away", levels: [], readers: [], choices: [] } }));
    await screen.findByText("Who reads it:", { exact: false });
    expect(screen.queryByRole("group", { name: "Accounts that may read this area" })).toBeNull();
  });
});
