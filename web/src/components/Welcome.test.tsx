import "@testing-library/jest-dom/vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { S } from "../lib/api";
import { RestartNotice, RestartProvider } from "../lib/restart";
import { Refuse, fakeApi, renderApp, setupStep as step, setupView } from "../test-utils";
import { StepList } from "./Welcome";

const setting = (key: string, value: unknown, extra: Partial<S["SettingItem"]> = {}): S["SettingItem"] => ({
  key,
  file: "workspace",
  group: "workspace",
  description: key,
  type: "text",
  options: [],
  value,
  default: value,
  source: "default",
  locked: false,
  basic: true,
  editable: true,
  ...extra,
});

const ITEMS = [
  setting("workspace.name", "Workspace"),
  setting("workspace.user.timezone", "UTC"),
];

const CORE = ["workspace", "ai", "mail", "backup", "people", "template", "first_note", "addons"];

function api(steps: S["SetupStepView"][], extra: Record<string, (body: unknown) => unknown> = {}) {
  return fakeApi({
    "GET setup": () => setupView(steps),
    "GET settings": () => ({ fingerprint: "fp-1", items: ITEMS }),
    "GET me": () => ({ person: null, full_name: "" }),
    "GET templates": () => [
      {
        id: "tpl-a",
        name: "Book project",
        description: "Chapters and drafts.",
        set_up: false,
        adds: [
          { name: "Chapters", fields: ["Title", "Length"], stages: ["Outline", "Draft", "Final"] },
          { name: "Notes", fields: [], stages: [] },
        ],
      },
      { id: "tpl-b", name: "Event", description: "Dates and tasks.", set_up: false, adds: [{ name: "Dates", fields: ["When"], stages: ["Planned"] }] },
      { id: "tpl-c", name: "Trip", description: "Places and plans.", set_up: true, adds: [{ name: "Places", fields: ["Where"], stages: [] }] },
    ],
    "GET ai/endpoints": () => [],
    ...extra,
  });
}

const open = (props: Partial<Parameters<typeof StepList>[0]> = {}) => {
  const onOpenPeople = vi.fn();
  const onOpenAddons = vi.fn();
  const onHandIn = vi.fn();
  const onChooseSource = vi.fn();
  const view = renderApp(
    <StepList focusStep={null} onOpenPeople={onOpenPeople} onOpenAddons={onOpenAddons} onHandIn={onHandIn} onChooseSource={onChooseSource} {...props} />,
  );
  return { onOpenPeople, onOpenAddons, onHandIn, onChooseSource, ...view };
};

const section = (id: string) => document.querySelector(`[data-step="${id}"]`) as HTMLElement;

test("one section per step, in the server's order, each saying in words where it stands", async () => {
  api([
    step("workspace", { done: true }),
    step("template", { skipped: true }),
    step("ai"),
    step("plugin/tidy", { label: "Connect the tidy-up tool", explanation: "It files things away.", plugin: "plugin" }),
  ]);
  open();
  await screen.findByRole("heading", { name: "Add an AI account and test it" });
  const sections = Array.from(document.querySelectorAll("[data-step]"));
  expect(sections.map((s) => s.getAttribute("data-step"))).toEqual(["workspace", "template", "ai", "plugin/tidy"]);
  expect(within(section("workspace")).getByRole("heading", { name: "Say who you are" })).toBeInTheDocument();
  expect(section("workspace")).toHaveTextContent("Done");
  expect(section("template")).toHaveTextContent("Skipped");
  expect(section("ai")).toHaveTextContent("Not done yet");
  expect(section("plugin/tidy")).toHaveTextContent("Connect the tidy-up tool");
  expect(section("plugin/tidy")).toHaveTextContent("It files things away.");
});

test("Skip posts the step and turns into a way back; Reopen undoes it", async () => {
  const user = userEvent.setup();
  let skipped = false;
  const calls = fakeApi({
    "GET setup": () => setupView([step("backup", { skipped })]),
    "GET settings": () => ({ fingerprint: "fp-1", items: ITEMS }),
    "POST setup/backup/skip": () => {
      skipped = true;
      return { ok: "backup" };
    },
    "POST setup/backup/reopen": () => {
      skipped = false;
      return { ok: "backup" };
    },
  });
  open();
  const button = await screen.findByRole("button", { name: "Skip: Choose a backup folder" });
  await user.click(button);
  await waitFor(() => expect(calls.some((c) => c.route === "POST setup/backup/skip")).toBe(true));
  const back = await screen.findByRole("button", { name: "Set up: Choose a backup folder" });
  // The same button stays in place, so keyboard focus is not lost.
  expect(back).toBe(button);
  expect(back).toHaveFocus();
  expect(section("backup")).toHaveTextContent("Skipped");
  expect(await screen.findByText(/Skipped: Choose a backup folder/)).toBeInTheDocument();
  await user.click(back);
  await waitFor(() => expect(calls.some((c) => c.route === "POST setup/backup/reopen")).toBe(true));
  expect(await screen.findByRole("button", { name: "Skip: Choose a backup folder" })).toBeInTheDocument();
});

