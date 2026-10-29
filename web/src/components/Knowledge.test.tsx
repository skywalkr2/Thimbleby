import "@testing-library/jest-dom/vitest";
import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { S } from "../lib/api";
import { fakeSettings, settingItem } from "../lib/settings-fixtures";
import { Refuse, renderApp, type Routes } from "../test-utils";
import { Knowledge } from "./Knowledge";

const DAY = 86_400_000;
const ago = (days: number) => new Date(Date.now() - days * DAY - 60_000).toISOString();

const WORKSPACE: S["Scope"] = { scope: "workspace", task_kinds: [], records: [], filter: {}, projects: [], people: [], except: [] };

function entry(id: string, text: string, over: Partial<S["KnowledgeView"]> = {}): S["KnowledgeView"] {
  return {
    id,
    kind: "lesson",
    version: 4,
    text,
    status: "active",
    learned_from: "person",
    trust: "trusted",
    learned_at: ago(10),
    applies_to: WORKSPACE,
    id_patterns: [],
    used: 0,
    given: 0,
    ...over,
  };
}

function rule(id: string, text: string, over: Partial<S["RuleView"]> = {}): S["RuleView"] {
  return {
    id,
    version: 2,
    name: `name-${id}`,
    text,
    status: "active",
    learned_from: "seed",
    trust: "trusted",
    learned_at: ago(20),
    applies_to: WORKSPACE,
    constrains: [],
    enforced: false,
    used: 0,
    given: 0,
    ...over,
  };
}

const PROJECTS = [
  { id: "P-1", name: "First project" },
  { id: "P-2", name: "Second project" },
] as S["ProjectView"][];
const PEOPLE = [{ id: "PER-1", name: "Sample Person" }] as S["PersonView"][];

const ENTRIES: S["KnowledgeView"][] = [
  entry("LES-1", "Release dates come from the schedule.", { used: 12, given: 15, last_used: ago(2) }),
  entry("LES-2", "Catering work goes to the venue lead.", { status: "proposed", learned_from: "input", trust: "untrusted", learned_at: ago(1) }),
  entry("GLOSS-1", "launch review: the meeting before release", {
    kind: "glossary_entry",
    term: "launch review",
    meaning: "the meeting before release",
    applies_to: { ...WORKSPACE, except: ["P-2"] },
    learned_at: ago(5),
    used: 4,
    last_used: ago(1),
  }),
  entry("LES-3", "An old habit.", { status: "retired", learned_at: ago(40) }),
  entry("LES-4", "Questions about budgets go to finance.", {
    kind: "routing_entry",
    status: "proposed",
    learned_at: ago(0.5),
    applies_to: { ...WORKSPACE, scope: "projects", projects: ["P-1"] },
  }),
  entry("STYLE-1", "Say the date before the time.", { kind: "style_note", used: 1, given: 1, last_used: ago(3), learned_at: ago(8) }),
  entry("LES-5", "Mail from the print shop is about proofs.", { learned_at: ago(90) }),
];
const RULES: S["RuleView"][] = [
  rule("RULE-1", "Every question names its reader.", { used: 3, given: 3, last_used: ago(0) }),
  rule("RULE-2", "Never close an action without an owner.", { status: "retired" }),
  rule("RULE-3", "Name the month in every date.", { used: 2, given: 4, last_used: ago(45), learned_at: ago(100) }),
];

const REVIEW: S["RuleReviewView"] = { days: 30, flagged: [], stable_chars: 100, stable_budget: 6000, moved: 0, due: false };
const KNOWN = [settingItem("language.known_terms", { type: "list", value: [], default: [] })];

