import "@testing-library/jest-dom/vitest";
import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { S } from "./lib/api";
import { actFixture } from "./lib/acts-fixtures";
import { fakeApi, renderApp, setupView, statusFixture } from "./test-utils";
import { App } from "./App";

const rc = (extra: Partial<S["RuntimeConfig"]> = {}): S["RuntimeConfig"] => ({
  api_base: "api",
  assistant_name: "Helper",
  assistant_named: true,
  base_path: "",
  demo: false,
  feedback_to: "feedback@example.com",
  narrow_below_px: 640,
  logo: false,
  theme: "system",
  density: "comfortable",
  language: "en-US",
  timezone: "UTC",
  pm: null,
  shortcuts: { undo: "u", hand_in: "n", help: "?", ask: "/" },
  toast_seconds: 0,
  version: "9.8.7",
  wording: {},
  workspace_name: "Workspace",
  ...extra,
});

test("the Help menu says the version and opens Write feedback, and focus comes back to the Help button", async () => {
  fakeApi({ "GET panels": () => [], "GET asks": () => [] });
  renderApp(<App rc={rc()} />);
  const user = userEvent.setup();
  const help = screen.getByRole("button", { name: "Help" });
  await user.click(help);
  expect(screen.getByRole("menuitem", { name: "Version 9.8.7" })).toHaveAttribute("aria-disabled", "true");
  await user.click(screen.getByRole("menuitem", { name: "Write feedback" }));
  const dialog = screen.getByRole("dialog", { name: "Write feedback" });
  await user.type(screen.getByLabelText("What happened, or what would help?"), "Hello");
  expect((screen.getByLabelText("Message") as HTMLTextAreaElement).value).toBe("Hello\n\nApp version: 9.8.7\nScreen: Today");
  await user.keyboard("{Escape}");
  await waitFor(() => expect(dialog).not.toBeInTheDocument());
  await waitFor(() => expect(help).toHaveFocus());
});

test("the Ask key comes from the configured shortcuts", async () => {
  fakeApi({ "GET panels": () => [], "GET asks": () => [] });
  renderApp(<App rc={rc({ shortcuts: { undo: "u", hand_in: "n", help: "?", ask: "g" } })} />);
  const user = userEvent.setup();
  await user.keyboard("/");
  expect(screen.queryByRole("dialog")).toBeNull();
  await user.keyboard("g");
  expect(screen.getAllByRole("searchbox")[0]).toHaveFocus();
  expect(screen.queryByRole("dialog")).toBeNull();
});

test("the slash key puts the cursor in the header search field, and Ask is its last row", async () => {
  fakeApi({ "GET panels": () => [], "GET asks": () => [], "GET search": () => ({ results: [{ kind: "person", id: "P-1", title: "Priya Example", detail: null }] }) });
  renderApp(<App rc={rc()} />);
  const user = userEvent.setup();
  await user.keyboard("/");
  const field = screen.getAllByRole("searchbox")[0];
  expect(field).toHaveFocus();
  await user.keyboard("pri");
  expect(field).toHaveValue("pri");
  const rows = await screen.findAllByRole("button", { name: /Priya Example|Ask Helper about/ });
  expect(rows[rows.length - 1]).toHaveTextContent("Ask Helper about “pri”");
});

beforeEach(() => {
  window.location.hash = "";
});

const today = {
  "GET panels": () => [],
  "GET asks": () => [],
  "GET today/agenda": () => [],
  "GET today/todo": () => [],
  "GET today/arrived": () => ({ items: [], left_out: 0 }),
  "GET watch": () => [],
  "GET watch/kinds": () => [
    { name: "demo/feed", label: "A feed", plugin: "demo", items: [] },
    { name: "folder", label: "A folder", plugin: null, items: [] },
  ],
  "GET projects": () => [],
};