test("a plugin's step id keeps its slash in the address, and Undo on the toast puts it back", async () => {
  const user = userEvent.setup();
  const calls = api([step("plugin/tidy", { label: "Connect the tidy-up tool" })], {
    "POST setup/plugin/tidy/skip": () => ({ ok: "plugin/tidy" }),
    "POST setup/plugin/tidy/reopen": () => ({ ok: "plugin/tidy" }),
  });
  open();
  await user.click(await screen.findByRole("button", { name: "Skip: Connect the tidy-up tool" }));
  await user.click(await screen.findByRole("button", { name: "Undo" }));
  await waitFor(() => expect(calls.some((c) => c.route === "POST setup/plugin/tidy/reopen")).toBe(true));
});

test("the template step's skip is called Start empty, and a done step has no skip", async () => {
  api([step("workspace", { done: true }), step("template")]);
  open();
  expect(await screen.findByRole("button", { name: "Start empty: What kind of work is this?" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /Skip: Name the workspace/ })).toBeNull();
});

test("the workspace step starts the time zone from this browser while it is still the default", async () => {
  const user = userEvent.setup();
  vi.spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions").mockReturnValue({ timeZone: "Europe/Paris" } as Intl.ResolvedDateTimeFormatOptions);
  const calls = api([step("workspace")], {
    "POST settings": () => ({ changes: [], fingerprint: "fp-2", needs_restart: false }),
    "POST me": () => ({ person: "PER-1", full_name: "Sam Tester" }),
  });
  open();
  expect(await screen.findByLabelText("Your time zone")).toHaveValue("Europe/Paris");
  await user.type(screen.getByLabelText("Your full name"), "Sam Tester");
  await user.click(screen.getByRole("button", { name: "Save" }));
  await waitFor(() => expect(calls.some((c) => c.route === "POST settings")).toBe(true));
  // The name goes to the person record (the one place it is kept); the time zone is a setting.
  expect(calls.find((c) => c.route === "POST me")!.body).toEqual({ full_name: "Sam Tester", workspace_name: "Sam's" });
  const body = calls.find((c) => c.route === "POST settings")!.body as { changes: Record<string, string> };
  expect(body.changes).toEqual({ "workspace.user.timezone": "Europe/Paris" });
  vi.restoreAllMocks();
});