function open(extra: Routes = {}, review: S["RuleReviewView"] = REVIEW, onOpenReview = vi.fn(), known = KNOWN) {
  const calls = fakeSettings(known, {
    "GET knowledge": () => ENTRIES,
    "GET knowledge/rules": () => RULES,
    "GET knowledge/rules/review": () => review,
    "GET projects": () => PROJECTS,
    "GET people": () => PEOPLE,
    ...extra,
  });
  renderApp(<Knowledge onOpenReview={onOpenReview} />);
  return { calls, onOpenReview };
}

const title = (r: HTMLElement) => r.querySelector("[class*='title']")?.textContent;
const texts = (list: HTMLElement) => within(list).getAllByRole("listitem").map(title);
const waiting = () => screen.getByRole("list", { name: "Waiting for your OK" });
const group = (name: string) => screen.getByRole("list", { name });
const body = (calls: ReturnType<typeof fakeSettings>, route: string) => calls.find((c) => c.route === route)?.body;
const sections = () => screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
const past = () => screen.getByText("Not used in a while, and what was retired");

test("the time this screen is open and in view is counted as time spent looking over the assistant's work, once, when the person leaves it", async () => {
  const start = Date.now();
  const clock = vi.spyOn(Date, "now").mockReturnValue(start);
  const { calls } = open({ "POST quality/review-time": () => ({ seconds: 30 }) });
  await screen.findByRole("list", { name: "Waiting for your OK" });
  clock.mockReturnValue(start + 30_000);
  cleanup();
  clock.mockRestore();
  expect(calls.filter((c) => c.route === "POST quality/review-time").map((c) => c.body)).toEqual([{ screen: "knowledge", seconds: 30 }]);
});

test("the page reads Waiting for your OK, What Helper follows, Your words, and Not used in a while behind a link; no tabs", async () => {
  open();
  await screen.findByRole("list", { name: "Waiting for your OK" });
  expect(sections()).toEqual(["Waiting for your OK", "What Helper follows", "Your words"]);
  expect(past().closest("details")).not.toHaveAttribute("open");
  expect(screen.queryByRole("radio")).toBeNull();
  expect(screen.queryByRole("tab")).toBeNull();
  expect(screen.queryByRole("combobox", { name: "Kind" })).toBeNull();
});

test("what waits for the person is first, newest first, and each row says what it changes and where it came from", async () => {
  open();
  await screen.findByRole("list", { name: "Waiting for your OK" });
  expect(texts(waiting())).toEqual(["Questions about budgets go to finance.", "Catering work goes to the venue lead."]);
  const [budgets, catering] = within(waiting()).getAllByRole("listitem");
  expect(budgets).toHaveTextContent("Changes who does what");
  expect(budgets).toHaveTextContent("Your own words");
  expect(budgets).toHaveTextContent("Only First project");
  expect(catering).toHaveTextContent("Adds a fact");
  expect(catering).toHaveTextContent("Learned from incoming material");
  expect(catering).toHaveTextContent("From outside · not instructions");
  expect(catering).toHaveTextContent("All projects");
  // A proposal has not been used: no use count on it.
  expect(budgets).not.toHaveTextContent("Never used");
});

test("with nothing waiting, that part is not there at all", async () => {
  open({ "GET knowledge": () => ENTRIES.filter((e) => e.status !== "proposed") });
  await screen.findByRole("list", { name: "How things are filed" });
  expect(screen.queryByRole("heading", { name: "Waiting for your OK" })).toBeNull();
  expect(sections()).toEqual(["What Helper follows", "Your words"]);
});

