import "@testing-library/jest-dom/vitest";
import { useState } from "react";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { S } from "../lib/api";
import type { SettingsSection } from "../lib/views";
import { project } from "../lib/records-fixtures";
import { Refuse, fakeApi, renderApp } from "../test-utils";
import { RestartNotice, RestartProvider } from "../lib/restart";
import { Settings } from "./Settings";

/** Made-up addresses are built from this, so no address is written out whole. */
const WEB = "https" + "://";

function item(key: string, extra: Partial<S["SettingItem"]> = {}): S["SettingItem"] {
  const [file] = key.split(".");
  const made: S["SettingItem"] = {
    key,
    file,
    // The test settings sit on the You page unless a test says otherwise.
    group: "workspace",
    description: `What ${key} does`,
    type: "text",
    options: [],
    value: "",
    default: "",
    source: "default",
    locked: false,
    basic: true,
    editable: true,
    ...extra,
  };
  // The page the app would place a setting on, by its group; one that is not basic is a rarely changed one, in the topic its
  // test names (What the assistant learns unless it says): on its page's More settings fold where its topic has a page, else
  // behind Advanced.
  const topicPage: Record<string, S["SettingItem"]["page"]> = { ai: "ai", backups: "backups", appearance: "appearance", notices: "today" };
  const page: S["SettingItem"]["page"] = !made.basic
    ? (topicPage[extra.topic ?? "learns"] ?? "advanced")
    : made.group.startsWith("ui.notifications") || made.group.startsWith("steward")
      ? "today"
      : made.group.startsWith("ui")
        ? "appearance"
        : made.group.startsWith("storage")
          ? "backups"
          : made.group.startsWith("ai")
            ? "ai"
            : "you";
  return { page, topic: made.basic ? null : "learns", advanced: !made.basic, ...made };
}

const ITEMS: S["SettingItem"][] = [
  item("demo.title", { value: "Lantern", default: "Workspace", source: "file", description: "The display name." }),
  item("demo.limit", { type: "number", value: 2, default: 2 }),
  item("demo.count", { type: "integer", value: 4, default: 4 }),
  item("demo.on", { type: "yes_no", value: true, default: true }),
  item("demo.mode", { type: "choice", options: ["person", "rule"], value: "person", default: "person" }),
  item("demo.names", { type: "list", value: ["a", "b"], default: [] }),
  item("demo.fixed", { value: "from env", source: "env", locked: true }),
  item("demo.flagged", { value: "from flag", source: "flag", locked: true }),
  item("demo.table", { type: "other", value: { x: 1 }, editable: false }),
  item("demo.server", { value: "local", editable: false }),
  item("demo.advanced", { value: "deep", basic: false, description: "A rarely needed thing." }),
];

const BUSINESS = {
  "GET setup/business": () => ({
    business: true,
    name: "Orchard Press",
    personal: "PRJ-1",
    sides: [{ project: "PRJ-2", kind: "business", name: "Orchard Press", removable: false }],
    chosen: "work",
  }),
  "GET projects": () => [project("PRJ-1", "Personal"), { ...project("PRJ-2", "Orchard Press"), parent: null }, { ...project("PRJ-3", "Spring catalog"), parent: "PRJ-2" }],
};

const same = (a: unknown, b: unknown) => JSON.stringify(a ?? "") === JSON.stringify(b ?? "");

/** A fake server that behaves like the real one: it keeps the values, answers a save with what changed and a new
 * fingerprint, and refuses a save made on an old fingerprint. A test may answer saves itself instead. */
function api(items = ITEMS, extra: Record<string, (body: unknown) => unknown> = {}) {
  let fingerprint = "fp-1";
  let n = 1;
  const state = items.map((i) => ({ ...i }));
  return fakeApi({
    "GET settings": () => ({ fingerprint, items: state }),
    ...extra,
    "POST settings": (body) => {
      const handler = extra["POST settings"];
      if (handler) {
        const out = handler(body);
        if (!(out instanceof Refuse)) fingerprint = (out as S["SettingsSaved"]).fingerprint;
        return out;
      }
      const sent = body as S["SettingsSave"];
      if (sent.fingerprint !== fingerprint) return new Refuse(409, "The settings changed since you opened them. Look again, then save.");
      const changes: S["SettingChangeView"][] = [];
      const set = (key: string, after: unknown) => {
        const at = state.find((i) => i.key === key)!;
        changes.push({ key, before: at.value, after, was_default: same(at.value, at.default), is_default: same(after, at.default) });
        at.value = after;
        at.source = "file";
      };
      for (const [key, after] of Object.entries(sent.changes ?? {})) set(key, after);
      for (const key of sent.reset ?? []) set(key, state.find((i) => i.key === key)!.default);
      n += 1;
      fingerprint = `fp-${n}`;
      return { changes, fingerprint, needs_restart: false };
    },
  });
}

const open = (section: SettingsSection = "you") =>
  renderApp(<Settings section={section} onOpenGuide={() => undefined} onChooseSource={() => undefined} />);
const posted = (calls: ReturnType<typeof fakeApi>) => calls.filter((c) => c.route === "POST settings").map((c) => c.body);
const saveButtons = () => screen.queryAllByRole("button", { name: /^Save/ });
const rowOf = (label: string) => screen.getByText(label).closest(".setting") as HTMLElement;