test("a full name of one word is asked again in words and is not saved; a first and a last name is", async () => {
  const user = userEvent.setup();
  const calls = api([step("workspace")], {
    "POST settings": () => ({ changes: [], fingerprint: "fp-2", needs_restart: false }),
    "POST me": () => ({ person: "PER-1", full_name: "Sam Tester" }),
  });
  open();
  const box = await screen.findByLabelText("Your full name");
  await user.type(box, "Sam");
  expect(await screen.findByText("Add your last name too, so people who share your first name aren't mixed up with you.")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  await user.type(box, " Tester");
  expect(screen.queryByText(/Add your last name too/)).toBeNull();
  await user.click(screen.getByRole("button", { name: "Save" }));
  await waitFor(() => expect(calls.some((c) => c.route === "POST me")).toBe(true));
  expect(calls.filter((c) => c.route === "POST me")).toHaveLength(1);
});

test("on a workspace made by the init command, the defaults written in its files still count as not chosen", async () => {
  // `cockpit init` writes every default into the new workspace's files, so the settings say "file", not "default".
  vi.spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions").mockReturnValue({ timeZone: "America/Chicago" } as Intl.ResolvedDateTimeFormatOptions);
  api([step("workspace")], {
    "GET settings": () => ({
      fingerprint: "fp-1",
      items: [
        setting("workspace.name", "Workspace", { source: "file" }),
        setting("workspace.user.timezone", "UTC", { source: "file" }),
      ],
    }),
  });
  open();
  expect(await screen.findByLabelText("Your time zone")).toHaveValue("America/Chicago");
  expect(screen.queryByLabelText("Name shown at the top")).toBeNull();
  vi.restoreAllMocks();
});

test("the time zone is picked from a list when the setting offers one", async () => {
  const user = userEvent.setup();
  vi.spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions").mockReturnValue({ timeZone: "America/Chicago" } as Intl.ResolvedDateTimeFormatOptions);
  const zones = ["America/Chicago", "America/New_York", "Europe/Paris", "UTC"];
  const calls = api([step("workspace")], {
    "GET settings": () => ({
      fingerprint: "fp-1",
      items: [
        setting("workspace.name", "Workspace", { source: "file" }),
        setting("workspace.user.timezone", "UTC", { source: "file", type: "choice", options: zones }),
      ],
    }),
    "POST settings": () => ({ changes: [], fingerprint: "fp-2", needs_restart: false }),
    "POST me": () => ({ person: "PER-1", full_name: "Sam Tester" }),
  });
  open();
  const zone = await screen.findByRole("combobox", { name: "Your time zone" });
  // One searchable list, starting at this computer's zone, with no separate search box.
  expect(zone).toHaveValue("Chicago (Central time)");
  expect(screen.queryByRole("searchbox")).toBeNull();
  await user.click(zone);
  // Zones are cities with their general names, never the ids the settings hold.
  const labels = within(screen.getByRole("listbox")).getAllByRole("option").map((o) => o.textContent);
  expect(labels.join(" ")).toMatch(/New York \(Eastern time\)/);
  expect(labels.join(" ")).toMatch(/Chicago \(Central time\)/);
  expect(labels.join(" ")).not.toMatch(/America\/|Europe\//);
  await user.keyboard("par");
  expect(within(screen.getByRole("listbox")).getAllByRole("option").map((o) => o.textContent?.split(" UTC")[0])).toEqual(["Paris (Central European time)"]);
  await user.click(within(screen.getByRole("listbox")).getByRole("option"));
  await user.type(screen.getByLabelText("Your full name"), "Sam Tester");
  await user.click(screen.getByRole("button", { name: "Save" }));
  await waitFor(() => expect(calls.some((c) => c.route === "POST settings")).toBe(true));
  const body = calls.find((c) => c.route === "POST settings")!.body as { changes: Record<string, string> };
  expect(body.changes).toEqual({ "workspace.user.timezone": "Europe/Paris" });
  vi.restoreAllMocks();
});

test("the workspace step shows the server's words when a value is refused, and keeps what was typed", async () => {
  const user = userEvent.setup();
  api([step("workspace")], { "POST settings": () => new Refuse(400, "That time zone isn't one we know.") });
  open();
  const zone = await screen.findByLabelText("Your time zone");
  await user.clear(zone);
  await user.type(zone, "Nowhere");
  await user.click(screen.getByRole("button", { name: "Save" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("That time zone isn't one we know.");
  expect(screen.getByLabelText("Your time zone")).toHaveValue("Nowhere");
});

test("the template step applies one template and asks before the app restarts", async () => {
  const user = userEvent.setup();
  const calls = api([step("template")], { "POST templates/apply": () => ({ plugins: [], needs_restart: true }) });
  renderApp(
    <RestartProvider hellos={1}>
      <RestartNotice />
      <StepList focusStep={null} onOpenPeople={() => undefined} onOpenAddons={() => undefined} onHandIn={() => undefined} onChooseSource={() => undefined} />
    </RestartProvider>,
  );
  expect(await screen.findByText("Chapters and drafts.")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Use Event" }));
  await waitFor(() => expect(calls.find((c) => c.route === "POST templates/apply")?.body).toEqual({ id: "tpl-b" }));
  expect(await screen.findByText("Applied Event.")).toBeInTheDocument();
  await waitFor(() => expect(document.querySelector(".restart-slot")).toHaveTextContent("Restart to finish this change?"));
  expect(calls.some((c) => c.route === "POST restart")).toBe(false);
});

test("People & projects and Hand in are buttons that open those screens", async () => {
  const user = userEvent.setup();
  api(CORE.filter((id) => id === "people" || id === "first_note").map((id) => step(id)));
  const { onOpenPeople, onHandIn } = open();
  await user.click(await screen.findByRole("button", { name: "Open People & projects" }));
  await user.click(screen.getByRole("button", { name: "Hand something in" }));
  expect(onOpenPeople).toHaveBeenCalledTimes(1);
  expect(onHandIn).toHaveBeenCalledTimes(1);
});

test("a plugin's step with an action starts that action for the whole workspace", async () => {
  const user = userEvent.setup();
  const calls = api([step("plugin/tidy", { label: "Connect the tidy-up tool", action: "plugin/connect", plugin: "plugin" })], {
    "POST plugin-actions/plugin/connect/preview": () => ({
      token: "tok-1",
      action: "plugin/connect",
      summary: "Connect it",
      ops: [],
      files: [],
      previews: [],
      choices: [],
      notes: [],
      expires_at: "2026-10-09T15:00:00Z",
    }),
  });
  open();
  await user.click(await screen.findByRole("button", { name: "Connect the tidy-up tool" }));
  await waitFor(() => expect(calls.some((c) => c.route === "POST plugin-actions/plugin/connect/preview")).toBe(true));
  expect(calls.find((c) => c.route === "POST plugin-actions/plugin/connect/preview")!.body).toMatchObject({ target: null });
});

test("opening the guide at a step puts focus on that step's heading", async () => {
  api(CORE.map((id) => step(id)));
  open({ focusStep: { id: "backup", n: 1 } });
  const heading = await screen.findByRole("heading", { name: "Choose a backup folder" });
  await waitFor(() => expect(heading).toHaveFocus());
});

test("a plugin's step shows the settings it suggests in words, and Apply sends the current fingerprint", async () => {
  const user = userEvent.setup();
  const calls = api(
    [
      step("plugin/tidy", {
        label: "Connect the tidy-up tool",
        plugin: "plugin",
        settings: { "workspace.name": "Harbor", "storage.backups.automatic": true },
      }),
    ],
    {
      "POST setup/plugin/tidy/apply-settings": () => ({
        changes: [{ key: "workspace.name", before: "Workspace", after: "Harbor", was_default: true, is_default: false }],
        fingerprint: "fp-2",
        needs_restart: false,
      }),
    },
  );
  open();
  const suggested = await screen.findByRole("list", { name: "Suggested settings" });
  expect(within(suggested).getByText("Name shown at the top: Harbor")).toBeInTheDocument();
  expect(within(suggested).getByText("Back up automatically: Yes")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Apply these settings" }));
  await waitFor(() =>
    expect(calls.find((c) => c.route === "POST setup/plugin/tidy/apply-settings")?.body).toEqual({ fingerprint: "fp-1" }),
  );
  // The read-back with Undo, as after any saved setting.
  expect(await screen.findByText("Saved. Name shown at the top: Harbor")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Undo" })).toBeInTheDocument();
});

test("a refused apply is said in words and nothing is read back", async () => {
  const user = userEvent.setup();
  api([step("plugin/tidy", { label: "Connect the tidy-up tool", plugin: "plugin", settings: { "workspace.name": "Harbor" } })], {
    "POST setup/plugin/tidy/apply-settings": () => new Refuse(409, "The settings changed since you looked."),
  });
  open();
  await user.click(await screen.findByRole("button", { name: "Apply these settings" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("The settings changed since you looked.");
});

test("a suggested choice is said by its label, never by the code the settings file holds", async () => {
  api([step("plugin/tidy", { label: "Connect the tidy-up tool", plugin: "plugin", settings: { "workspace.user.timezone": "Europe/London" } })], {
    "GET settings": () => ({
      fingerprint: "fp-1",
      items: [setting("workspace.name", "Workspace"), setting("workspace.user.timezone", "UTC", { type: "choice", choices: "time_zones", options: ["UTC", "Europe/London"] })],
    }),
  });
  open();
  const suggested = await screen.findByRole("list", { name: "Suggested settings" });
  await waitFor(() => expect(suggested).toHaveTextContent("Your time zone: London"));
  expect(suggested).not.toHaveTextContent("Europe/London");
});

test("a step that suggests nothing shows no settings", async () => {
  api([step("plugin/tidy", { label: "Connect the tidy-up tool", plugin: "plugin", settings: {} })]);
  open();
  await screen.findByRole("heading", { name: "Connect the tidy-up tool" });
  expect(screen.queryByRole("button", { name: "Apply these settings" })).toBeNull();
});

describe("a sign-in's step", () => {
  const signInStep = (extra: Partial<S["SetupStepView"]> = {}) =>
    step("demo/mail", {
      sign_in: "demo/mail",
      label: "Demo Mail",
      explanation: "Read your mail; Read your calendar",
      plugin: "demo",
      ...extra,
    });
  let assign: ReturnType<typeof vi.fn<(url: string) => void>>;
  beforeEach(() => {
    assign = vi.fn<(url: string) => void>();
    // The app's own window must never navigate to a service: only the opened window's address is set.
  vi.stubGlobal("location", {
    ...window.location,
    assign: () => {
      throw new Error("The app's window went to a service");
    },
  });
  vi.stubGlobal("open", () => ({
    closed: false,
    close: () => undefined,
    location: {
      set href(value: string) {
        assign(value);
      },
    },
  }));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("reads 'Sign in to {label}', says what will be asked, and Sign in starts the sign-in", async () => {
    const user = userEvent.setup();
    const calls = api([signInStep()], {
      "POST sign-ins/demo/mail/start": () => ({ url: "http://localhost:9090/login?x=1" }),
    });
    open();
    const heading = await screen.findByRole("heading", { name: "Sign in to Demo Mail" });
    expect(heading).toBeInTheDocument();
    const mine = section("demo/mail");
    expect(within(mine).getByText("You'll be asked to allow: Read your mail; Read your calendar")).toBeInTheDocument();
    expect(mine).toHaveTextContent("Not done yet");
    await user.click(within(mine).getByRole("button", { name: "Sign in to Demo Mail" }));
    await waitFor(() => expect(assign).toHaveBeenCalledWith("http://localhost:9090/login?x=1"));
    expect(calls.filter((c) => c.route === "POST sign-ins/demo/mail/start")).toHaveLength(1);
    expect(within(mine).getByRole("button", { name: "Sign in to Demo Mail" })).toHaveTextContent("Opening the sign-in page");
  });

  test("a refusal to start is said on the step and goes nowhere", async () => {
    const user = userEvent.setup();
    api([signInStep()], { "POST sign-ins/demo/mail/start": () => new Refuse(409, "Set the app registration first.") });
    open();
    await user.click(await screen.findByRole("button", { name: "Sign in to Demo Mail" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Set the app registration first.");
    expect(assign).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Sign in to Demo Mail" })).toBeEnabled();
  });

  test("no explanation line when the sign-in asks for nothing to say", async () => {
    api([signInStep({ explanation: "" })]);
    open();
    await screen.findByRole("heading", { name: "Sign in to Demo Mail" });
    expect(screen.queryByText(/You'll be asked to allow/)).toBeNull();
  });

  test("done shows no Sign in button, and skipped can be reopened like any step", async () => {
    api([signInStep({ done: true }), signInStep({ id: "demo/other", sign_in: "demo/other", label: "Demo Other", skipped: true })]);
    open();
    await screen.findByRole("heading", { name: "Sign in to Demo Mail" });
    expect(section("demo/mail")).toHaveTextContent("Done");
    expect(within(section("demo/mail")).queryByRole("button", { name: "Sign in to Demo Mail" })).toBeNull();
    expect(section("demo/other")).toHaveTextContent("Skipped");
    expect(within(section("demo/other")).getByRole("button", { name: "Sign in to Demo Other" })).toBeInTheDocument();
    expect(within(section("demo/other")).getByRole("button", { name: /^Set up: / })).toBeInTheDocument();
  });
});

describe("a sign-in step that is done", () => {
  const done = { sign_in: "demo/mail", label: "Demo Mail", plugin: "demo", done: true };
  const signedIn = (): S["SignInView"] => ({
    name: "demo/mail",
    label: "Demo Mail",
    status: "signed_in",
    ready: true,
    callback: "http://localhost:8080/auth/demo/mail/callback",
    app: "workspace",
    account: "pat@example.com",
    can_paste: false,
    needs_secret: false,
    set_aside: false,
    several: false,
    default_unusable: false,
    can_act: false,
  });

  test("still shows the sign-in row's actions: choose what to read, sign out and sign in again", async () => {
    const user = userEvent.setup();
    api([step("demo/mail", done)], { "GET sign-ins": () => [signedIn()] });
    const { onChooseSource } = open();
    await screen.findByRole("heading", { name: "Sign in to Demo Mail" });
    const mine = section("demo/mail");
    expect(await within(mine).findByText("Signed in as pat@example.com")).toBeInTheDocument();
    await user.click(within(mine).getByRole("button", { name: "Choose what to read from Demo Mail" }));
    expect(onChooseSource).toHaveBeenCalledWith("demo");
    await user.click(within(mine).getByRole("button", { name: "More actions for Demo Mail" }));
    expect(screen.getAllByRole("menuitem").map((m) => m.textContent)).toEqual(["Sign out", "Sign in again"]);
  });
});

test("each template is a name with one line on what it changes, and one already set up says so instead of offering Use", async () => {
  api([step("template")]);
  open();
  const book = (await screen.findByText("Book project")).closest("li") as HTMLElement;
  expect(within(book).getByText("Chapters and drafts.")).toBeInTheDocument();
  // No lists of fields and steps, and nothing about restarts: the app asks for one itself when it is needed.
  expect(within(book).queryByText(/Details:|Steps:|What it adds/)).toBeNull();
  expect(within(book).getByRole("button", { name: "Use Book project" })).toBeInTheDocument();
  const trip = screen.getByText("Trip").closest("li") as HTMLElement;
  expect(trip).toHaveTextContent("Already set up");
  expect(within(trip).queryByRole("button")).toBeNull();
  expect(document.body.textContent ?? "").not.toMatch(/restart/i);
});

test("the template step asks what kind of work this is, in plain words", async () => {
  api([step("template")]);
  open();
  expect(await screen.findByRole("heading", { name: "What kind of work is this?" })).toBeInTheDocument();
  expect(screen.getByText(/Pick a starting point, or start empty\./)).toBeInTheDocument();
});

test("an add-ons step with no add-on installed to turn on is not offered, so it never reads as done", async () => {
  api([step("addons", { applies: false }), step("workspace", { done: true })]);
  open();
  await screen.findByRole("heading", { name: "Say who you are" });
  expect(screen.queryByRole("heading", { name: "Turn on your add-ons" })).toBeNull();
});

const installed = (name: string, enabled: boolean): S["InstalledPackView"] =>
  ({ name, enabled, state: enabled ? "enabled" : "disabled", description: "", reason: null, version: "1.0.0" }) as S["InstalledPackView"];

test("the add-ons step says what add-ons do, names the ones installed but off, and opens the Add-ons screen", async () => {
  const user = userEvent.setup();
  api([step("addons")], {
    "GET packs": () => ({
      enabled: true,
      feeds: [],
      available: [],
      installed: [installed("mail-sample", false), installed("calendar-sample", true), installed("notes-sample", false)],
    }),
  });
  const { onOpenAddons } = open();
  const addons = await screen.findByRole("heading", { name: "Turn on your add-ons" });
  expect(addons).toBeInTheDocument();
  expect(section("addons")).toHaveTextContent(
    "Turn on installed add-ons, then sign in to connect your mail, calendar and other tools.",
  );
  const off = await within(section("addons")).findByRole("list", { name: "Installed but turned off" });
  expect(within(off).getAllByRole("listitem").map((li) => li.textContent)).toEqual(["Mail sample", "Notes sample"]);
  await user.click(within(section("addons")).getByRole("button", { name: "Open Add-ons" }));
  expect(onOpenAddons).toHaveBeenCalledTimes(1);
});

test("the add-ons step with no catalog set says why nothing is listed and where to add one", async () => {
  api([step("addons")], { "GET packs": () => ({ enabled: true, feeds: [], available: [], installed: [] }) });
  open();
  await screen.findByRole("heading", { name: "Turn on your add-ons" });
  const note = await within(section("addons")).findByText(/no catalog is set for this copy of the app/);
  expect(note).toHaveTextContent("Add one with its web address");
});

test("Leave the rest off keeps the installed add-ons off, says so, and refreshes the guide", async () => {
  const user = userEvent.setup();
  let left = false;
  const calls = api([step("addons", { done: left })], {
    "GET packs": () => ({ enabled: true, feeds: [], available: [], installed: [installed("mail-sample", false), installed("calendar-sample", true)] }),
    "POST setup/addons/leave-off": () => {
      left = true;
      return { ok: true };
    },
  });
  open();
  await user.click(await screen.findByRole("button", { name: "Leave the rest off" }));
  expect(await screen.findByText("Left the rest off. You can turn them on any time in Add-ons.")).toBeInTheDocument();
  expect(calls.filter((c) => c.route === "POST setup/addons/leave-off")).toHaveLength(1);
  // The guide is read again after it.
  await waitFor(() => expect(calls.filter((c) => c.route === "GET setup").length).toBeGreaterThan(1));
});

test("the add-ons step has no Leave the rest off when nothing is waiting to be turned on", async () => {
  api([step("addons")], {
    "GET packs": () => ({ enabled: true, feeds: [], available: [], installed: [installed("calendar-sample", true)] }),
  });
  open();
  await screen.findByRole("button", { name: "Open Add-ons" });
  expect(screen.queryByRole("button", { name: "Leave the rest off" })).toBeNull();
});

test("the add-ons step still has its button when nothing is installed or the list didn't load", async () => {
  api([step("addons")]);
  open();
  expect(await screen.findByRole("button", { name: "Open Add-ons" })).toBeInTheDocument();
  expect(screen.queryByText("Installed but turned off")).toBeNull();
});

test("the setup list asks the work question as its own step, with a Save of its own", async () => {
  const user = userEvent.setup();
  const employer = "Employer Example";
  const calls = api([step("work")], {
    "GET setup/business": () => ({ business: false, name: null, personal: "PRJ-1", sides: [], chosen: null }),
    "POST setup/business": (body) => ({ project: "PRJ-2", name: (body as { name: string }).name, kind: "job", created: true, changeset: "CS-1" }),
  });
  open();
  expect(await screen.findByRole("heading", { name: "Say what you'll use it for" })).toBeInTheDocument();
  await user.click(await screen.findByRole("checkbox", { name: "A job" }));
  expect(screen.getByRole("note")).toHaveTextContent("employer's permission");
  expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  await user.type(screen.getByLabelText("What is your employer called?"), employer);
  await user.click(screen.getByRole("button", { name: "Save" }));
  await waitFor(() => expect(calls.find((c) => c.route === "POST setup/business")?.body).toEqual({ name: employer, kind: "job" }));
});

test("a step that adds to a list shows what it adds in words, and Apply sends the current fingerprint", async () => {
  const user = userEvent.setup();
  const calls = api(
    [
      step("plugin/types", {
        label: "Take more files",
        plugin: "plugin",
        adds: { "storage.files.accepted_types": ["application/x-sheet", "text/x-notes"] },
      }),
    ],
    {
      "POST setup/plugin/types/apply-settings": () => ({
        changes: [{ key: "storage.files.accepted_types", before: ["text/plain"], after: ["text/plain", "application/x-sheet", "text/x-notes"], was_default: true, is_default: false }],
        fingerprint: "fp-2",
        needs_restart: false,
      }),
    },
  );
  open();
  const suggested = await screen.findByRole("list", { name: "Suggested additions" });
  expect(within(suggested).getByText("Adds to storage.files.accepted_types: application/x-sheet, text/x-notes")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Apply these settings" }));
  await waitFor(() =>
    expect(calls.find((c) => c.route === "POST setup/plugin/types/apply-settings")?.body).toEqual({ fingerprint: "fp-1" }),
  );
  expect(await screen.findByRole("button", { name: "Undo" })).toBeInTheDocument();
});

test("the step the core adds for an add-on's kinds of files is worded with the add-on's name and offers the same yes", async () => {
  api([step("gadget/file-types", { kind: "file_types", plugin: "gadget", adds: { "storage.files.accepted_types": ["application/x-sheet"] } })]);
  open();
  expect(await screen.findByRole("heading", { name: "Let Gadget take its kinds of files" })).toBeInTheDocument();
  expect(screen.getByText(/Adding them keeps everything already on your list, and you can undo it\./)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Apply these settings" })).toBeInTheDocument();
});

test("the step the core adds for an add-on's own models lists them to choose from, under the add-on", async () => {
  api([step("gadget/tiers", { kind: "tiers", plugin: "gadget" })], {
    "GET ai/accounts": () => [],
    "GET ai/pack-tiers": () => ({
      tiers: [
        { id: "gadget/long", plugin: "gadget", label: "Long reading", description: "", falls_back_to: "deep", mapped: false, account: null, model: null, used_by: [], recommended: null, recommended_why_not: "no_cases" },
      ],
    }),
  });
  open();
  expect(await screen.findByRole("heading", { name: "Choose the models for Gadget" })).toBeInTheDocument();
  expect(await screen.findByRole("region", { name: "Models for Gadget" })).toBeInTheDocument();
  expect(screen.getByText("Long reading")).toBeInTheDocument();
});