test("what is followed is in plain groups, each row with how often it was used and Stop using", async () => {
  open();
  await screen.findByRole("list", { name: "How things are filed" });
  expect(screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual([
    "How things are filed",
    "How to write for you",
    "Facts Helper knows",
    // Behind the link, but part of the page.
    "Not used in a while",
    "No longer used",
  ]);
  expect(texts(group("How things are filed"))).toEqual(["Every question names its reader."]);
  expect(texts(group("How to write for you"))).toEqual(["Say the date before the time."]);
  expect(texts(group("Facts Helper knows"))).toEqual(["Release dates come from the schedule."]);
  const [rule] = within(group("How things are filed")).getAllByRole("listitem");
  expect(rule).toHaveTextContent("Included at setup");
  expect(rule).toHaveTextContent("Used 3 times · last today");
  const [lesson] = within(group("Facts Helper knows")).getAllByRole("listitem");
  expect(lesson).toHaveTextContent("Your own words");
  expect(lesson).toHaveTextContent("Used 12 times · last 2 days ago");
  expect(within(lesson).getByRole("button", { name: "Stop using: Release dates come from the schedule." })).toBeInTheDocument();
  // A group nothing is in is not shown; neither is a word, a retired or an unused entry here.
  expect(screen.queryByRole("list", { name: "Who does what" })).toBeNull();
  expect(screen.queryByRole("list", { name: "Other things learned" })).toBeNull();
});

test("Keep acts at once with the version that was read, says so, and Undo undoes that change", async () => {
  const user = userEvent.setup();
  const { calls } = open({
    "POST knowledge/LES-4/keep": () => ({ changeset: "CS-7" }),
    "POST changesets/CS-7/undo": () => ({ restored: [], skipped: [] }),
  });
  await screen.findByRole("list", { name: "Waiting for your OK" });
  await user.click(screen.getByRole("button", { name: "Keep: Questions about budgets go to finance." }));
  await waitFor(() => expect(body(calls, "POST knowledge/LES-4/keep")).toEqual({ read_version: 4 }));
  expect(await screen.findByText("Kept. It now guides Helper's work.")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Undo" }));
  await waitFor(() => expect(calls.some((c) => c.route === "POST changesets/CS-7/undo")).toBe(true));
});

test("the menu of a proposal has Change, Just this time and Drop, each acting at once with Undo", async () => {
  const user = userEvent.setup();
  const { calls } = open({
    "POST knowledge/LES-4/just-this-time": () => ({ changeset: "CS-1" }),
    "POST knowledge/LES-4/discard": () => ({ changeset: "CS-2" }),
    "POST changesets/CS-2/undo": () => ({ restored: [], skipped: [] }),
  });
  await screen.findByRole("list", { name: "Waiting for your OK" });
  const menu = () => user.click(within(within(waiting()).getAllByRole("listitem")[0]).getByRole("button", { name: "More actions for Questions about budgets go to finance." }));
  await menu();
  expect(screen.getAllByRole("menuitem").map((m) => m.textContent)).toEqual(["Change", "Just this time", "Drop"]);
  await user.click(screen.getByRole("menuitem", { name: "Just this time" }));
  await waitFor(() => expect(body(calls, "POST knowledge/LES-4/just-this-time")).toEqual({ read_version: 4 }));
  expect(await screen.findByText("Set aside, just this time.")).toBeInTheDocument();
  await menu();
  await user.click(screen.getByRole("menuitem", { name: "Drop" }));
  await waitFor(() => expect(body(calls, "POST knowledge/LES-4/discard")).toEqual({ read_version: 4, reason: null }));
  expect(await screen.findByText("Discarded.")).toBeInTheDocument();
  await user.click(screen.getAllByRole("button", { name: "Undo" }).at(-1)!);
  await waitFor(() => expect(calls.some((c) => c.route === "POST changesets/CS-2/undo")).toBe(true));
});

test("Change opens the wording in a drawer with the cursor in it and keeps what the person wrote", async () => {
  const user = userEvent.setup();
  const { calls } = open({ "POST knowledge/LES-4/keep": () => ({ changeset: "CS-3" }) });
  await screen.findByRole("list", { name: "Waiting for your OK" });
  await user.click(within(within(waiting()).getAllByRole("listitem")[0]).getByRole("button", { name: "More actions for Questions about budgets go to finance." }));
  await user.click(screen.getByRole("menuitem", { name: "Change" }));
  const field = await screen.findByRole("textbox", { name: "Wording" });
  expect(field).toHaveFocus();
  await user.clear(field);
  await user.type(field, "Budget questions go to finance first.");
  await user.click(screen.getByRole("button", { name: "Keep with this wording" }));
  await waitFor(() => expect(body(calls, "POST knowledge/LES-4/keep")).toEqual({ read_version: 4, text: "Budget questions go to finance first." }));
});

test("Stop using acts at once with the version that was read, says so, and Undo undoes it; a rule is stopped the same way", async () => {
  const user = userEvent.setup();
  const { calls } = open({
    "POST knowledge/LES-1/retire": () => ({ changeset: "CS-5" }),
    "POST knowledge/RULE-1/retire": () => ({ changeset: "CS-8" }),
    "POST changesets/CS-5/undo": () => ({ restored: [], skipped: [] }),
  });
  await screen.findByRole("list", { name: "How things are filed" });
  await user.click(screen.getByRole("button", { name: "Stop using: Release dates come from the schedule." }));
  await waitFor(() => expect(body(calls, "POST knowledge/LES-1/retire")).toEqual({ read_version: 4 }));
  expect(await screen.findByText("No longer used by Helper.")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Undo" }));
  await waitFor(() => expect(calls.some((c) => c.route === "POST changesets/CS-5/undo")).toBe(true));
  await user.click(screen.getByRole("button", { name: "Stop using: Every question names its reader." }));
  await waitFor(() => expect(body(calls, "POST knowledge/RULE-1/retire")).toEqual({ read_version: 2 }));
});

test("Limit where this applies is in a row's menu and narrows to chosen projects", async () => {
  const user = userEvent.setup();
  const { calls } = open({ "POST knowledge/LES-1/narrow": () => ({ changeset: "CS-4" }) });
  await screen.findByRole("list", { name: "Facts Helper knows" });
  const lesson = within(group("Facts Helper knows")).getAllByRole("listitem")[0];
  expect(within(lesson).queryByRole("button", { name: /^Keep/ })).toBeNull();
  await user.click(within(lesson).getByRole("button", { name: "More actions for Release dates come from the schedule." }));
  expect(screen.getAllByRole("menuitem").map((m) => m.textContent)).toEqual(["Limit where this applies"]);
  await user.click(screen.getByRole("menuitem", { name: "Limit where this applies" }));
  const only = within(lesson).getByRole("radio", { name: "Only these projects" });
  expect(only).toHaveFocus();
  expect(within(lesson).getByRole("button", { name: "Save limits" })).toBeDisabled();
  expect(within(lesson).getByText("Choose at least one project.")).toBeInTheDocument();
  await user.click(within(lesson).getByRole("checkbox", { name: "First project" }));
  await user.click(within(lesson).getByRole("button", { name: "Save limits" }));
  await waitFor(() => expect(body(calls, "POST knowledge/LES-1/narrow")).toEqual({ read_version: 4, applies_to: { ...WORKSPACE, scope: "projects", projects: ["P-1"], except: [] } }));
  expect(await screen.findByText("Updated where this applies.")).toBeInTheDocument();
});

test("narrowing a rule that applies everywhere can also leave out some projects, and Escape closes the form", async () => {
  const user = userEvent.setup();
  const { calls } = open({ "POST knowledge/RULE-1/narrow": () => ({ changeset: "CS-6" }) });
  await screen.findByRole("list", { name: "How things are filed" });
  const row = within(group("How things are filed")).getAllByRole("listitem")[0];
  const limit = async () => {
    await user.click(within(row).getByRole("button", { name: "More actions for Every question names its reader." }));
    await user.click(screen.getByRole("menuitem", { name: "Limit where this applies" }));
  };
  await limit();
  await user.keyboard("{Escape}");
  expect(within(row).queryByRole("radio")).toBeNull();
  await limit();
  await user.click(within(row).getByRole("radio", { name: "All projects except these" }));
  await user.click(within(row).getByRole("checkbox", { name: "Second project" }));
  await user.click(within(row).getByRole("button", { name: "Save limits" }));
  await waitFor(() => expect(body(calls, "POST knowledge/RULE-1/narrow")).toEqual({ read_version: 2, applies_to: { ...WORKSPACE, scope: "workspace", projects: [], except: ["P-2"] } }));
});

test("Your words lists each word with what it means, where it came from and how often it was used, with Stop using", async () => {
  const user = userEvent.setup();
  const { calls } = open({ "POST knowledge/GLOSS-1/retire": () => ({ changeset: "CS-9" }) });
  const list = await screen.findByRole("list", { name: "Your words" });
  const [row] = within(list).getAllByRole("listitem");
  expect(title(row)).toBe("launch review");
  expect(row).toHaveTextContent("the meeting before release");
  expect(row).toHaveTextContent("Your own words");
  expect(row).toHaveTextContent("Used 4 times · last yesterday");
  await user.click(within(row).getByRole("button", { name: "Stop using launch review" }));
  await waitFor(() => expect(body(calls, "POST knowledge/GLOSS-1/retire")).toEqual({ read_version: 4 }));
});

test("a word is added with its meaning at once, and the boxes are emptied", async () => {
  const user = userEvent.setup();
  const { calls } = open({ "POST knowledge/terms": () => ({ changeset: "CS-10" }) });
  await screen.findByRole("list", { name: "Your words" });
  await user.type(screen.getByLabelText("A word"), "  gutter ");
  await user.type(screen.getByLabelText("What it means"), "the inner margin");
  await user.click(screen.getByRole("button", { name: "Add word" }));
  await waitFor(() => expect(body(calls, "POST knowledge/terms")).toEqual({ term: "gutter", meaning: "the inner margin" }));
  expect(await screen.findByText("Added gutter to your words.")).toBeInTheDocument();
  expect(screen.getByLabelText("A word")).toHaveValue("");
  expect(screen.getByLabelText("What it means")).toHaveValue("");
});

test("Not used in a while and what was retired are behind one link, each with its own rows", async () => {
  const user = userEvent.setup();
  const { calls } = open({ "POST knowledge/LES-5/retire": () => ({ changeset: "CS-11" }) });
  await screen.findByRole("list", { name: "Waiting for your OK" });
  const fold = past().closest("details")!;
  await user.click(past());
  expect(fold).toHaveAttribute("open");
  expect(within(fold).getByText("Still in use, but not used in 30 days.")).toBeInTheDocument();
  const idle = within(fold).getByRole("list", { name: "Not used in a while" });
  // Never used and learned long ago; a rule last used 45 days ago; neither is among what is followed.
  expect(texts(idle)).toEqual(["Mail from the print shop is about proofs.", "Name the month in every date."]);
  expect(within(idle).getAllByRole("listitem")[0]).toHaveTextContent("Never used");
  expect(within(idle).getAllByRole("listitem")[1]).toHaveTextContent("Used 2 times · last 45 days ago");
  const retired = within(fold).getByRole("list", { name: "No longer used" });
  expect(texts(retired)).toEqual(["Never close an action without an owner.", "An old habit."]);
  // What is retired says so in words and has no action; what is idle can still be stopped.
  expect(retired.querySelectorAll("button:not([aria-label^='More'])")).toHaveLength(0);
  expect(within(retired).getAllByRole("listitem")[0]).toHaveTextContent("No longer used");
  await user.click(within(idle).getByRole("button", { name: "Stop using: Mail from the print shop is about proofs." }));
  await waitFor(() => expect(body(calls, "POST knowledge/LES-5/retire")).toEqual({ read_version: 4 }));
  expect(screen.queryByRole("list", { name: "Mail from the print shop is about proofs." })).toBeNull();
});

test("a recent lesson never used yet is followed, not called idle", async () => {
  open({ "GET knowledge": () => [entry("LES-9", "Fresh lesson.", { learned_at: ago(2) })], "GET knowledge/rules": () => [] });
  await screen.findByRole("list", { name: "Facts Helper knows" });
  expect(screen.queryByText("Not used in a while, and what was retired")).toBeNull();
});

test("with nothing kept yet, what is waiting is said, and a part that has no rows says so in a line", async () => {
  open({ "GET knowledge": () => ENTRIES.filter((e) => e.status === "proposed"), "GET knowledge/rules": () => [] });
  await screen.findByRole("list", { name: "Waiting for your OK" });
  expect(screen.getByText("Nothing is in use yet. What you keep above shows up here.")).toBeInTheDocument();
  expect(screen.queryByText("Everything active has been used.")).toBeNull();
});

test("with nothing in use and nothing waiting, one line says how things arrive and no part shows", async () => {
  open({ "GET knowledge": () => [], "GET knowledge/rules": () => [] });
  expect(await screen.findByText("When you correct Helper, answer one of its questions or tell it a rule, what it learns shows up here for your OK.")).toBeInTheDocument();
  expect(sections()).toEqual(["Your words"]);
  expect(screen.queryByText(/Everything active has been used|Nothing kept yet|Nothing to review|No saved learning/)).toBeNull();
  expect(screen.queryByRole("list")).toBeNull();
  // A new workspace can still add its first word.
  expect(screen.getByLabelText("A word")).toBeInTheDocument();
});

test("when only the person's plain words exist the page is not empty", async () => {
  open({ "GET knowledge": () => [], "GET knowledge/rules": () => [] }, REVIEW, vi.fn(), [settingItem("language.known_terms", { type: "list", value: ["acme"], default: [] })]);
  expect(await screen.findByLabelText("A word")).toBeInTheDocument();
  expect(screen.queryByText(/When you correct Helper/)).toBeNull();
  // A heading over nothing is left out: with nothing in use and nothing waiting the part isn't there.
  expect(sections()).toEqual(["Your words"]);
  expect(screen.queryByText("Nothing is in use yet.")).toBeNull();
});

test("after an act the cursor goes to what is now first on the page", async () => {
  const user = userEvent.setup();
  open({ "POST knowledge/LES-4/keep": () => ({ changeset: "CS-12" }) });
  await screen.findByRole("list", { name: "Waiting for your OK" });
  await user.click(screen.getByRole("button", { name: "Keep: Questions about budgets go to finance." }));
  await waitFor(() => expect(document.activeElement?.hasAttribute("data-row")).toBe(true));
});

test("rules to look over show as a line that opens the review", async () => {
  const user = userEvent.setup();
  const flagged = { id: "RULE-1", version: 2, name: "n", text: "Every question names its reader.", applies_to: WORKSPACE, present: 4, applied: 0 };
  const { onOpenReview } = open({}, { ...REVIEW, flagged: [flagged], due: true });
  expect(await screen.findByText("Review 1 rule Helper hasn't used.")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Look over rules" }));
  expect(onOpenReview).toHaveBeenCalled();
});

test("a failed load says so, and Try again asks again", async () => {
  const user = userEvent.setup();
  let answer: unknown = new Refuse(500, "nope");
  const { calls } = open({ "GET knowledge": () => answer });
  expect(await screen.findByText("What Helper knows couldn't be loaded.")).toBeInTheDocument();
  expect(screen.queryByText(/When you correct Helper/)).toBeNull();
  const before = calls.filter((c) => c.route === "GET knowledge").length;
  answer = ENTRIES;
  await user.click(screen.getByRole("button", { name: "Try again" }));
  expect(await screen.findByRole("list", { name: "Waiting for your OK" })).toBeInTheDocument();
  expect(calls.filter((c) => c.route === "GET knowledge").length).toBeGreaterThan(before);
});