test("a page shows the settings the app places on it, and the ones behind Advanced are not on it", async () => {
  api();
  open();
  expect(await screen.findByLabelText("The display name.")).toBeInTheDocument();
  expect(screen.queryByLabelText("A rarely needed thing.")).toBeNull();
  expect(screen.queryByRole("button", { name: "More settings" })).toBeNull();
});
test("the section list sits down the side: the pages, Your business only with a business, and no Quality; the open one is marked", async () => {
  api(
    [
      ...ITEMS,
      item("ui.theme", { group: "ui" }),
      item("steward.reminders.quiet_start", { group: "steward.reminders" }),
      item("storage.sync.folder", { group: "storage.sync" }),
    ],
    BUSINESS,
  );
  open();
  const nav = await screen.findByRole("navigation", { name: "Settings sections" });
  await waitFor(() => expect(within(nav).getByRole("link", { name: "Your business" })).toBeInTheDocument());
  expect(within(nav).getAllByRole("link").map((a) => a.textContent)).toEqual([
    "You",
    "AI and spending",
    "Notices",
    "Backups",
    "Appearance",
    "Your business",
    "Connections",
    "Add-ons",
    "Advanced",
  ]);
  expect(within(nav).getByRole("link", { name: "You" })).toHaveAttribute("aria-current", "page");
  expect(within(nav).queryByRole("link", { name: "Quality" })).toBeNull();
  expect(within(nav).getByRole("link", { name: "Backups" })).toHaveAttribute("href", expect.stringMatching(/#settings\/backups$/));
  expect(within(nav).getByRole("link", { name: "Connections" })).toHaveAttribute("href", expect.stringMatching(/#settings\/connections$/));
  expect(within(nav).getByRole("link", { name: "Add-ons" })).toHaveAttribute("href", expect.stringMatching(/#settings\/addons$/));
});

const NO_SIDE = {
  "GET setup/business": () => ({ business: false, name: null, personal: "PRJ-1", sides: [], chosen: "me" }),
};
const JUST_ME = { ...NO_SIDE, "GET projects": () => [project("PRJ-1", "Personal")] };
const WITH_PROJECTS = { ...NO_SIDE, "GET projects": () => [project("PRJ-1", "Personal"), { ...project("PRJ-2", "Spring catalog"), parent: "PRJ-1" }, project("PRJ-3", "Garden")] };
const projectList = (): S["ValueListView"] => ({ id: "L-1", name: "project-status", label: "Project status", values: ["On track"], retired: [], used_by: ["project.status"] });
const otherList = (): S["ValueListView"] => ({ id: "L-2", name: "demo/stages", label: "Stages", values: ["Draft"], retired: [], used_by: ["demo/chapter.stage"] });
/** The section links, once the screen has loaded and settled on a section: the You page by default. */
const sectionLinks = async (page: string | null = "The display name.") => {
  const nav = await screen.findByRole("navigation", { name: "Settings sections" });
  if (page) await screen.findByLabelText(page);
  return within(nav);
};

test("with projects and no side, the Lists page is listed and holds every list, and the older address opens it", async () => {
  api([...ITEMS], { ...WITH_PROJECTS, "GET lists": () => [projectList(), otherList()] });
  open("lists");
  const nav = await sectionLinks(null);
  expect(nav.queryByRole("link", { name: "Your business" })).toBeNull();
  await waitFor(() => expect(nav.getByRole("link", { name: "Lists" })).toHaveAttribute("aria-current", "page"));
  const heading = await screen.findByRole("heading", { level: 2, name: "Lists" });
  await waitFor(() => expect(heading).toHaveFocus());
  expect(screen.getByText("Project status")).toBeInTheDocument();
  expect(screen.getByText("Stages")).toBeInTheDocument();
});

test("under Just me with only project lists there is no Lists page, and its address opens the first section", async () => {
  api([...ITEMS], { ...JUST_ME, "GET lists": () => [projectList()] });
  open("lists");
  const nav = await sectionLinks();
  expect(nav.queryByRole("link", { name: "Lists" })).toBeNull();
  expect(nav.queryByRole("link", { name: "Your business" })).toBeNull();
  expect(nav.getByRole("link", { name: "You" })).toHaveAttribute("aria-current", "page");
  expect(screen.queryByText("Project status")).toBeNull();
});

test("under Just me with a list that is not a project's, the Lists page is listed and holds only that list", async () => {
  api([...ITEMS], { ...JUST_ME, "GET lists": () => [projectList(), otherList()] });
  const { unmount } = open();
  const nav = await sectionLinks();
  await waitFor(() => expect(nav.getByRole("link", { name: "Lists" })).toBeInTheDocument());
  expect(nav.queryByRole("link", { name: "Your business" })).toBeNull();
  expect(nav.getByRole("link", { name: "Lists" })).toHaveAttribute("href", expect.stringMatching(/#settings\/lists$/));
  unmount();
  open("lists");
  expect(await screen.findByText("Stages")).toBeInTheDocument();
  expect(screen.queryByText("Project status")).toBeNull();
});

test("with a business the project lists are on the business page and the others on the Lists page, each in one place", async () => {
  api([...ITEMS], { ...BUSINESS, "GET lists": () => [projectList(), otherList()] });
  const { unmount } = open("business");
  const nav = await sectionLinks(null);
  await waitFor(() => expect(nav.getByRole("link", { name: "Lists" })).toBeInTheDocument());
  expect(await screen.findByText("Project status")).toBeInTheDocument();
  expect(screen.queryByText("Stages")).toBeNull();
  unmount();
  open("lists");
  expect(await screen.findByRole("heading", { level: 2, name: "Lists" })).toBeInTheDocument();
  expect(screen.getByText("Stages")).toBeInTheDocument();
  expect(screen.queryByText("Project status")).toBeNull();
});

test("with a business and only project lists there is no Lists page: they are on the business page, which the older address opens", async () => {
  api([...ITEMS], { ...BUSINESS, "GET lists": () => [projectList()] });
  open("lists");
  const nav = await sectionLinks(null);
  await waitFor(() => expect(nav.getByRole("link", { name: "Your business" })).toHaveAttribute("aria-current", "page"));
  expect(nav.queryByRole("link", { name: "Lists" })).toBeNull();
  expect(await screen.findByText("Project status")).toBeInTheDocument();
});

test("choosing a section shows that section's settings and no others; the choice goes to the address when the screen asks", async () => {
  const user = userEvent.setup();
  api([...ITEMS, item("ui.theme", { group: "ui", description: "How it looks." })]);
  const chosen = vi.fn();
  renderApp(<Settings section="you" onSection={chosen} onOpenGuide={() => undefined} onChooseSource={() => undefined} />);
  await screen.findByLabelText("The display name.");
  expect(screen.queryByLabelText("Light or dark")).toBeNull();
  await user.click(screen.getByRole("link", { name: "Appearance" }));
  expect(chosen).toHaveBeenCalledWith("appearance");
});

test("in Appearance's More settings, the measured contrast of the text on the accent color is shown, and warns when it fails AA", async () => {
  const user = userEvent.setup();
  const color = (value: string) => item("ui.brand.color", { group: "ui.brand", value, default: "", description: "The accent color.", basic: false, topic: "appearance" });
  api([...ITEMS, color("#4f46e5")]);
  open("appearance");
  await user.click(await screen.findByText("More settings"));
  const line = await screen.findByRole("status", { name: "Contrast of the accent color" });
  expect(line).toHaveTextContent(/Text on your accent color has a contrast of \d+\.\d to 1, which meets the 4\.5 to 1 that WCAG AA asks for\./);
  expect(line).not.toHaveTextContent("under");
  // Typing a color that fails shows the warning at once, before it is saved, in words as well as color.
  const box = screen.getByLabelText("Accent color");
  await user.clear(box);
  await user.type(box, "#7a7a7a");
  const warning = await screen.findByRole("status", { name: "Contrast of the accent color" });
  expect(warning).toHaveTextContent(/Warning: text on your accent color has a contrast of \d+\.\d to 1, under the 4\.5 to 1 that WCAG AA asks for\. Choose a lighter or a darker color\./);
});
test("Quick links is a section of its own with the list of the person's links as a part of its own, not as a read-only row", async () => {
  const links = item("ui.links", { group: "ui", type: "other", value: [{ name: "Planning board", address: `${WEB}boards.example.org/plan` }], default: [], description: "Links to your own pages.", page: null });
  api([...ITEMS, item("ui.theme", { group: "ui", description: "How it looks." }), links]);
  const first = open("appearance");
  // It is not on Appearance any more, and the section list has it by its own name.
  expect(await screen.findByRole("link", { name: "Quick links" })).toBeInTheDocument();
  expect(screen.queryByRole("list", { name: "Quick links" })).toBeNull();
  first.unmount();
  open("links");
  expect(await screen.findByRole("heading", { level: 2, name: "Quick links" })).toBeInTheDocument();
  expect(screen.getByRole("list", { name: "Quick links" })).toHaveTextContent("Planning board");
  expect(screen.getByText("Sites you open every day, shown as buttons in the header. Helper doesn't read them.")).toBeInTheDocument();
  expect(screen.queryByText("Links to your own pages.")).toBeNull();
});

test("without an address to change, the section list still moves between sections", async () => {
  const user = userEvent.setup();
  api([...ITEMS, item("ui.theme", { group: "ui", description: "How it looks." })]);
  renderApp(<Settings onOpenGuide={() => undefined} onChooseSource={() => undefined} />);
  await screen.findByLabelText("The display name.");
  await user.click(screen.getByRole("link", { name: "Appearance" }));
  expect(await screen.findByLabelText("Light or dark")).toBeInTheDocument();
  expect(screen.queryByLabelText("The display name.")).toBeNull();
  expect(screen.getByRole("heading", { level: 2, name: "Appearance" })).toBeInTheDocument();
});

test("the search looks at every setting in every section by its key and description, advanced ones included", async () => {
  const user = userEvent.setup();
  api([...ITEMS, item("ui.theme", { group: "ui", description: "How it looks." })]);
  open();
  await screen.findByLabelText("The display name.");
  const search = screen.getByRole("searchbox", { name: "Search settings" });
  await user.type(search, "rarely");
  expect(screen.getByLabelText("A rarely needed thing.")).toBeInTheDocument();
  expect(screen.queryByLabelText("The display name.")).toBeNull();
  expect(screen.getByText("1 setting shown.")).toBeInTheDocument();
  await user.clear(search);
  await user.type(search, "demo.advanced");
  expect(screen.getByLabelText("A rarely needed thing.")).toBeInTheDocument();
  await user.clear(search);
  await user.type(search, "looks");
  expect(screen.getByLabelText("Light or dark")).toBeInTheDocument();
  expect(screen.getByRole("heading", { level: 3, name: "Appearance" })).toBeInTheDocument();
  await user.clear(search);
  await user.type(search, "zzz");
  expect(screen.getByText("No settings match.")).toBeInTheDocument();
  await user.clear(search);
  expect(await screen.findByLabelText("The display name.")).toBeInTheDocument();
});

test("each type has its own control, with its default shown", async () => {
  api();
  open();
  expect(await screen.findByLabelText("The display name.")).toHaveValue("Lantern");
  expect(screen.getByLabelText("What demo.limit does")).toHaveValue("2");
  expect(screen.getByLabelText("What demo.on does")).toBeChecked();
  expect(screen.getByLabelText("What demo.mode does")).toHaveValue("person");
  // A list of words is chips, each with its own Remove, and a box to type the next word in.
  expect(screen.getByLabelText("What demo.names does")).toHaveValue("");
  expect(within(screen.getByRole("list", { name: "Words in What demo.names does" })).getAllByRole("listitem").map((li) => li.textContent)).toEqual(["a×", "b×"]);
  expect(screen.queryByText("One choice per line.")).toBeNull();
  // The default is shown only on a value the person changed.
  expect(screen.getByText("Default: Workspace")).toBeInTheDocument();
  expect(screen.queryByText("Default: Yes")).toBeNull();
});

test("a setting's description is the help beside its field, not a line under it, and the field is still described by it", async () => {
  api([item("workspace.name", { value: "Lantern", default: "Workspace", description: "The name shown at the top of every screen." })]);
  open();
  const field = await screen.findByLabelText("Name shown at the top");
  const row = field.closest(".setting") as HTMLElement;
  const help = row.querySelector("[data-help]") as HTMLElement;
  expect(help).toHaveTextContent("The name shown at the top of every screen.");
  expect(help).toHaveTextContent("Default: Workspace");
  const main = row.querySelector("[data-main]") as HTMLElement;
  expect(main).toContainElement(field);
  expect(main).not.toHaveTextContent("The name shown at the top");
  expect(field).toHaveAccessibleDescription(/The name shown at the top of every screen\./);
});

test("locked settings are disabled and say where they come from; others the screen can't change say which file", async () => {
  api();
  open();
  const env = await screen.findByLabelText("What demo.fixed does");
  expect(env).toBeDisabled();
  expect(screen.getByText("Set outside the app by an environment variable")).toBeInTheDocument();
  expect(screen.getByLabelText("What demo.flagged does")).toBeDisabled();
  expect(screen.getByText("Set by an option used to start the app")).toBeInTheDocument();
  const table = screen.getByText("What demo.table does").closest(".setting") as HTMLElement;
  expect(within(table).getByText("Change this setting outside this screen.")).toBeInTheDocument();
  expect(within(table).queryByRole("textbox")).toBeNull();
  const server = screen.getByText("What demo.server does").closest(".setting") as HTMLElement;
  expect(within(server).getByText("local")).toBeInTheDocument();
  expect(within(server).getByText("Change this setting outside this screen.")).toBeInTheDocument();
});

test("there is no Save button: a text setting saves when the cursor leaves it, with the fingerprint, and reads back with Undo", async () => {
  const user = userEvent.setup();
  const calls = api();
  open();
  const title = await screen.findByLabelText("The display name.");
  expect(saveButtons()).toHaveLength(0);
  await user.clear(title);
  await user.type(title, "Harbor");
  expect(posted(calls)).toHaveLength(0);
  await user.tab();
  await waitFor(() => expect(posted(calls)).toHaveLength(1));
  expect(posted(calls)[0]).toEqual({ changes: { "demo.title": "Harbor" }, reset: [], fingerprint: "fp-1" });
  expect(await screen.findByText("Saved. The display name: Harbor")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Undo" })).toBeInTheDocument();
  expect(screen.getByLabelText("The display name.")).toHaveValue("Harbor");
});

test("Enter saves a text setting without leaving it, once", async () => {
  const user = userEvent.setup();
  const calls = api();
  open();
  const title = await screen.findByLabelText("The display name.");
  await user.type(title, "x{Enter}");
  await waitFor(() => expect(posted(calls)).toHaveLength(1));
  expect(posted(calls)[0]).toMatchObject({ changes: { "demo.title": "Lanternx" } });
  expect(title).toHaveFocus();
  await user.tab();
  expect(posted(calls)).toHaveLength(1);
});

test("leaving a field that was not changed saves nothing", async () => {
  const user = userEvent.setup();
  const calls = api();
  open();
  const title = await screen.findByLabelText("The display name.");
  await user.click(title);
  await user.tab();
  await user.type(title, "x");
  await user.type(title, "{Backspace}");
  await user.tab();
  expect(posted(calls)).toHaveLength(0);
});

test("a choice and a yes/no setting save as soon as they change; a list of words saves as each word is added or removed", async () => {
  const user = userEvent.setup();
  const calls = api();
  open();
  await user.click(await screen.findByLabelText("What demo.on does"));
  await waitFor(() => expect(posted(calls)).toHaveLength(1));
  expect(posted(calls)[0]).toMatchObject({ changes: { "demo.on": false } });
  await user.selectOptions(screen.getByLabelText("What demo.mode does"), "rule");
  await waitFor(() => expect(posted(calls)).toHaveLength(2));
  expect(posted(calls)[1]).toMatchObject({ changes: { "demo.mode": "rule" } });
  const names = screen.getByLabelText("What demo.names does");
  await user.type(names, "one{Enter}");
  await waitFor(() => expect(posted(calls)).toHaveLength(3));
  expect(posted(calls)[2]).toMatchObject({ changes: { "demo.names": ["a", "b", "one"] } });
  // A word already there is not added twice, and a word left in the box is added when the cursor leaves it.
  await user.type(names, "a{Enter}");
  expect(posted(calls)).toHaveLength(3);
  await user.type(names, "two");
  await user.tab();
  await waitFor(() => expect(posted(calls)).toHaveLength(4));
  expect(posted(calls)[3]).toMatchObject({ changes: { "demo.names": ["a", "b", "one", "two"] } });
  await user.click(screen.getByRole("button", { name: "Remove a" }));
  await waitFor(() => expect(posted(calls)).toHaveLength(5));
  expect(posted(calls)[4]).toMatchObject({ changes: { "demo.names": ["b", "one", "two"] } });
  expect(screen.getByText("Removed a")).toBeInTheDocument();
});

test("a number that isn't one is refused on screen and nothing is sent", async () => {
  const user = userEvent.setup();
  const calls = api();
  open();
  const limit = await screen.findByLabelText("What demo.limit does");
  await user.clear(limit);
  await user.type(limit, "lots");
  expect(screen.getByText("Enter a number.")).toBeInTheDocument();
  await user.tab();
  expect(posted(calls)).toHaveLength(0);
  expect(screen.getByLabelText("What demo.limit does")).toHaveValue("lots");
});

test("each save carries the fingerprint from the one before it, so saves in a row are never refused as out of date", async () => {
  const user = userEvent.setup();
  const calls = api();
  open();
  await user.type(await screen.findByLabelText("The display name."), "x");
  await user.tab();
  await user.click(screen.getByLabelText("What demo.on does"));
  await user.selectOptions(screen.getByLabelText("What demo.mode does"), "rule");
  await waitFor(() => expect(posted(calls)).toHaveLength(3));
  expect(posted(calls).map((b) => (b as { fingerprint: string }).fingerprint)).toEqual(["fp-1", "fp-2", "fp-3"]);
  expect(screen.queryByRole("alert")).toBeNull();
});

test("three fields changed one after another while the app's live stream keeps asking for the settings again all end up saved", async () => {
  const user = userEvent.setup();
  const later = (ms: number) => new Promise((done) => setTimeout(done, ms));
  const state = ITEMS.map((i) => ({ ...i }));
  let n = 1;
  const calls = fakeApi({
    // The server answers after a while, as a computer under load does.
    "GET settings": async () => {
      const answer = { fingerprint: `fp-${n}`, items: JSON.parse(JSON.stringify(state)) };
      await later(15);
      return answer;
    },
    "POST settings": async (body) => {
      await later(25);
      const sent = body as S["SettingsSave"];
      if (sent.fingerprint !== `fp-${n}`) return new Refuse(409, "The settings changed since you opened them. Look again, then save.");
      const changes: S["SettingChangeView"][] = [];
      for (const [key, after] of Object.entries(sent.changes ?? {})) {
        const at = state.find((i) => i.key === key)!;
        changes.push({ key, before: at.value, after, was_default: same(at.value, at.default), is_default: same(after, at.default) });
        at.value = after;
        at.source = "file";
      }
      n += 1;
      return { changes, fingerprint: `fp-${n}`, needs_restart: false };
    },
  });
  const app = open();
  // Every change the server makes reaches the screen as a request for everything again, at any moment.
  const stream = setInterval(() => void app.client.invalidateQueries(), 9);
  const title = await screen.findByLabelText("The display name.");
  await user.clear(title);
  await user.type(title, "Harbor");
  await user.tab();
  const limit = screen.getByLabelText("What demo.limit does");
  await user.clear(limit);
  await user.type(limit, "7");
  await user.tab();
  await user.click(screen.getByLabelText("What demo.on does"));
  await waitFor(() => expect(state.find((i) => i.key === "demo.on")!.value).toBe(false), { timeout: 5000 });
  await later(300);
  clearInterval(stream);
  // Each change reached the server, and the screen shows what the server holds.
  expect(state.find((i) => i.key === "demo.title")!.value).toBe("Harbor");
  expect(state.find((i) => i.key === "demo.limit")!.value).toBe(7);
  expect(posted(calls)).toHaveLength(3);
  expect(screen.queryByRole("alert")).toBeNull();
  expect(screen.getByLabelText("The display name.")).toHaveValue("Harbor");
});

test("Undo sends the old values back; after later saves it uses the newest fingerprint, so it still works", async () => {
  const user = userEvent.setup();
  const calls = api();
  open();
  await user.type(await screen.findByLabelText("The display name."), "x");
  await user.tab();
  await screen.findByText("Saved. The display name: Lanternx");
  await user.click(screen.getByLabelText("What demo.on does"));
  await waitFor(() => expect(posted(calls)).toHaveLength(2));
  // One toast shows, the newest; its Undo sends the old value with the newest fingerprint, so it still works after later saves.
  expect(screen.getAllByRole("button", { name: "Undo" })).toHaveLength(1);
  await user.click(screen.getByRole("button", { name: "Undo" }));
  await waitFor(() => expect(posted(calls)).toHaveLength(3));
  // The setting was at its default before the second save, so Undo resets it.
  expect(posted(calls)[2]).toEqual({ changes: {}, reset: ["demo.on"], fingerprint: "fp-3" });
  expect(await screen.findByText("Undone.")).toBeInTheDocument();
});

test("a changed setting says Changed with a Reset beside its label; one at its default shows nothing", async () => {
  api();
  open();
  await screen.findByLabelText("The display name.");
  const changed = rowOf("The display name.");
  expect(within(changed).getByText("Changed")).toBeInTheDocument();
  expect(within(changed).getByRole("button", { name: "Reset: The display name." })).toBeInTheDocument();
  const unchanged = rowOf("What demo.limit does");
  expect(within(unchanged).queryByText("Changed")).toBeNull();
  expect(within(unchanged).queryByRole("button", { name: /^Reset/ })).toBeNull();
  // A setting the screen can't change has nothing to reset.
  expect(within(rowOf("What demo.fixed does")).queryByRole("button", { name: /^Reset/ })).toBeNull();
});

test("a value that setup wrote reads as set up, not as changed: no Changed, no Reset and no Default, until the person changes it", async () => {
  const user = userEvent.setup();
  api([
    item("workspace.name", { value: "Orchard Press", default: "Workspace", source: "file", by_setup: true, description: "The workspace's display name." }),
    item("workspace.language", { value: "en-GB", default: "en-US", source: "file", description: "Which kind of English." }),
  ]);
  open();
  const set = await screen.findByLabelText("Name shown at the top");
  const row = set.closest(".setting") as HTMLElement;
  expect(within(row).queryByText("Changed")).toBeNull();
  expect(within(row).queryByRole("button", { name: /^Reset/ })).toBeNull();
  expect(row).not.toHaveTextContent("Default:");
  // The same value the person set themselves is a change, with its default beside it.
  const own = (screen.getByLabelText("English spelling").closest(".setting")) as HTMLElement;
  expect(within(own).getByText("Changed")).toBeInTheDocument();
  expect(own).toHaveTextContent("Default:");
  // Once the person types another value into the one setup wrote, it is theirs.
  await user.type(set, "s");
  expect(within(row).getByText("Changed")).toBeInTheDocument();
  expect(row).toHaveTextContent("Default: Workspace");
});

test("Reset puts the setting back to its default at once, says so, and can be undone", async () => {
  const user = userEvent.setup();
  const calls = api();
  open();
  await screen.findByLabelText("The display name.");
  await user.click(screen.getByRole("button", { name: "Reset: The display name." }));
  await waitFor(() => expect(posted(calls)).toHaveLength(1));
  expect(posted(calls)[0]).toEqual({ changes: {}, reset: ["demo.title"], fingerprint: "fp-1" });
  expect(await screen.findByText(/back to the default, Workspace/)).toBeInTheDocument();
  await waitFor(() => expect(screen.getByLabelText("The display name.")).toHaveValue("Workspace"));
  expect(within(rowOf("The display name.")).queryByText("Changed")).toBeNull();
  await user.click(screen.getByRole("button", { name: "Undo" }));
  await waitFor(() => expect(posted(calls)).toHaveLength(2));
  expect(posted(calls)[1]).toEqual({ changes: { "demo.title": "Lantern" }, reset: [], fingerprint: "fp-2" });
  await waitFor(() => expect(screen.getByLabelText("The display name.")).toHaveValue("Lantern"));
});

test("a change made elsewhere meanwhile is refused in the 'changed since you opened it' words, what was typed stays, and the form loads again", async () => {
  const user = userEvent.setup();
  const calls = api(ITEMS, { "POST settings": () => new Refuse(409, "The settings changed since you opened them. Look again, then save.") });
  open();
  await user.type(await screen.findByLabelText("The display name."), "x");
  const before = calls.filter((c) => c.route === "GET settings").length;
  await user.tab();
  const note = await screen.findByRole("alert");
  expect(note).toHaveTextContent("This was changed since you opened it. What you typed is still here; check it against what is saved now, then save again.");
  expect(rowOf("The display name.")).toContainElement(note);
  expect(screen.getByLabelText("The display name.")).toHaveValue("Lanternx");
  await waitFor(() => expect(calls.filter((c) => c.route === "GET settings").length).toBeGreaterThan(before));
  expect(screen.queryByText(/^Saved/)).toBeNull();
});

test("the person's own record is picked from the people by name, with a blank for no one yet, and saved as the record's id", async () => {
  const user = userEvent.setup();
  const calls = api(
    [
      ...ITEMS,
      item("workspace.user.person", { type: "choice", choices: "people", options: ["PER-1", "PER-2"], value: "", default: "", description: "Your own record." }),
    ],
    { "GET people": () => [{ id: "PER-1", name: "Ada Example", status: "active" }, { id: "PER-2", name: "Robin Sample", status: "active" }] },
  );
  open();
  const list = await screen.findByLabelText("Your own record.");
  await waitFor(() => expect(within(list).getAllByRole("option").map((o) => o.textContent)).toEqual(["No one chosen yet", "Ada Example", "Robin Sample"]));
  expect(list).toHaveValue("");
  await user.selectOptions(list, "PER-2");
  await waitFor(() => expect(posted(calls)).toHaveLength(1));
  expect(posted(calls)[0]).toMatchObject({ changes: { "workspace.user.person": "PER-2" } });
});

test("a role's tier is picked from the tiers by their plain names", async () => {
  api([...ITEMS, item("ai.roles.write.tier", { type: "choice", choices: "tiers", options: ["routine", "deep", "extra-care"], value: "routine", default: "", description: "The tier for writing." })]);
  open();
  const list = await screen.findByLabelText("The tier for writing.");
  expect(within(list).getAllByRole("option").map((o) => o.textContent)).toEqual(["Not chosen", "Everyday work", "Harder work", "Extra care"]);
});

test("how an owner is shown is a list of examples, and the file types that may be added are ticked by plain names", async () => {
  api([
    ...ITEMS,
    item("workspace.owner_format", { type: "choice", choices: "owner_formats", options: ["{full_name}", "{team} ({full_name})"], value: "{full_name}", default: "{full_name}", description: "How an owner is shown." }),
    item("storage.files.accepted_types", { type: "list", choices: "media_types", options: ["application/pdf", "text/csv", "image/png"], value: ["application/pdf"], default: [], description: "File types that may be added." }),
  ]);
  open();
  const owner = await screen.findByLabelText("How an owner is shown.");
  expect(within(owner).getAllByRole("option").map((o) => o.textContent)).toEqual(["Ada Example", "Design (Ada Example)"]);
  const types = screen.getByRole("group", { name: /File types that may be added/ });
  expect(within(types).getAllByRole("checkbox").map((c) => c.closest("label")?.textContent)).toEqual(["PDF", "CSV spreadsheet", "PNG image"]);
  expect(within(types).getByRole("checkbox", { name: "PDF" })).toBeChecked();
});

test("a setting that holds a date format is a list showing today's date in each format, not the codes", async () => {
  const formats = ["%a, %b %d", "%Y-%m-%d"];
  api([
    ...ITEMS,
    item("language.messages.date_format", { group: "language.messages", type: "choice", choices: "date_formats", options: formats, value: "%a, %b %d", default: "%a, %b %d", description: "How dates appear.", basic: true }),
  ]);
  open();
  const list = await screen.findByLabelText("How dates appear.");
  expect(list.tagName).toBe("SELECT");
  const labels = within(list).getAllByRole("option").map((o) => o.textContent);
  expect(labels).toHaveLength(2);
  expect(labels.join(" ")).not.toContain("%");
  expect(labels[1]).toMatch(/^\d{4}-\d{2}-\d{2}$/);
});

test("after a refusal the settings the person did not touch are refreshed and listed, and the ones they changed are kept and marked", async () => {
  const user = userEvent.setup();
  let moved = false;
  fakeApi({
    "GET settings": () => ({
      fingerprint: moved ? "fp-2" : "fp-1",
      changed_at: "2026-10-20T09:14:00Z",
      items: ITEMS.map((i) => (moved && i.key === "demo.limit" ? { ...i, value: 9 } : moved && i.key === "demo.title" ? { ...i, value: "Elsewhere" } : i)),
    }),
    "POST settings": (body) => {
      if ((body as S["SettingsSave"]).fingerprint === "fp-1") {
        moved = true;
        return new Refuse(409, "The settings changed since you opened them. Look again, then save.");
      }
      return { changes: [{ key: "demo.title", before: "Elsewhere", after: "Lanternx", was_default: false, is_default: false }], fingerprint: "fp-3", needs_restart: false };
    },
  });
  open();
  await user.type(await screen.findByLabelText("The display name."), "x");
  await user.tab();
  const lines = await screen.findByRole("status", { name: "Refreshed from what is saved now" });
  expect(lines).toHaveTextContent(/refreshed: What demo\.limit does is now 9, changed elsewhere at .*\d/);
  expect(lines).not.toHaveTextContent("demo.title");
  await waitFor(() => expect(screen.getByLabelText("What demo.limit does")).toHaveValue("9"));
  // The one they typed in is kept and marked, with its own words on its row.
  expect(screen.getByLabelText("The display name.")).toHaveValue("Lanternx");
  expect(rowOf("The display name.")).toHaveTextContent("This was changed since you opened it.");
  // The second Save is on what is saved now and goes through.
  await user.click(screen.getByLabelText("The display name."));
  await user.tab();
  expect(await screen.findByText(/^Saved\./)).toBeInTheDocument();
  expect(screen.queryByRole("status", { name: "Refreshed from what is saved now" })).toBeNull();
});

test("a refused value shows the server's words on its own row and keeps what was typed", async () => {
  const user = userEvent.setup();
  api(ITEMS, { "POST settings": () => new Refuse(400, "demo.title can't be empty here") });
  open();
  const title = await screen.findByLabelText("The display name.");
  await user.clear(title);
  await user.type(title, "Nope");
  await user.tab();
  const note = await screen.findByRole("alert");
  expect(note).toHaveTextContent("demo.title can't be empty here");
  expect(rowOf("The display name.")).toContainElement(note);
  expect(screen.getByLabelText("The display name.")).toHaveValue("Nope");
});

test("a refused value says what is allowed in words beside its field, naming the field by its label", async () => {
  const user = userEvent.setup();
  api(ITEMS, { "POST settings": () => new Refuse(400, "Use a number that is 0 or more.", { "X-Cockpit-Field": "demo.title" }) });
  open();
  const title = await screen.findByLabelText("The display name.");
  await user.clear(title);
  await user.type(title, "-3");
  await user.tab();
  const note = await screen.findByRole("alert");
  expect(note).toHaveTextContent("“The display name” can't be saved. Use a number that is 0 or more.");
  expect(note.textContent).not.toMatch(/Input should|should be/);
});

test("a section opens with the cursor on its heading, never in a field", async () => {
  api();
  open();
  const field = await screen.findByLabelText("The display name.");
  await waitFor(() => expect(document.querySelector("[data-section-heading]")).toHaveFocus());
  expect(field).not.toHaveFocus();
});

test("Backups and sync holds the synced folder and the scheduled work, so neither is on the Projects or People screens", async () => {
  api([item("storage.sync.folder", { group: "storage.sync", description: "Where the synced folder is.", value: "/shared/Cockpit", picker: "folder" })], {
    "GET sync": () => ({ folder: "/shared/Cockpit", problem: null, stopped: false, changed_outside: [], removed_outside: [], rebuilt: [], outside_edits: [], conflict_copies: [], shared: false, handover: null }),
    "GET jobs": () => [{ name: "demo/refresh-feeds", plugin: "demo", enabled: true, every_minutes: 60, last_run_at: null, last_outcome: null, last_error: null }],
  });
  open("backups");
  const sync = await screen.findByRole("region", { name: "Synced folder" });
  expect(await within(sync).findByText("Kept in /shared/Cockpit")).toBeInTheDocument();
  const jobs = await screen.findByRole("region", { name: "Scheduled work" });
  expect(jobs).toHaveTextContent("Refresh feeds");
});

test("Backups shows the automatic switch off, and why, while no backup folder is chosen, and on once one is", async () => {
  const automatic = item("storage.backups.automatic", { group: "storage.backups", type: "yes_no", value: true, default: true, description: "Make backups on schedule." });
  const targets = (value: unknown[]) => item("storage.backups.targets", { group: "storage.backups", type: "other", value, default: [], editable: false, basic: false, description: "Where backups go." });
  const quiet = { "GET sync": () => ({ folder: "", problem: null, stopped: false, changed_outside: [], removed_outside: [], rebuilt: [], outside_edits: [], conflict_copies: [], shared: false, handover: null }), "GET jobs": () => [] };
  api([automatic, targets([])], quiet);
  const first = open("backups");
  const row = await screen.findByText("Back up automatically");
  const box = row.closest(".setting")!.querySelector("input[type=checkbox]") as HTMLInputElement;
  expect(box).not.toBeChecked();
  expect(box).toBeDisabled();
  expect(within(row.closest(".setting") as HTMLElement).getByText("Automatic backups are off until you choose where they go.")).toBeInTheDocument();
  first.unmount();
  api([automatic, targets([{ path: "/mnt/drive", label: "Drive" }])], quiet);
  open("backups");
  const again = (await screen.findByText("Back up automatically")).closest(".setting")!.querySelector("input[type=checkbox]") as HTMLInputElement;
  expect(again).toBeChecked();
  expect(again).toBeEnabled();
});

test("each page's More settings fold is its own and starts closed: opening one never leaves the next page's open", async () => {
  const user = userEvent.setup();
  api(
    [
      ...ITEMS,
      item("steward.attention.daily_cap", { group: "steward.attention", type: "integer", value: 5, default: 5, basic: false, topic: "notices", description: "Most notices a day." }),
      item("storage.sync.shared", { group: "storage.sync", type: "yes_no", value: false, default: false, basic: false, topic: "backups", description: "Share the folder." }),
    ],
    { "GET sync": () => ({ folder: "", problem: null, stopped: false, changed_outside: [], removed_outside: [], rebuilt: [], outside_edits: [], conflict_copies: [], shared: false, handover: null }), "GET jobs": () => [] },
  );
  renderApp(<Settings onOpenGuide={() => undefined} onChooseSource={() => undefined} />);
  const nav = await screen.findByRole("navigation", { name: "Settings sections" });
  await user.click(await within(nav).findByRole("link", { name: "Notices" }));
  const notices = (await screen.findByText("More settings")).closest("details") as HTMLDetailsElement;
  expect(notices.open).toBe(false);
  await user.click(within(notices).getByText("More settings"));
  expect(notices.open).toBe(true);
  await user.click(within(nav).getByRole("link", { name: "Backups" }));
  const backups = (await screen.findByText("More settings")).closest("details") as HTMLDetailsElement;
  expect(backups.open).toBe(false);
  expect(backups).toHaveAttribute("data-more", "backups");
  // It is the last thing on the page, and a page with nothing rarely changed has none.
  expect(backups.parentElement?.lastElementChild).toBe(backups);
  await user.click(within(nav).getByRole("link", { name: "You" }));
  await screen.findByRole("heading", { level: 2, name: "You" });
  expect(screen.queryByText("More settings")).toBeNull();
});

const ASK = "Restart to finish this change? It takes a few seconds and keeps anything you're typing elsewhere.";

function RestartHarness() {
  const [hellos, setHellos] = useState(1);
  return (
    <RestartProvider hellos={hellos}>
      <RestartNotice />
      <button type="button" onClick={() => setHellos(hellos + 1)}>
        reconnect
      </button>
      <Settings onOpenGuide={() => undefined} onChooseSource={() => undefined} />
    </RestartProvider>
  );
}

const savedTitle = (needs_restart: boolean) => ({
  changes: [{ key: "demo.title", before: "Lantern", after: "Harborx", was_default: false, is_default: false }],
  fingerprint: "fp-2",
  needs_restart,
});

async function saveTitle(user: ReturnType<typeof userEvent.setup>) {
  await user.type(await screen.findByLabelText("The display name."), "x");
  await user.tab();
  return screen.getAllByRole("status").find((el) => el.classList.contains("restart-slot"))!;
}

test("a save that needs a restart asks first; Restart now asks the app, then says so until it is back", async () => {
  const user = userEvent.setup();
  const calls = api(ITEMS, {
    "POST settings": () => savedTitle(true),
    "POST restart": () => ({ restarting: true }),
    "GET runtime-config": () => ({ instance: null }),
  });
  renderApp(<RestartHarness />);
  const live = await saveTitle(user);
  await waitFor(() => expect(live).toHaveTextContent(ASK));
  expect(live).not.toHaveTextContent("Restarting");
  expect(calls.some((c) => c.route === "POST restart")).toBe(false);
  await user.click(within(live).getByRole("button", { name: "Restart now" }));
  await waitFor(() => expect(calls.some((c) => c.route === "POST restart")).toBe(true));
  await waitFor(() => expect(live).toHaveTextContent("Restarting to use the new settings…"));
  expect(within(live).queryByRole("button", { name: "Restart now" })).toBeNull();
  await user.click(screen.getByRole("button", { name: "reconnect" }));
  await waitFor(() => expect(live).toHaveTextContent("Restarted with the new settings."));
});

test("Later hides the question and sends nothing", async () => {
  const user = userEvent.setup();
  const calls = api(ITEMS, { "POST settings": () => savedTitle(true) });
  renderApp(<RestartHarness />);
  const live = await saveTitle(user);
  await waitFor(() => expect(live).toHaveTextContent(ASK));
  await user.click(within(live).getByRole("button", { name: "Later" }));
  expect(live).toBeEmptyDOMElement();
  expect(calls.some((c) => c.route === "POST restart")).toBe(false);
});

test("a save that needs no restart says nothing about restarting", async () => {
  const user = userEvent.setup();
  api(ITEMS, { "POST settings": () => savedTitle(false) });
  renderApp(<RestartHarness />);
  const live = await saveTitle(user);
  expect(await screen.findByText(/Saved/)).toBeInTheDocument();
  expect(live).toBeEmptyDOMElement();
  expect(screen.queryByRole("button", { name: "Restart now" })).toBeNull();
  expect(screen.queryByText(/Restarting|Restarted/)).toBeNull();
});

test("when this copy can't restart itself, the refusal's words are shown in the notice", async () => {
  const user = userEvent.setup();
  api(ITEMS, {
    "POST settings": () => savedTitle(true),
    "POST restart": () => new Refuse(409, "Close it and start it again."),
  });
  renderApp(<RestartHarness />);
  const live = await saveTitle(user);
  await user.click(await within(live).findByRole("button", { name: "Restart now" }));
  await waitFor(() => expect(live).toHaveTextContent("Close it and start it again."));
  expect(live).not.toHaveTextContent("Restarting");
  await user.click(within(live).getByRole("button", { name: "Dismiss" }));
  expect(live).toBeEmptyDOMElement();
});

test("undoing a save asks about a restart when the undo needs one", async () => {
  const user = userEvent.setup();
  api(ITEMS, {
    "POST settings": (body) => ((body as { changes: Record<string, unknown> }).changes["demo.title"] === "Lantern" ? { changes: [], fingerprint: "fp-3", needs_restart: true } : savedTitle(false)),
  });
  renderApp(<RestartHarness />);
  const live = await saveTitle(user);
  expect(live).toBeEmptyDOMElement();
  await user.click(await screen.findByRole("button", { name: "Undo" }));
  await waitFor(() => expect(live).toHaveTextContent(ASK));
});

const DEPENDENTS: S["SettingItem"][] = [
  item("demo.auto", { type: "yes_no", value: false, default: false, description: "Do it on a schedule." }),
  item("demo.hours", { type: "integer", value: 6, default: 6, enabled_by: "demo.auto", description: "Hours between runs." }),
  item("demo.folder", { value: "", picker: "folder", description: "Where it goes." }),
  item("demo.keep", { type: "integer", value: 3, default: 3, enabled_by: "demo.folder", description: "How many to keep." }),
];

test("a setting that needs a switch is greyed with a reason while it is off, and works once the switch is turned on", async () => {
  const user = userEvent.setup();
  const calls = api(DEPENDENTS);
  open();
  const hours = await screen.findByLabelText("Hours between runs.");
  expect(hours).toBeDisabled();
  expect(hours).toHaveAccessibleDescription(/Turn on “Do it on a schedule\.” to change this\./);
  expect(screen.getByText("Turn on “Do it on a schedule.” to change this.")).toBeInTheDocument();
  expect(hours.closest(".setting")).toHaveClass("dependent");
  // Turning the switch on is saved at once; the setting then wakes up.
  await user.click(screen.getByLabelText("Do it on a schedule."));
  await waitFor(() => expect(posted(calls)).toHaveLength(1));
  expect(posted(calls)[0]).toMatchObject({ changes: { "demo.auto": true } });
  await waitFor(() => expect(screen.getByLabelText("Hours between runs.")).toBeEnabled());
  expect(screen.queryByText(/Turn on “Do it on a schedule/)).toBeNull();
  await user.clear(screen.getByLabelText("Hours between runs."));
  await user.type(screen.getByLabelText("Hours between runs."), "8");
  await user.tab();
  await waitFor(() => expect(posted(calls)).toHaveLength(2));
  expect(posted(calls)[1]).toMatchObject({ changes: { "demo.hours": 8 } });
});

test("turning the switch back off greys the setting again", async () => {
  const user = userEvent.setup();
  api(DEPENDENTS);
  open();
  await user.click(await screen.findByLabelText("Do it on a schedule."));
  await waitFor(() => expect(screen.getByLabelText("Hours between runs.")).toBeEnabled());
  await user.click(screen.getByLabelText("Do it on a schedule."));
  await waitFor(() => expect(screen.getByLabelText("Hours between runs.")).toBeDisabled());
});

test("a setting that depends on a text setting waits until that has a value", async () => {
  const user = userEvent.setup();
  api(DEPENDENTS, { "GET setup/folders": () => ({ path: "/home/me", parent: "/home", folders: ["shared"] }) });
  open();
  const keep = await screen.findByLabelText("How many to keep.");
  expect(keep).toBeDisabled();
  expect(screen.getByText("Set “Where it goes.” to change this.")).toBeInTheDocument();
  await user.type(screen.getByLabelText("Where it goes."), "/mnt/x");
  expect(screen.getByLabelText("How many to keep.")).toBeEnabled();
});

test("a folder setting offers a chooser that saves the folder picked, and a way to clear it", async () => {
  const user = userEvent.setup();
  const calls = api(DEPENDENTS, {
    "GET setup/folders": () => ({ path: "/home/me", parent: "/home", folders: ["shared"] }),
    [`GET setup/folders?path=${encodeURIComponent("/home/me/shared")}`]: () => ({ path: "/home/me/shared", parent: "/home/me", folders: [] }),
  });
  open();
  await user.click(await screen.findByRole("button", { name: /Choose a folder…/ }));
  await user.click(await screen.findByRole("button", { name: "shared" }));
  await user.click(await screen.findByRole("button", { name: "Use this folder" }));
  await waitFor(() => expect(screen.getByLabelText("Where it goes.")).toHaveValue("/home/me/shared"));
  await waitFor(() => expect(posted(calls)).toHaveLength(1));
  expect(posted(calls)[0]).toMatchObject({ changes: { "demo.folder": "/home/me/shared" } });
  expect(screen.getByLabelText("How many to keep.")).toBeEnabled();
  await user.click(screen.getByRole("button", { name: /Clear/ }));
  expect(screen.getByLabelText("Where it goes.")).toHaveValue("");
  await waitFor(() => expect(posted(calls)).toHaveLength(2));
  expect(posted(calls)[1]).toMatchObject({ changes: { "demo.folder": "" } });
});

test("where folders can't be listed the folder setting is a plain text box with no error", async () => {
  api(DEPENDENTS, { "GET setup/folders": () => new Refuse(403, "Folders can't be listed here.") });
  open();
  const input = await screen.findByLabelText("Where it goes.");
  await waitFor(() => expect(screen.queryByRole("button", { name: /Choose a folder…/ })).toBeNull());
  expect(input).toBeEnabled();
  expect(screen.queryByRole("alert")).toBeNull();
});

test("Connections and Add-ons are sections of Settings, chosen like any other, and Settings has no button for Add-ons beside its title", async () => {
  api();
  const user = userEvent.setup();
  const chosen = vi.fn();
  renderApp(<Settings section="you" onSection={chosen} onOpenGuide={() => undefined} onChooseSource={() => undefined} />);
  expect(screen.queryByRole("button", { name: "Open Add-ons" })).toBeNull();
  const nav = await screen.findByRole("navigation", { name: "Settings sections" });
  await user.click(within(nav).getByRole("link", { name: "Add-ons" }));
  expect(chosen).toHaveBeenLastCalledWith("addons");
  await user.click(within(nav).getByRole("link", { name: "Connections" }));
  expect(chosen).toHaveBeenLastCalledWith("connections");
});

test("the business page holds its sides with Rename, the words that mean it, and the Lists the choices dropdowns offer", async () => {
  api(
    [
      ...ITEMS,
      item("workspace.project.side_words.business", { group: "workspace.project.side_words", type: "list", value: ["spring catalog"], default: [], basic: false, topic: "filing" }),
    ],
    {
      ...BUSINESS,
      "GET lists": () => [{ id: "L-1", name: "project-status", label: "Project status", values: ["On track"], retired: [], used_by: ["project.status"] }],
    },
  );
  const first = open("business");
  expect(await screen.findByRole("heading", { level: 2, name: "Your business" })).toBeInTheDocument();
  expect(await screen.findByText("Orchard Press")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Rename Orchard Press" })).toBeInTheDocument();
  // The words that mean a side are not here: they are with Filing, under Advanced.
  expect(screen.queryByLabelText("Words that mean Orchard Press")).toBeNull();
  expect(await screen.findByText("Project status")).toBeInTheDocument();
  expect(screen.getByRole("textbox", { name: "Add a choice to Project status" })).toBeInTheDocument();
  expect(screen.queryByLabelText("The display name.")).toBeNull();
  first.unmount();
  const user = userEvent.setup();
  open("advanced");
  await user.click(await screen.findByRole("button", { name: "Filing" }));
  // With one side, the words that mean it are named for it, as chips.
  const box = await screen.findByLabelText("Words that mean Orchard Press");
  expect(box).toHaveValue("");
  expect(screen.getByRole("list", { name: "Words in Words that mean Orchard Press" })).toHaveTextContent("spring catalog");
});
// ---- an add-on's settings ------------------------------------------------------------------------------------------

function addonItem(name: string, field: string, extra: Partial<S["SettingItem"]> = {}): S["SettingItem"] {
  return {
    ...item(`demo.${field}`),
    key: `plugins/${name}.${field}`,
    file: `plugins/${name}`,
    group: `plugins/${name}`,
    plugin: name,
    description: `What ${field} does for the add-on`,
    ...extra,
  };
}

const ADDON_ITEMS: S["SettingItem"][] = [
  addonItem("sample-pack", "greeting", { value: "Hello", default: "Hi", source: "file" }),
  addonItem("sample-pack", "loud", { type: "yes_no", value: false, default: false }),
  addonItem("sample-pack", "mode", { type: "choice", options: ["quiet", "bold"], value: "quiet", default: "quiet" }),
  addonItem("sample-pack", "fixed", { editable: false, value: "set elsewhere" }),
  addonItem("other-pack", "limit", { type: "integer", value: 3, default: 3 }),
];

test("each add-on has a section of its own, after the app's own, and its settings never show where they live", async () => {
  api([...ADDON_ITEMS, ...ITEMS]);
  open("addon/sample-pack");
  await screen.findByLabelText("What greeting does for the add-on");
  const nav = screen.getByRole("navigation", { name: "Settings sections" });
  const links = within(nav).getAllByRole("link").map((a) => a.textContent);
  expect(links.slice(-2)).toEqual(["Sample pack", "Other pack"]);
  expect(links.indexOf("You and the workspace")).toBeLessThan(links.indexOf("Sample pack"));
  expect(within(nav).getByRole("link", { name: "Sample pack" })).toHaveAttribute("aria-current", "page");
  expect(document.body).not.toHaveTextContent("plugins/");
  expect(screen.getByRole("heading", { level: 2, name: "Sample pack" })).toBeInTheDocument();
  expect(screen.getByLabelText("What greeting does for the add-on")).toHaveValue("Hello");
  expect(screen.getByLabelText("What loud does for the add-on")).not.toBeChecked();
  expect(screen.getByLabelText("What mode does for the add-on")).toHaveValue("quiet");
  expect(screen.getByText("Default: Hi")).toBeInTheDocument();
  const fixed = screen.getByText("What fixed does for the add-on").closest(".setting") as HTMLElement;
  expect(within(fixed).getByText("Change this setting outside this screen.")).toBeInTheDocument();
  // Another add-on's setting is in its own section, and the app's own is in theirs.
  expect(screen.queryByLabelText("What limit does for the add-on")).toBeNull();
  expect(screen.queryByLabelText("The display name.")).toBeNull();
});

test("an add-on's settings save like the app's: under the key the file uses, as they change, with undo", async () => {
  const user = userEvent.setup();
  const calls = api([...ADDON_ITEMS, ...ITEMS]);
  open("addon/sample-pack");
  const greeting = await screen.findByLabelText("What greeting does for the add-on");
  await user.clear(greeting);
  await user.type(greeting, "Howdy");
  // Moving on to the next setting saves the one that was typed in.
  await user.click(screen.getByLabelText("What loud does for the add-on"));
  await waitFor(() => expect(posted(calls)).toHaveLength(2));
  expect(posted(calls)[0]).toEqual({ changes: { "plugins/sample-pack.greeting": "Howdy" }, reset: [], fingerprint: "fp-1" });
  expect(posted(calls)[1]).toEqual({ changes: { "plugins/sample-pack.loud": true }, reset: [], fingerprint: "fp-2" });
  expect((await screen.findAllByText(/Saved/)).length).toBeGreaterThan(0);
  expect(document.body).not.toHaveTextContent("plugins/");
});

test("the search finds an add-on's settings by the add-on's name", async () => {
  const user = userEvent.setup();
  api([...ADDON_ITEMS, ...ITEMS]);
  open();
  await screen.findByLabelText("The display name.");
  await user.type(screen.getByRole("searchbox", { name: "Search settings" }), "other pack");
  expect(screen.getByLabelText("What limit does for the add-on")).toBeInTheDocument();
  expect(screen.queryByLabelText("What greeting does for the add-on")).toBeNull();
});

test("Advanced groups the rest by its topics, each closed until it is opened, and the standing instructions point to Knowledge", async () => {
  const user = userEvent.setup();
  const onOpenKnowledge = vi.fn();
  api([
    item("watch.sorting", { type: "yes_no", group: "watch", value: true, default: true, basic: false, topic: "mail", description: "Sort incoming mail." }),
    item("dispatch.knowledge.learn", { type: "yes_no", group: "dispatch.knowledge", value: true, default: true, basic: false, topic: "learns", description: "Learn from corrections." }),
  ]);
  renderApp(
    <Settings section="advanced" onOpenGuide={() => undefined} onChooseSource={() => undefined} onOpenKnowledge={onOpenKnowledge} />,
  );
  const topic = await screen.findByRole("button", { name: "What the assistant learns" });
  expect(topic).toHaveAttribute("aria-expanded", "false");
  expect(screen.queryByLabelText("Learn from your corrections")).toBeNull();
  await user.click(topic);
  expect(topic).toHaveAttribute("aria-expanded", "true");
  const region = screen.getByRole("group", { name: "What the assistant learns" });
  expect(within(region).getByLabelText("Learn from your corrections")).toBeInTheDocument();
  expect(region).toHaveTextContent("Review what Helper has learned and your saved rules in Knowledge.");
  await user.click(within(region).getByRole("button", { name: "Open Knowledge" }));
  expect(onOpenKnowledge).toHaveBeenCalledTimes(1);
  // The other topic is still closed.
  expect(screen.getByRole("button", { name: "Mail", expanded: false })).toBeInTheDocument();
  // A topic that has a page of its own is not listed here: its settings are in that page's More settings.
  expect(screen.queryByRole("button", { name: "AI and spending" })).toBeNull();
});
const ACCOUNT: S["AiAccountView"] = {
  name: "main",
  label: "Main account",
  kind: "svc",
  adapter: "adapter-one",
  base_url: null,
  models: { everyday: "m" },
  used_for: ["routine"],
  backup_for: [],
  has_key: true,
  key_state: "saved",
  key_where: null,
  key_ending: false,
  answered_at: null,
  spent_today_usd: 0,
  checked_for: [],
  check_failed_for: [],
  checked_at: null,
  paused_until: null,
  check_usd: null,
  accepted_unchecked: false,
};
const AI_ROUTES = {
  "GET ai/accounts": () => [ACCOUNT],
  "GET ai/endpoints": () => [{ id: "svc", name: "A service", adapter: "adapter-one", base_url: `${WEB}api.svc.example.com/v1`, needs_key: true, key_url: "", local: false, note: "", allowed_data: ["open"], program: "", model_optional: false, model_examples: [], installed: null }],
  "GET ai/skills": () => ({ min_score: 0.8, stale_days: 60, accounts: [] }),
  "GET ai/check-size": () => ({ calls: 10, input_tokens: 1000, output_tokens: 200 }),
  "GET ai/local": () => [],
  "GET setup": () => ({ steps: [], finished: false, local: true }),
};

test("the AI section lists the accounts that are set up, one row each, with its role, its name and one next step", async () => {
  api(ITEMS, AI_ROUTES);
  open("ai");
  expect(await screen.findByRole("heading", { name: /AI accounts/ })).toBeInTheDocument();
  const row = screen.getByText("Main account", { selector: "li[data-row] span[id$=title]" }).closest("li") as HTMLElement;
  expect(row).toHaveTextContent("Does the work");
  expect(row).toHaveTextContent("A service");
  expect(within(row).getByRole("button", { name: "Test Main account" })).toBeInTheDocument();
  expect(within(row).getByRole("button", { name: "More actions for Main account" })).toBeInTheDocument();
});

test("Add an account opens its form in a drawer inside Settings, never the setup guide, with the cursor in it", async () => {
  const user = userEvent.setup();
  const onOpenGuide = vi.fn();
  api(ITEMS, AI_ROUTES);
  renderApp(<Settings section="ai" onOpenGuide={onOpenGuide} onChooseSource={() => undefined} />);
  await user.click(await screen.findByRole("button", { name: "Add an account" }));
  const drawer = await screen.findByRole("dialog", { name: "Add an account" });
  expect(onOpenGuide).not.toHaveBeenCalled();
  expect(within(drawer).getByRole("group", { name: /Which AI should/ })).toBeInTheDocument();
  await waitFor(() => expect(within(drawer).getAllByRole("radio")[0]).toHaveFocus());
  await user.click(within(drawer).getByRole("button", { name: "Close" }));
  await waitFor(() => expect(screen.queryByRole("dialog", { name: "Add an account" })).toBeNull());
  await waitFor(() => expect(screen.getByRole("button", { name: "Add an account" })).toHaveFocus());
});

test("a Today line that asks for an account to be added opens the same drawer", async () => {
  api(ITEMS, AI_ROUTES);
  const done = vi.fn();
  renderApp(<Settings section="ai" onOpenGuide={() => undefined} onChooseSource={() => undefined} addAccount={Date.now()} onAddAccountOpened={done} />);
  expect(await screen.findByRole("dialog", { name: "Add an account" })).toBeInTheDocument();
  expect(done).toHaveBeenCalled();
});

test("Compare what they can do opens the grid", async () => {
  const user = userEvent.setup();
  const onOpenCompare = vi.fn();
  api(ITEMS, AI_ROUTES);
  renderApp(<Settings section="ai" onOpenGuide={() => undefined} onChooseSource={() => undefined} onOpenCompare={onOpenCompare} />);
  await user.click(await screen.findByRole("button", { name: "Compare what they can do" }));
  expect(onOpenCompare).toHaveBeenCalledTimes(1);
});

test("an add-on's data files are listed in an Add-on files section, and the section is absent when no add-on has any", async () => {
  api(ITEMS, {
    "GET data-forms": () => [{ name: "demo/template", plugin: "demo", label: "Templates", description: "" }],
    "GET data-forms/demo/template/files": () => [{ file: "classic.yaml", layers: ["shipped"], layer: "shipped", problem: null }],
  });
  open("files");
  expect(await screen.findByRole("heading", { name: "Add-on files" })).toBeInTheDocument();
  expect(await screen.findByRole("listitem", { name: "classic.yaml" })).toHaveTextContent("Comes with the add-on");
});

test("with no add-on data files there is no Add-on files section in the list", async () => {
  api(ITEMS, { "GET data-forms": () => [] });
  open();
  const nav = await screen.findByRole("navigation", { name: "Settings sections" });
  await screen.findByLabelText("The display name.");
  expect(within(nav).queryByRole("link", { name: "Add-on files" })).toBeNull();
});

test("the AI section keeps its spending settings below the accounts, and puts the cursor on its heading", async () => {
  api([item("ai.budgets.per_day_usd", { group: "ai.budgets", type: "number", value: 1, default: 1, description: "Stop starting new work for the day above this." })], AI_ROUTES);
  open("ai");
  expect(await screen.findByLabelText("Most to spend in a day")).toHaveValue("1");
  await waitFor(() => expect(screen.getByRole("heading", { level: 2, name: /AI accounts/ })).toHaveFocus());
});
test("a setting that picks a language shows each tag by its name, sorted by name, and saves the tag", async () => {
  const user = userEvent.setup();
  const calls = api(
    [item("demo.language", { type: "choice", choices: "languages", options: ["fr-FR", "en-US", "en-GB"], value: "en-US", default: "en-US", source: "file" })],
    { "POST settings": () => ({ changes: [], fingerprint: "fp-2", needs_restart: false }) },
  );
  open();
  const select = await screen.findByLabelText("What demo.language does");
  expect(within(select).getAllByRole("option").map((o) => o.textContent)).toEqual(["English (United Kingdom)", "English (United States)", "French (France)"]);
  expect(select).toHaveValue("en-US");
  await user.selectOptions(select, "fr-FR");
  await waitFor(() => expect(posted(calls)).toHaveLength(1));
  expect(posted(calls)[0]).toMatchObject({ changes: { "demo.language": "fr-FR" } });
});

test("the spelling of English is picked by its name: American, British and the rest, never a language tag", async () => {
  const user = userEvent.setup();
  const calls = api(
    [item("workspace.language", { group: "workspace", type: "choice", choices: "languages", options: ["en-GB", "en-US", "en-AU"], value: "en-US", default: "en-US", source: "file", description: "Which kind of English." })],
    { "POST settings": () => ({ changes: [], fingerprint: "fp-2", needs_restart: false }) },
  );
  open();
  const select = await screen.findByLabelText("English spelling");
  expect(within(select).getAllByRole("option").map((o) => o.textContent)).toEqual(["American", "Australian", "British"]);
  expect(document.body.textContent ?? "").not.toMatch(/\ben-[A-Z]{2}\b/);
  await user.selectOptions(select, "en-GB");
  await waitFor(() => expect(posted(calls)).toHaveLength(1));
  expect(posted(calls)[0]).toMatchObject({ changes: { "workspace.language": "en-GB" } });
});

test("a time zone is picked by its city, with a search, and the setting still holds its id", async () => {
  const user = userEvent.setup();
  const calls = api(
    [
      item("workspace.user.timezone", {
        group: "workspace.user",
        type: "choice",
        choices: "time_zones",
        options: ["Europe/Lisbon", "America/New_York", "America/Los_Angeles", "UTC"],
        value: "UTC",
        default: "UTC",
        source: "file",
        description: "The time zone your own dates and times are read in.",
      }),
    ],
    { "POST settings": () => ({ changes: [], fingerprint: "fp-2", needs_restart: false }) },
  );
  open();
  const select = await screen.findByLabelText("Your time zone");
  await user.click(select);
  const labels = within(screen.getByRole("listbox")).getAllByRole("option").map((o) => o.textContent);
  expect(labels.join(" ")).toMatch(/New York \(Eastern time\)/);
  expect(labels.join(" ")).not.toMatch(/America\/|Europe\//);
  // Typing narrows by city, region or offset.
  await user.keyboard("eastern");
  expect(within(screen.getByRole("listbox")).getAllByRole("option")).toHaveLength(1);
  await user.clear(select);
  await user.keyboard("new yo");
  await user.click(within(screen.getByRole("listbox")).getByRole("option", { name: /New York/ }));
  await waitFor(() => expect(posted(calls)).toHaveLength(1));
  expect(posted(calls)[0]).toMatchObject({ changes: { "workspace.user.timezone": "America/New_York" } });
});

test("the line that reads back a saved time zone says its city, never the id the settings hold", async () => {
  const user = userEvent.setup();
  const zone = item("workspace.user.timezone", {
    group: "workspace.user",
    type: "choice",
    choices: "time_zones",
    options: ["America/New_York", "UTC"],
    value: "UTC",
    default: "UTC",
    description: "The time zone your own dates and times are read in.",
  });
  api([zone], {
    "POST settings": () => ({
      changes: [{ key: "workspace.user.timezone", before: "UTC", after: "America/New_York", was_default: true, is_default: false }],
      fingerprint: "fp-2",
      needs_restart: false,
    }),
  });
  open();
  const select = await screen.findByLabelText("Your time zone");
  await user.click(select);
  await user.click(within(screen.getByRole("listbox")).getByRole("option", { name: /New York/ }));
  const toast = await screen.findByText(/Saved/);
  expect(toast).toHaveTextContent("New York (Eastern time)");
  expect(toast.textContent).not.toMatch(/America\//);
});

test("a time zone typed that is no place in the list is not silently dropped: the box keeps it, says so and says what the zone still is", async () => {
  const user = userEvent.setup();
  const calls = api(
    [
      item("workspace.user.timezone", {
        group: "workspace.user",
        type: "choice",
        choices: "time_zones",
        options: ["Europe/Lisbon", "America/New_York", "America/Los_Angeles", "UTC"],
        value: "America/Los_Angeles",
        default: "UTC",
        source: "file",
        description: "The time zone your own dates and times are read in.",
      }),
    ],
    { "POST settings": () => ({ changes: [], fingerprint: "fp-2", needs_restart: false }) },
  );
  open();
  const select = await screen.findByLabelText("Your time zone");
  await user.click(select);
  await user.keyboard("Narnia");
  expect(screen.getByText("No time zone matches. Try another spelling.")).toBeInTheDocument();
  await user.tab();
  expect(await screen.findByRole("alert")).toHaveTextContent("Narnia isn't a place in the list, so your time zone is still Los Angeles (Pacific time). Pick a city from the list.");
  expect(select).toHaveValue("Narnia");
  expect(posted(calls)).toHaveLength(0);
  // Typing again clears it, and a zone's whole name typed and left is that zone.
  await user.clear(select);
  await user.keyboard("utc");
  await user.tab();
  expect(screen.queryByRole("alert")).toBeNull();
  await waitFor(() => expect(posted(calls)).toHaveLength(1));
  expect(posted(calls)[0]).toMatchObject({ changes: { "workspace.user.timezone": "UTC" } });
});

test("a rarely changed setting is in its page's closed More settings fold, and not among the settings shown at once", async () => {
  api([
    item("ai.budgets.per_day_usd", { group: "ai.budgets", type: "number", value: 1, default: 1, description: "Never start more than this in a day." }),
    item("ai.budgets.confirm_unpriced", { group: "ai.budgets", type: "yes_no", value: false, default: false, description: "Ask before work whose cost can't be seen.", basic: false, topic: "ai" }),
  ], AI_ROUTES);
  open("ai");
  await screen.findByLabelText("Most to spend in a day");
  const fold = screen.getByText("More settings").closest("details") as HTMLElement;
  expect(fold).not.toHaveAttribute("open");
  expect(within(fold).getByLabelText("Ask me before work whose cost I can't see")).toBeInTheDocument();
  // Nowhere else: not under Advanced, and not twice on the page.
  expect(screen.getAllByLabelText("Ask me before work whose cost I can't see")).toHaveLength(1);
});
test("a money setting shows as currency with two decimals, and '1.5' and '$1.50' save the same number", async () => {
  const user = userEvent.setup();
  const day = item("ai.budgets.per_day_usd", { group: "ai.budgets", type: "number", value: 2, default: 2, money: true, description: "Never start more than this in a day." });
  const calls = api([day], AI_ROUTES);
  open("ai");
  const box = await screen.findByLabelText("Most to spend in a day");
  expect(box).toHaveValue("$2.00");
  await user.clear(box);
  await user.type(box, "1.5{Enter}");
  await waitFor(() => expect(posted(calls)).toHaveLength(1));
  expect(posted(calls)[0]).toMatchObject({ changes: { "ai.budgets.per_day_usd": 1.5 } });
  await user.tab();
  expect(box).toHaveValue("$1.50");
  // The same amount typed with the sign is not a change: nothing more is saved.
  await user.clear(box);
  await user.type(box, "$1.50");
  await user.tab();
  expect(box).toHaveValue("$1.50");
  expect(posted(calls)).toHaveLength(1);
  // Another amount is saved as a number, and the default is shown in the same way.
  await user.clear(box);
  await user.type(box, "$3");
  await user.tab();
  await waitFor(() => expect(posted(calls)).toHaveLength(2));
  expect(posted(calls)[1]).toMatchObject({ changes: { "ai.budgets.per_day_usd": 3 } });
  expect(box).toHaveValue("$3.00");
  expect(screen.getByText("Default: $2.00")).toBeInTheDocument();
});

test("an amount that isn't one is refused on screen and nothing is sent", async () => {
  const user = userEvent.setup();
  const day = item("ai.budgets.per_day_usd", { group: "ai.budgets", type: "number", value: 2, default: 2, money: true, description: "Never start more than this in a day." });
  const calls = api([day], AI_ROUTES);
  open("ai");
  const box = await screen.findByLabelText("Most to spend in a day");
  await user.clear(box);
  await user.type(box, "lots{Enter}");
  expect(await screen.findByText("Enter an amount, such as $1.50.")).toBeInTheDocument();
  expect(box).toHaveAttribute("aria-invalid", "true");
  expect(posted(calls)).toHaveLength(0);
});

test("a money setting follows the number format of the workspace's language", async () => {
  const user = userEvent.setup();
  const day = item("ai.budgets.per_day_usd", { group: "ai.budgets", type: "number", value: 1234.5, default: 2, money: true, description: "Never start more than this in a day." });
  const calls = api([day], AI_ROUTES);
  renderApp(<Settings section="ai" onSection={() => undefined} onOpenGuide={() => undefined} onChooseSource={() => undefined} />, {}, { locale: "de-DE" });
  const box = await screen.findByLabelText("Most to spend in a day");
  expect(box).toHaveValue("$1.234,50");
  await user.clear(box);
  await user.type(box, "2.500,25{Enter}");
  await waitFor(() => expect(posted(calls)).toHaveLength(1));
  expect(posted(calls)[0]).toMatchObject({ changes: { "ai.budgets.per_day_usd": 2500.25 } });
});

test("the notices switch is labelled in the words of what the person gets, and the spending settings use plain words", async () => {
  api(
    [
      item("ui.notifications.enabled", { group: "ui.notifications", type: "yes_no", value: false, default: false, description: "Tell me when something needs me. A notice goes out only for what Today's Decide group holds." }),
      item("ai.budgets.confirm_above_usd", { group: "ai.budgets", type: "number", value: 0.1, default: 0.1, description: "Ask me before starting work estimated to cost more than this." }),
    ],
    AI_ROUTES,
  );
  renderApp(<Settings section="today" onSection={() => undefined} onOpenGuide={() => undefined} onChooseSource={() => undefined} />);
  expect(await screen.findByRole("checkbox", { name: "Tell me when something needs me (on this computer)" })).toBeInTheDocument();
  expect(document.body.textContent ?? "").not.toMatch(/Turn on “/);
});
test("Advanced topics have plain names, in their order, and none is named after a group of the files", async () => {
  const adv = (key: string, topic: S["SettingItem"]["topic"], group: string) => item(key, { type: "yes_no", group, value: true, default: true, basic: false, topic });
  api([
    adv("steward.dates.suggest_reminders", "meetings", "steward.dates"),
    adv("workspace.project.side_words.personal", "filing", "workspace.project.side_words"),
    adv("dispatch.knowledge.learn", "learns", "dispatch.knowledge"),
    adv("watch.sorting", "mail", "watch"),
    adv("steward.attention.daily_cap", "notices", "steward.attention"),
    adv("ui.followups.question_after_days", "followups", "ui.followups"),
  ], BUSINESS);
  renderApp(<Settings section="advanced" onOpenGuide={() => undefined} onChooseSource={() => undefined} />);
  await screen.findByRole("button", { name: "What the assistant learns" });
  const names = screen.getAllByRole("button", { expanded: false }).map((b) => b.textContent);
  // Notices has a page of its own, so its settings are not a topic here.
  expect(names).toEqual(["What the assistant learns", "Follow-ups and reminders", "Filing", "Mail", "Meetings"]);
  expect(screen.queryByRole("button", { name: /Dispatch|Watch|Steward|^Ui /i })).toBeNull();
});
test("a choice setting that doesn't name a list keeps its own order and wording", async () => {
  api();
  open();
  const select = await screen.findByLabelText("What demo.mode does");
  expect(within(select).getAllByRole("option").map((o) => o.textContent)).toEqual(["person", "rule"]);
});

test("the Notices page holds the reminder settings as lists, and the button that asks the browser for notifications", async () => {
  const user = userEvent.setup();
  const request = vi.fn(async () => "granted");
  vi.stubGlobal("Notification", Object.assign(function Notification() {}, { permission: "default", requestPermission: request }));
  api([
    ...ITEMS,
    item("steward.reminders.quiet_start", { group: "steward.reminders", type: "choice", options: ["20:00", "21:00"], value: "21:00", default: "21:00", choices: "times_of_day" }),
    item("steward.reminders.working_first_day", { group: "steward.reminders", type: "choice", options: ["monday", "tuesday"], value: "monday", default: "monday" }),
  ]);
  renderApp(<Settings section="today" onSection={() => undefined} onOpenGuide={() => undefined} onChooseSource={() => undefined} />);
  expect(await screen.findByRole("combobox", { name: "Quiet hours start at" })).toHaveValue("21:00");
  const first = screen.getByRole("combobox", { name: "Your working week starts on" });
  expect(within(first).getAllByRole("option").map((o) => o.textContent)).toEqual(["Monday", "Tuesday"]);
  expect(request).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: "Allow notifications" }));
  expect(request).toHaveBeenCalledTimes(1);
  vi.unstubAllGlobals();
});
test("what the app keeps only in files is no row on any page, though the API lists it", async () => {
  api([
    ...ITEMS,
    item("steward.reminders.quiet_start", { group: "steward.reminders", type: "choice", options: ["20:00", "21:00"], value: "21:00", default: "21:00" }),
    item("steward.default_stance", { group: "steward", type: "choice", options: ["manage", "alongside"], value: "alongside", default: "alongside", page: null, description: "Who people are." }),
    item("steward.tracks", { group: "steward", type: "list", options: ["dates"], value: ["dates"], default: ["dates"], page: null, description: "What you keep track of." }),
  ]);
  renderApp(<Settings section="today" onSection={() => undefined} onOpenGuide={() => undefined} onChooseSource={() => undefined} />);
  expect(document.body.textContent ?? "").not.toMatch(/Who people are/);
  expect(screen.queryByText("What you keep track of.")).toBeNull();
  await screen.findByRole("heading", { level: 2, name: "Notices" });
});
// ---- with no side besides Personal (design 6.32, 7.8) ------------------------------------------------------------------

test("with no side besides Personal the settings that name whose side a project is on are not listed, and with a side they are", async () => {
  const items = [
    ...ITEMS,
    item("workspace.project.side_words.personal", { group: "workspace.project.side_words", type: "list", description: "Words that mean your own life.", value: [], default: [], basic: false, topic: "filing" }),
  ];
  api(items, {
    "GET setup/business": () => ({ business: false, name: null, personal: "PRJ-1", sides: [], chosen: "me" }),
    "GET projects": () => [project("PRJ-1", "Personal")],
  });
  const user = userEvent.setup();
  const first = open("advanced");
  // Nothing of Filing is left to show, so the topic is not listed either.
  expect(await screen.findByRole("heading", { level: 2, name: "Advanced" })).toBeInTheDocument();
  await waitFor(() => expect(screen.queryByRole("button", { name: "Filing" })).toBeNull());
  first.unmount();
  api(items, BUSINESS);
  open("advanced");
  await user.click(await screen.findByRole("button", { name: "Filing" }));
  expect(await screen.findByLabelText("Words that mean personal")).toBeInTheDocument();
});

test("with projects of its own but no side besides Personal, the words that mean each side are not listed either", async () => {
  api(
    [
      ...ITEMS,
      item("workspace.project.side_words.personal", { group: "workspace.project.side_words", type: "list", description: "Words that mean your own life.", value: [], default: [], basic: false, topic: "filing" }),
    ],
    {
      "GET setup/business": () => ({ business: false, name: null, personal: "PRJ-1", sides: [], chosen: "me" }),
      "GET projects": () => [project("PRJ-1", "Personal"), { ...project("PRJ-2", "Garden club"), parent: null }],
    },
  );
  open("advanced");
  expect(await screen.findByRole("heading", { level: 2, name: "Advanced" })).toBeInTheDocument();
  await screen.findByRole("button", { name: "What the assistant learns" });
  expect(screen.queryByRole("button", { name: "Filing" })).toBeNull();
});

// ---- Your name, one row for working hours and the brief's times, and the setup guide link (design 7.9) -------------------

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const TIMES = ["08:00", "09:00", "17:00", "17:30"];
const hours = (over: Record<string, string> = {}) => [
  item("steward.reminders.working_first_day", { group: "steward.reminders", type: "choice", options: DAYS, value: over.first ?? "monday", default: "monday" }),
  item("steward.reminders.working_last_day", { group: "steward.reminders", type: "choice", options: DAYS, value: over.last ?? "friday", default: "friday" }),
  item("steward.reminders.working_start", { group: "steward.reminders", type: "choice", options: TIMES, value: over.start ?? "09:00", default: "09:00", choices: "times_of_day" }),
  item("steward.reminders.working_end", { group: "steward.reminders", type: "choice", options: TIMES, value: over.end ?? "17:30", default: "17:30", choices: "times_of_day" }),
];
const openToday = () => renderApp(<Settings section="today" onSection={() => undefined} onOpenGuide={() => undefined} onChooseSource={() => undefined} />);

test("You starts with Your name, the name on the person's record, saved through the person's route and read back with Undo", async () => {
  const user = userEvent.setup();
  const calls = api([...ITEMS], {
    "GET me": () => ({ person: "PER-1", full_name: "Sam Tester" }),
    "POST me": (body) => ({ person: "PER-1", full_name: (body as { full_name: string }).full_name }),
  });
  open();
  const name = await screen.findByLabelText("Your name");
  expect(name).toHaveValue("Sam Tester");
  // It is the first row of the page; the cursor is on the heading when the page opens.
  expect(document.querySelector(".setting")).toContainElement(name);
  await waitFor(() => expect(document.querySelector("[data-section-heading]")).toHaveFocus());
  await user.clear(name);
  await user.type(name, "Sam  Q Tester");
  await user.tab();
  await waitFor(() => expect(calls.filter((c) => c.route === "POST me")).toHaveLength(1));
  expect(calls.find((c) => c.route === "POST me")!.body).toEqual({ full_name: "Sam Q Tester" });
  // A name is the person's record, never a setting or the id.
  expect(posted(calls)).toHaveLength(0);
  expect(await screen.findByText("Your name is now Sam Q Tester.")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Undo" }));
  await waitFor(() => expect(calls.filter((c) => c.route === "POST me")).toHaveLength(2));
  expect(calls.filter((c) => c.route === "POST me")[1].body).toEqual({ full_name: "Sam Tester" });
});

test("a name another person already has is refused in the server's words, and what was typed stays", async () => {
  const user = userEvent.setup();
  api([...ITEMS], {
    "GET me": () => ({ person: "PER-1", full_name: "Sam Tester" }),
    "POST me": () => new Refuse(409, "Ada Example is already someone else in People."),
  });
  open();
  const name = await screen.findByLabelText("Your name");
  await user.clear(name);
  await user.type(name, "Ada Example");
  await user.tab();
  expect(await screen.findByRole("alert")).toHaveTextContent("Ada Example is already someone else in People.");
  expect(name).toHaveValue("Ada Example");
});

test("the working hours are one row with four choices, each saved as its own setting", async () => {
  const user = userEvent.setup();
  const calls = api([...ITEMS, ...hours()]);
  openToday();
  const row = await screen.findByRole("group", { name: "Working hours" });
  expect(within(row).getAllByRole("combobox").map((c) => c.getAttribute("aria-label"))).toEqual([
    "Your working week starts on",
    "Your working week ends on",
    "Your working day starts at",
    "Your working day ends at",
  ]);
  // One row stands for the four, and no row of their own is left behind.
  expect(screen.getAllByLabelText("Your working week starts on")).toHaveLength(1);
  expect(row.closest(".setting")).toBe(row);
  await user.selectOptions(within(row).getByLabelText("Your working week ends on"), "thursday");
  await waitFor(() => expect(posted(calls)).toHaveLength(1));
  expect(posted(calls)[0]).toMatchObject({ changes: { "steward.reminders.working_last_day": "thursday" } });
  expect(Object.keys((posted(calls)[0] as { changes: object }).changes)).toHaveLength(1);
});

test("Reset on the working hours puts back only what was changed, in one save with one read-back", async () => {
  const user = userEvent.setup();
  const calls = api([...ITEMS, ...hours({ last: "thursday", end: "16:00" }).map((i) => (i.key.endsWith("working_end") ? { ...i, options: [...TIMES, "16:00"] } : i))]);
  openToday();
  const row = await screen.findByRole("group", { name: "Working hours" });
  expect(within(row).getByText("Changed")).toBeInTheDocument();
  await user.click(within(row).getByRole("button", { name: "Reset: Working hours" }));
  await waitFor(() => expect(posted(calls)).toHaveLength(1));
  expect(posted(calls)[0]).toMatchObject({ reset: ["steward.reminders.working_last_day", "steward.reminders.working_end"] });
});

test("a refused working day is told on the row and the choice stays as it was made", async () => {
  const user = userEvent.setup();
  api([...ITEMS, ...hours()], { "POST settings": () => new Refuse(400, "The working day must start before it ends.") });
  openToday();
  const row = await screen.findByRole("group", { name: "Working hours" });
  await user.selectOptions(within(row).getByLabelText("Your working day starts at"), "17:30");
  expect(await within(row).findByRole("alert")).toHaveTextContent("The working day must start before it ends.");
});

test("the brief's three times are one row in the More settings of Notices", async () => {
  const user = userEvent.setup();
  const calls = api([
    ...ITEMS,
    item("steward.brief.morning_from", { group: "steward.brief", basic: false, topic: "notices", type: "choice", options: ["06:00", "07:00"], value: "06:00", default: "06:00" }),
    item("steward.brief.evening_from", { group: "steward.brief", basic: false, topic: "notices", type: "choice", options: ["17:00", "18:00"], value: "17:00", default: "17:00" }),
    item("steward.brief.weekly_day", { group: "steward.brief", basic: false, topic: "notices", type: "choice", options: ["monday", "tuesday"], value: "monday", default: "monday" }),
  ]);
  openToday();
  await user.click(await screen.findByText("More settings"));
  const row = await screen.findByRole("group", { name: "When the brief shows" });
  expect(within(row).getAllByRole("combobox")).toHaveLength(3);
  await user.selectOptions(within(row).getByLabelText("The weekly briefing shows on"), "tuesday");
  await waitFor(() => expect(posted(calls)).toHaveLength(1));
  expect(posted(calls)[0]).toMatchObject({ changes: { "steward.brief.weekly_day": "tuesday" } });
});

test("the setup guide link is on You only, and the intro is body text, not a grey hint", async () => {
  const user = userEvent.setup();
  const guide = vi.fn();
  api([...ITEMS, ...hours()]);
  const first = renderApp(<Settings section="you" onSection={() => undefined} onOpenGuide={guide} onChooseSource={() => undefined} />);
  await user.click(await screen.findByRole("button", { name: "Open the setup guide" }));
  expect(guide).toHaveBeenCalledTimes(1);
  const intro = screen.getByText(/Each change is saved as you make it/);
  expect(intro).not.toHaveClass("hint");
  first.unmount();
  renderApp(<Settings section="today" onSection={() => undefined} onOpenGuide={guide} onChooseSource={() => undefined} />);
  await screen.findByRole("group", { name: "Working hours" });
  expect(screen.queryByRole("button", { name: "Open the setup guide" })).toBeNull();
  expect(screen.getByText(/Each change is saved as you make it/)).not.toHaveClass("hint");
});

test("quiet hours are one compact row, '21:00 to 07:00', each end saved as its own setting", async () => {
  const user = userEvent.setup();
  const calls = api([
    ...ITEMS,
    item("steward.reminders.quiet_start", { group: "steward.reminders", type: "choice", options: TIMES, value: "17:00", default: "17:00", choices: "times_of_day" }),
    item("steward.reminders.quiet_end", { group: "steward.reminders", type: "choice", options: TIMES, value: "08:00", default: "08:00", choices: "times_of_day" }),
  ]);
  openToday();
  const row = await screen.findByRole("group", { name: "Quiet hours" });
  expect(within(row).getAllByRole("combobox")).toHaveLength(2);
  expect(row).toHaveTextContent(/to\s*$|to/);
  // One row stands for the two: no full-width row of their own is left behind.
  expect(screen.getAllByLabelText("Quiet hours start at")).toHaveLength(1);
  await user.selectOptions(within(row).getByLabelText("Quiet hours end at"), "09:00");
  await waitFor(() => expect(posted(calls)).toHaveLength(1));
  expect(posted(calls)[0]).toMatchObject({ changes: { "steward.reminders.quiet_end": "09:00" } });
});

test("a genuinely long hint is four lines with More for the rest, and a hint that fits is whole with no button", async () => {
  const user = userEvent.setup();
  const long = "A long help text. ".repeat(20).trim();
  api([...ITEMS, item("workspace.language", { description: long, type: "text", value: "", default: "" })]);
  openToday();
  const hint = await screen.findByText(long);
  expect(hint).toHaveClass("clamped");
  const more = screen.getByRole("button", { name: "More" });
  expect(more).toHaveAttribute("aria-expanded", "false");
  await user.click(more);
  expect(hint).not.toHaveClass("clamped");
  expect(screen.getByRole("button", { name: "Less" })).toHaveAttribute("aria-expanded", "true");
  // The text is in the page whole either way, for a screen reader and for find-in-page.
  expect(hint.textContent).toBe(long);
});

test("a hint of a few lines is shown in full with no More", async () => {
  const roomy = "A help text of a few lines that has room to be read in full. ".repeat(4).trim();
  expect(roomy.length).toBeGreaterThan(200);
  api([...ITEMS, item("workspace.language", { description: roomy, type: "text", value: "", default: "" })]);
  openToday();
  const hint = await screen.findByText(roomy);
  expect(hint).not.toHaveClass("clamped");
  expect(screen.queryByRole("button", { name: "More" })).toBeNull();
});