test("Connect on Today's empty card opens Sources with the add form open, and only that time", async () => {
  fakeApi(today);
  renderApp(<App rc={rc()} />);
  const user = userEvent.setup();
  await user.click(await screen.findByRole("button", { name: "Connect a calendar" }));
  // The add form opens in a drawer over Connections, which the drawer sets aside while it is open.
  const drawer = await screen.findByRole("dialog", { name: "Add mail, calendar or folder" });
  expect(within(drawer).getByRole("form", { name: "Add mail, calendar or folder" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Connections", hidden: true })).toBeInTheDocument();
  // Going away and coming back by the views doesn't open it again.
  await user.click(within(drawer).getByRole("button", { name: "Close" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  await user.click(screen.getByRole("link", { name: "Go to Today · Workspace" }));
  expect(await screen.findByRole("button", { name: "Connect a mailbox" })).toBeInTheDocument();
  await user.click(within(screen.getByRole("navigation", { name: "Views" })).getByRole("link", { name: "Settings" }));
  await user.click(await within(await screen.findByRole("navigation", { name: "Settings sections" })).findByRole("link", { name: "Connections" }));
  expect(await screen.findByRole("heading", { name: "Connections" })).toBeInTheDocument();
  expect(screen.queryByRole("form", { name: "Add mail, calendar or folder" })).toBeNull();
});

test("Connect a mailbox on Today shows the services to sign in to when there are some, and the form only when there are none", async () => {
  const service: S["SignInView"] = {
    name: "demo/account",
    label: "Demo account",
    status: "signed_out",
    ready: true,
    callback: "http://localhost:8080/auth/demo/callback",
    app: "workspace",
    can_paste: false,
    needs_secret: false,
    set_aside: false,
    several: false,
    default_unusable: false,
    can_act: false,
    own_app_steps: [],
  };
  fakeApi({ ...today, "GET sign-ins": () => [service] });
  renderApp(<App rc={rc()} />);
  const user = userEvent.setup();
  await user.click(await screen.findByRole("button", { name: "Connect a mailbox" }));
  const title = await screen.findByRole("heading", { name: "Accounts" });
  await waitFor(() => expect(title).toHaveFocus());
  expect(screen.queryByRole("form", { name: "Add mail, calendar or folder" })).toBeNull();
});

test("the workspace name goes to Today from any screen", async () => {
  fakeApi(today);
  renderApp(<App rc={rc()} />);
  const user = userEvent.setup();
  await user.click(within(screen.getByRole("navigation", { name: "Views" })).getByRole("link", { name: "Settings" }));
  await user.click(await within(await screen.findByRole("navigation", { name: "Settings sections" })).findByRole("link", { name: "Connections" }));
  expect(await screen.findByRole("heading", { name: "Connections" })).toBeInTheDocument();
  await user.click(screen.getByRole("link", { name: "Go to Today · Workspace" }));
  expect(await screen.findByRole("heading", { level: 1, name: "Today" })).toBeInTheDocument();
});

const quiet = {
  ...today,
  "GET status": () => statusFixture(),
  "GET changes": () => [],
  "GET acts": () => ({ acts: [] }),
  "GET followups": () => [],
  "GET me": () => ({ full_name: "Casey Example", person: null }),
  "GET setup": () => setupView([], { finished: true }),
  "GET runtime-config": () => ({ instance: null }),
};

test("an address names the view it opens, and the sidebar marks it", async () => {
  window.location.hash = "#work/followups";
  fakeApi(quiet);
  renderApp(<App rc={rc()} />);
  expect(await screen.findByRole("heading", { level: 1, name: "Follow-ups" })).toBeInTheDocument();
  expect(within(screen.getByRole("navigation", { name: "Views" })).getByRole("link", { name: "Follow-ups", current: "page" })).toBeInTheDocument();
});

test("the old address of Waiting to go out opens Follow-ups on its To send tab, and the address says so", async () => {
  window.location.hash = "#work/outgoing";
  fakeApi({ ...quiet, "GET acts": () => ({ acts: [actFixture()] }) });
  renderApp(<App rc={rc()} />);
  expect(await screen.findByRole("heading", { level: 1, name: "Follow-ups" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "To send" })).toHaveAttribute("aria-pressed", "true");
  expect(await screen.findByRole("list", { name: "Waiting to go out" })).toBeInTheDocument();
  expect(window.location.hash).toBe("#work/followups");
  expect(within(screen.getByRole("navigation", { name: "Views" })).getByRole("link", { name: "Follow-ups", current: "page" })).toBeInTheDocument();
  expect(within(screen.getByRole("navigation", { name: "Views" })).queryByRole("link", { name: "Waiting to go out" })).toBeNull();
});

test.each([
  ["#sources", "Connections", "#settings/connections"],
  ["#addons", "Add-ons", "#settings/addons"],
])("the old address %s opens the %s section of Settings, beside Settings' side bar, and the address says so", async (hash, name, now) => {
  window.location.hash = hash;
  fakeApi({ ...quiet, "GET watch": () => [], "GET packs": () => ({ enabled: true, feeds: [], available: [], installed: [] }) });
  renderApp(<App rc={rc()} />);
  // Every page of Settings has the same title, and its own section is the heading under it.
  expect(await screen.findByRole("heading", { level: 2, name })).toBeInTheDocument();
  expect(screen.getByRole("heading", { level: 1, name: "Settings" })).toBeInTheDocument();
  expect(window.location.hash).toBe(now);
  const sections = screen.getByRole("navigation", { name: "Settings sections" });
  expect(within(sections).getByRole("link", { name: "Connections" })).toBeInTheDocument();
  expect(within(sections).getByRole("link", { name: "Add-ons" })).toBeInTheDocument();
  expect(within(sections).getByRole("link", { name })).toHaveAttribute("aria-current", "page");
  // Settings stays marked in the side menu, which has neither entry of its own.
  const views = within(screen.getByRole("navigation", { name: "Views" }));
  expect(views.getByRole("link", { name: "Settings", current: "page" })).toBeInTheDocument();
  expect(views.queryByRole("link", { name: "Connections" })).toBeNull();
  expect(views.queryByRole("link", { name: "Add-ons" })).toBeNull();
});

test("the projects and people views open the people and projects screen at their own part", async () => {
  // Someone who hasn't said their life is all personal gets the Projects table (personal only opens Personal's page).
  fakeApi({ ...quiet, "GET setup/business": () => ({ business: false, name: null, personal: null, sides: [], chosen: null }), "GET people": () => [], "GET organizations": () => [], "GET projects": () => [], "GET notes": () => [], "GET sync": () => ({}), "GET jobs": () => [] });
  window.location.hash = "#records/projects";
  const { unmount } = renderApp(<App rc={rc()} />);
  expect(await screen.findByRole("heading", { level: 1, name: "Projects" })).toBeInTheDocument();
  unmount();
  window.location.hash = "#records/people";
  fakeApi({ ...quiet, "GET people": () => [], "GET organizations": () => [], "GET projects": () => [], "GET notes": () => [], "GET sync": () => ({}), "GET jobs": () => [] });
  renderApp(<App rc={rc()} />);
  expect(await screen.findByRole("heading", { level: 1, name: "People" })).toBeInTheDocument();
});

test("older fragments still open their view", async () => {
  window.location.hash = "#welcome";
  fakeApi({ ...quiet, "GET setup": () => setupView([], { finished: false }), "GET packs": () => ({ enabled: true, feeds: [], available: [], installed: [] }) });
  renderApp(<App rc={rc()} />);
  expect(await screen.findByRole("heading", { level: 1, name: "Getting started" })).toBeInTheDocument();
});

test("going to another view moves focus to its heading, but the first load does not take focus", async () => {
  window.location.hash = "";
  fakeApi(quiet);
  renderApp(<App rc={rc()} />);
  const user = userEvent.setup();
  expect(await screen.findByRole("heading", { level: 1, name: "Today" })).not.toHaveFocus();
  await user.click(within(screen.getByRole("navigation", { name: "Views" })).getByRole("link", { name: "Follow-ups" }));
  await waitFor(() => expect(screen.getByRole("heading", { level: 1, name: "Follow-ups" })).toHaveFocus());
});

test("Today's heading carries the date, and every view has one h1", async () => {
  window.location.hash = "";
  fakeApi(quiet);
  renderApp(<App rc={rc()} />);
  const heading = await screen.findByRole("heading", { level: 1, name: "Today" });
  expect(heading.closest("[data-page-header]")?.textContent).toMatch(/^Today\S.*\d/);
  expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
});

test("the style guide opens in a demo workspace, and is not there otherwise", async () => {
  vi.stubEnv("DEV", false);
  window.location.hash = "#styleguide";
  fakeApi(quiet);
  const hidden = renderApp(<App rc={rc()} />);
  await screen.findByRole("link", { name: "Go to Today · Workspace" });
  expect(screen.queryByRole("heading", { level: 1, name: "Style guide" })).toBeNull();
  hidden.unmount();
  fakeApi(quiet);
  renderApp(<App rc={rc({ demo: true })} />);
  expect(await screen.findByRole("heading", { level: 1, name: "Style guide" })).toBeInTheDocument();
  vi.unstubAllEnvs();
});

test("the sidebar is not in the style guide's navigation", async () => {
  window.location.hash = "";
  fakeApi(quiet);
  renderApp(<App rc={rc()} />);
  await screen.findByRole("heading", { level: 1, name: "Today" });
  expect(within(screen.getByRole("navigation", { name: "Views" })).queryByRole("link", { name: "Style guide" })).toBeNull();
});

test("the browser going offline shows in the status chip at once", async () => {
  window.location.hash = "";
  fakeApi(quiet);
  renderApp(<App rc={rc()} />);
  await screen.findByRole("heading", { level: 1, name: "Today" });
  act(() => {
    window.dispatchEvent(new Event("offline"));
  });
  expect(await screen.findByRole("button", { name: "App status: Disconnected · reconnecting" })).toBeInTheDocument();
  // The query library pauses its requests while the browser says it is offline; leave it as found.
  act(() => {
    window.dispatchEvent(new Event("online"));
  });
});

test("below the configured width the sidebar gives way to the bottom bar", async () => {
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: /max-width/.test(query), addEventListener: () => undefined, removeEventListener: () => undefined }));
  window.location.hash = "";
  fakeApi(quiet);
  renderApp(<App rc={rc()} />);
  await screen.findByRole("heading", { level: 1, name: "Today" });
  const bar = screen.getByRole("navigation", { name: "Views" });
  expect(within(bar).getByRole("button", { name: "More" })).toBeInTheDocument();
  expect(within(bar).queryByRole("link", { name: "Stages" })).toBeNull();
  expect(document.documentElement).toHaveAttribute("data-narrow");
  expect(within(screen.getByRole("banner")).queryByRole("button", { name: "Hand something in" })).toBeNull();
  vi.unstubAllGlobals();
  document.documentElement.removeAttribute("data-narrow");
});

test("a plugin's panel on the work tab is a sidebar entry that opens its panel", async () => {
  window.location.hash = "";
  fakeApi({
    ...quiet,
    "GET panels": () => [{ name: "demo/goals", title: "Goals", tab: "work", kind: "demo/goal", view: "table", columns: ["title"], primary_action: null, row_actions: [], new_action: null }],
    "GET panel-rows?name=demo/goals": () => [],
  });
  renderApp(<App rc={rc()} />);
  const user = userEvent.setup();
  await user.click(await screen.findByRole("link", { name: "Goals" }, { timeout: 4000 }));
  expect(await screen.findByRole("heading", { level: 1, name: "Goals" })).toBeInTheDocument();
});

test("a new name for the workspace shows in the header at once, with no reload", async () => {
  let name = "Workspace";
  fakeApi({ ...today, "GET runtime-config": () => rc({ workspace_name: name }) });
  const { client } = renderApp(<App rc={rc()} />);
  expect(await screen.findByRole("link", { name: "Go to Today · Workspace" })).toBeInTheDocument();
  // Saving the name asks every screen to read again, as every save does.
  name = "My projects";
  await act(() => client.invalidateQueries());
  expect(await screen.findByRole("link", { name: "Go to Today · My projects" })).toBeInTheDocument();
  expect(within(screen.getByRole("banner")).getByText("My projects")).toBeInTheDocument();
});
