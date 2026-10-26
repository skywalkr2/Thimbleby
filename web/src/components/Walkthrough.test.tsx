import "@testing-library/jest-dom/vitest";
import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect } from "react";
import type { S } from "../lib/api";
import { RestartProvider } from "../lib/restart";
import { announceSignIn } from "../lib/sign-in-window";
import { useToasts } from "../lib/toasts";
import { App } from "../App";
import { Refuse, fakeApi, rcFixture, renderApp, setupStep as step, setupView, statusFixture } from "../test-utils";
import { Walkthrough } from "./Walkthrough";

const CORE = ["workspace", "work", "ai", "mail", "promises", "backup", "people", "template", "first_note", "addons"];
const SETTINGS = [
  {
    key: "ai.budgets.confirm_above_usd",
    file: "ai",
    group: "ai.budgets",
    description: "Ask for a go above this.",
    type: "number",
    options: [],
    value: 0.1,
    default: 0.1,
    source: "default",
    locked: false,
    basic: true,
    editable: true,
  },
  {
    key: "ai.budgets.per_day_usd",
    file: "ai",
    group: "ai.budgets",
    description: "Stop for the day above this.",
    type: "number",
    options: [],
    value: 2,
    default: 2,
    source: "default",
    locked: false,
    basic: true,
    editable: true,
  },
  {
    key: "workspace.name",
    file: "workspace",
    group: "workspace",
    description: "The workspace's name.",
    type: "text",
    options: [],
    value: "Workspace",
    default: "Workspace",
    source: "default",
    locked: false,
    basic: true,
    editable: true,
  },
  {
    key: "workspace.assistant_name",
    file: "workspace",
    group: "workspace",
    description: "The assistant's name.",
    type: "text",
    options: [],
    value: "Reginald",
    default: "Reginald",
    source: "default",
    locked: false,
    basic: true,
    editable: true,
  },
  {
    key: "workspace.user.timezone",
    file: "workspace",
    group: "workspace",
    description: "Your time zone.",
    type: "text",
    options: [],
    value: "UTC",
    default: "UTC",
    source: "default",
    locked: false,
    basic: true,
    editable: true,
  },
] as S["SettingItem"][];

/** The ids and names the work tests use; the names are made up and kept apart from the code that handles them. */
const PERSONAL = "PRJ-1";
const [EMPLOYER, SHOP, STUDIO] = ["Employer Example", "Shop Example", "Studio Example"];
const WORKS_ON = ["First thing", "Second thing", "Third thing"];
const side = (project: string, kind: "job" | "business", name: string, removable = false): S["SideView"] => ({ project, kind, name, removable });
const stateWith = (sides: S["SideView"][], chosen: "me" | "work" | null = "work"): S["BusinessState"] => ({
  business: sides.length > 0,
  name: sides[0]?.name ?? null,
  personal: PERSONAL,
  sides,
  chosen,
});

const NOTHING = { adds: { item_types: [], screens: 0, today: 0, ai_work: 0, actions: 0, setup_steps: 0, sources: 2 } };
const what = (over: Partial<S["PackSummary"]> = {}): S["PackSummary"] => ({
  ...NOTHING,
  reaches: { sign_ins: ["account"], hosts: ["api.service.example.com"], programs: [], keys: 0 },
  keeps: "internal",
  reads: ["mail", "calendar"],
  ...over,
});

const available = (id: string, over: Partial<S["PackView"]> = {}): S["PackView"] => ({
  id,
  name: `Service ${id}`,
  summary: `Reads from service ${id}.`,
  publisher: "Example",
  maintainers: true,
  updated: "",
  version: "1.0.0",
  price: { model: "free", amount: null, currency: "USD", period: null, note: "" },
  homepage: null,
  homepage_domain: null,
  install: "",
  demo: false,
  compatible: true,
  installed_version: null,
  enabled: false,
  what: what(),
  costs: [],
  feed: "catalog.example.com",
  installable: true,
  removable: false,
  ...over,
});

const installedPack = (name: string, over: Partial<S["InstalledPackView"]> = {}): S["InstalledPackView"] => ({
  name,
  version: "1.0.0",
  description: `Reads from service ${name}.`,
  enabled: false,
  state: "off",
  reason: null,
  what: what(),
  removable: true,
  ...over,
});

const signIn = (name: string, over: Partial<S["SignInView"]> = {}): S["SignInView"] =>
  ({
    name,
    label: "The account",
    status: "signed_out",
    ready: true,
    callback: "http://localhost/api/sign-ins/callback",
    allows: ["Read your mail", "Read your calendar"],
    account: null,
    missing: [],
    app: "add-on",
    app_note: null,
    can_paste: false,
    needs_secret: false,
    set_aside: false,
    default_unusable: false,
    own_app_steps: [],
    not_reading: [],
    ...over,
  }) as S["SignInView"];

const source = (id: string, label: string, over: Partial<S["WatchSourceView"]> = {}): S["WatchSourceView"] => ({
  id,
  label,
  connector: "x/y",
  connector_label: "",
  reads: ["mail"],
  enabled: true,
  every_minutes: 15,
  items: 0,
  last: null,
  read_at: null,
  failures: 0,
  problem: null,
  ...over,
});

/** The routes every screen of the walkthrough reads, answered with nothing set up. */
function routes(over: Record<string, (body: unknown) => unknown> = {}, steps = CORE.map((id) => step(id)), walk: Partial<S["WalkthroughView"]> = {}) {
  return {
    "GET setup": () => setupView(steps, { walkthrough: { open: true, ...walk } }),
    "GET settings": () => ({ fingerprint: "fp-1", items: SETTINGS }),
    "GET me": () => ({ person: null, full_name: "" }),
    "GET setup/business": () => ({ business: false, name: null, personal: PERSONAL, sides: [], chosen: null }),
    "GET projects": () => [],
    "GET people": () => [],
    "GET ai/endpoints": () => [],
    "GET ai/accounts": () => [],
    "GET ai/local": () => [],
    "GET packs": () => ({ enabled: true, feeds: [], available: [], installed: [] }),
    "GET sign-ins": () => [],
    "GET watch": () => [],
    "GET status": () => statusFixture(),
    "GET templates": () => [],
    "POST setup/walkthrough": (body: unknown) => ({ open: true, step: "you", closed: false, finished: false, ...(body as object) }),
    ...over,
  };
}

/** One service the AI screen offers, made up; the address is built so none is written out whole. */
const SERVICE: S["EndpointView"] = {
  id: "service-a",
  name: "Service A",
  adapter: "adapter-one",
  base_url: `${"https" + "://"}api.service-a.example.com/v1`,
  key_url: "",
  needs_key: true,
  local: false,
  note: "Pay as you go.",
  allowed_data: ["open"],
  program: "",
  model_examples: [],
  model_optional: false,
  recommended: true,
};
const WITH_SERVICE = { "GET ai/endpoints": () => [SERVICE] };

const handlers = () => ({
  onOpenPeople: vi.fn(),
  onOpenAddons: vi.fn(),
  onHandIn: vi.fn(),
  onChooseSource: vi.fn(),
  onOpenSources: vi.fn(),
  onFinishLater: vi.fn(),
  onDone: vi.fn(),
});

function open(props: { at?: { screen: S["WalkthroughView"]["step"]; n: number } | null; hellos?: number } = {}) {
  const h = handlers();
  const view = renderApp(
    <RestartProvider hellos={props.hellos ?? 1} pollSeconds={0.05} doneSeconds={0.05}>
      <Walkthrough at={props.at ?? null} {...h} />
    </RestartProvider>,
  );
  return { ...h, ...view };
}

const screenTitle = () => screen.findByRole("heading", { level: 2 });

describe("opening", () => {
  beforeEach(() => {
    window.location.hash = "";
  });

  test("it opens by itself on a fresh workspace, on Welcome, and Start goes to You", async () => {
    const user = userEvent.setup();
    const calls = fakeApi({
      ...routes({}, CORE.map((id) => step(id)), { step: "welcome" }),
      "GET panels": () => [],
      "GET asks": () => [],
      "GET changes": () => [],
      "GET followups": () => [],
      "GET runtime-config": () => ({ instance: null }),
    });
    renderApp(<App rc={rcFixture()} />);
    expect(await screen.findByRole("heading", { level: 1, name: "Getting started" })).toBeInTheDocument();
    expect(screen.getByText("About 10–20 minutes. You can stop and come back.")).toBeInTheDocument();
    expect(await screenTitle()).toHaveTextContent("Welcome");
    expect(screen.getByText(/reads your mail and calendar and keeps track of what you've promised and what you're owed/)).toBeInTheDocument();
    // What the person will need: three things, the cost from the app's own daily limit ($2 a day is about $60 a month).
    const need = screen.getByRole("region", { name: "What you'll need" });
    const items = within(need).getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent("An AI account. It costs about $60 a month at the daily limit you set.");
    expect(items[1]).toHaveTextContent("optional");
    expect(items[2]).toHaveTextContent("backups");
    // Welcome is no step: no list of steps, no place, no Back, one Start; the cursor is on the heading, as there is no field.
    expect(screen.queryByRole("navigation", { name: "Setup steps" })).toBeNull();
    expect(screen.queryByText(/ of 7/)).toBeNull();
    expect(screen.queryByRole("button", { name: "Back" })).toBeNull();
    expect(screen.queryByRole("button", { name: "I'll do this later" })).toBeNull();
    await waitFor(() => expect(screen.getByRole("heading", { level: 2, name: "Welcome" })).toHaveFocus());
    expect(window.location.hash).toBe("#setup");
    await user.click(screen.getByRole("button", { name: "Start" }));
    expect(await screenTitle()).toHaveTextContent("You");
    await waitFor(() => expect(calls.some((c) => c.route === "POST setup/walkthrough" && (c.body as S["WalkthroughIn"]).step === "you")).toBe(true));
    // The cursor starts where the person types.
    await waitFor(() => expect(screen.getByLabelText("Your full name")).toHaveFocus());
    expect(screen.getByText("You · 1 of 7")).toBeInTheDocument();
  });

  test("the first screen of a resumed walkthrough is You, not Welcome", async () => {
    fakeApi(routes());
    open();
    expect(await screenTitle()).toHaveTextContent("You");
    expect(screen.queryByRole("button", { name: "Start" })).toBeNull();
  });

  test("it does not open by itself when the server says it should not", async () => {
    fakeApi({
      ...routes({}, CORE.map((id) => step(id)), { open: false, closed: true }),
      "GET panels": () => [],
      "GET asks": () => [],
      "GET changes": () => [],
      "GET followups": () => [],
      "GET runtime-config": () => ({ instance: null }),
      "GET today/agenda": () => [],
      "GET today/todo": () => [],
      "GET today/arrived": () => ({ items: [], left_out: 0 }),
      "GET projects": () => [],
    });
    renderApp(<App rc={rcFixture()} />);
    expect(await screen.findByRole("heading", { level: 1, name: "Today" })).toBeInTheDocument();
    await new Promise((r) => setTimeout(r, 30));
    expect(screen.queryByRole("heading", { name: "Getting started" })).toBeNull();
    expect(window.location.hash).not.toBe("#setup");
  });

  test("it does not take the person from a hand-in they already started when setup is read late", async () => {
    const user = userEvent.setup();
    let release: () => void = () => {};
    const late = new Promise<void>((resolve) => {
      release = resolve;
    });
    const base = routes();
    fakeApi({
      ...base,
      "GET setup": async () => {
        await late;
        return base["GET setup"]();
      },
      "GET panels": () => [],
      "GET asks": () => [],
      "GET changes": () => [],
      "GET followups": () => [],
      "GET runtime-config": () => ({ instance: null }),
      "GET today/agenda": () => [],
      "GET today/todo": () => [],
      "GET today/arrived": () => ({ items: [], left_out: 0 }),
      "GET projects": () => [],
    });
    renderApp(<App rc={rcFixture()} />);
    expect(await screen.findByRole("heading", { level: 1, name: "Today" })).toBeInTheDocument();
    await user.click(screen.getAllByRole("button", { name: "Hand something in" })[0]);
    await user.type(await screen.findByLabelText("Paste or type it here"), "Minutes from the call.");
    release();
    await new Promise((r) => setTimeout(r, 30));
    expect(screen.queryByRole("heading", { name: "Getting started" })).toBeNull();
    expect(screen.getByLabelText("Paste or type it here")).toHaveValue("Minutes from the call.");
  });

  test("it resumes at the screen the server kept", async () => {
    fakeApi(routes({}, CORE.map((id) => step(id)), { step: "backup" }));
    open();
    expect(await screenTitle()).toHaveTextContent("Backups");
    expect(screen.getByRole("button", { name: /Backups/, current: "step" })).toBeInTheDocument();
  });

  test("a line elsewhere that sends the person to a step opens that screen and keeps it", async () => {
    const calls = fakeApi(routes());
    open({ at: { screen: "people", n: 1 } });
    expect(await screenTitle()).toHaveTextContent("People");
    await waitFor(() => expect(calls.some((c) => c.route === "POST setup/walkthrough" && (c.body as S["WalkthroughIn"]).step === "people")).toBe(true));
  });

  test("opening it again after it was closed keeps it open", async () => {
    const calls = fakeApi(routes({}, CORE.map((id) => step(id)), { open: false, closed: true }));
    open();
    await screenTitle();
    await waitFor(() =>
      expect(calls.find((c) => c.route === "POST setup/walkthrough")?.body).toMatchObject({ closed: false, finished: false }),
    );
  });

  test("opening it records the screen it shows, so it doesn't open by itself again once nothing it needs is missing", async () => {
    const calls = fakeApi(routes({}, CORE.map((id) => step(id)), { step: "people" }));
    open();
    await screenTitle();
    await waitFor(() =>
      expect(calls.find((c) => c.route === "POST setup/walkthrough")?.body).toEqual({ step: "people" }),
    );
  });

  test("where it stands is sent one request at a time, in the order the person made them", async () => {
    const user = userEvent.setup();
    fakeApi(routes({}, CORE.map((id) => step(id)), { open: false, closed: true }));
    // Answers to the keeps are held until the test lets them go, to see whether the next is sent before the last is back.
    const answer = globalThis.fetch;
    let release: () => void = () => undefined;
    const held = new Promise<void>((resolve) => (release = resolve));
    let sending = 0;
    let most = 0;
    const sent: S["WalkthroughIn"][] = [];
    vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
      if (!String(input).endsWith("setup/walkthrough")) return answer(input, init);
      sent.push(JSON.parse(String(init?.body)) as S["WalkthroughIn"]);
      sending += 1;
      most = Math.max(most, sending);
      await held;
      sending -= 1;
      return answer(input, init);
    });
    open({ at: { screen: "people", n: 1 } });
    await screenTitle();
    await waitFor(() => expect(sent.length).toBeGreaterThan(0));
    // Opening asks twice (the screen itself and the request to open at it), and the person moves on meanwhile.
    await user.click(screen.getByRole("button", { name: /^Backups/ }));
    expect(sent).toHaveLength(1);
    release();
    await waitFor(() => expect(sent).toHaveLength(3));
    expect(most).toBe(1);
    expect(sent.map((body) => body.step)).toEqual(["people", "people", "backup"]);
  });
});

describe("closing", () => {
  test("Finish later is kept on the server and closes it", async () => {
    const user = userEvent.setup();
    const calls = fakeApi(routes());
    const { onFinishLater, onDone } = open();
    await screenTitle();
    await user.click(screen.getByRole("button", { name: "Finish later" }));
    await waitFor(() => expect(onFinishLater).toHaveBeenCalledTimes(1));
    expect(calls.filter((c) => c.route === "POST setup/walkthrough").at(-1)?.body).toEqual({ closed: true });
    expect(onDone).not.toHaveBeenCalled();
  });

  test("the last button keeps it as finished and closes it", async () => {
    const user = userEvent.setup();
    const calls = fakeApi(routes({}, CORE.map((id) => step(id)), { step: "done" }));
    const { onDone, onFinishLater } = open();
    await user.click(await screen.findByRole("button", { name: "Go to Today" }));
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
    expect(calls.filter((c) => c.route === "POST setup/walkthrough").at(-1)?.body).toEqual({ finished: true });
    expect(onFinishLater).not.toHaveBeenCalled();
  });

  test("the last button lands on Today with the first-go line in focus, and the walkthrough is finished", async () => {
    const user = userEvent.setup();
    window.location.hash = "#setup";
    let finished = false;
    const waiting = {
      id: "REQ-1",
      version: 3,
      dismissed: false,
      stage_task: false,
      first_go: true,
      refused: false,
      state: "needs_you",
      approval: "required",
      waiting: "Waiting for your first go.",
      estimate_usd: 0.1,
      created_at: "2026-10-09T14:00:00Z",
      note: null,
      source: null,
      source_title: "Item REQ-1",
      changeset: null,
    } as S["ChangeItem"];
    fakeApi({
      ...routes(
        {
          "GET setup": () => setupView(CORE.map((id) => step(id)), { walkthrough: { open: !finished, step: "done", finished } }),
          "POST setup/walkthrough": (body) => {
            finished = (body as S["WalkthroughIn"]).finished ?? finished;
            return { open: false, step: "done", closed: false, finished };
          },
        },
      ),
      "GET panels": () => [],
      "GET asks": () => [],
      "GET changes": () => [waiting],
      "GET today/queue": () => [
        { key: "first_go", group: "decide", kind: "first_go", count: 1, estimate_usd: 0.1, unpriced: 0, untrusted: false, actions: [], questions: [], outcome: {} },
      ],
      "GET followups": () => [],
      "GET runtime-config": () => ({ instance: null }),
      "GET today/agenda": () => [],
      "GET today/todo": () => [],
      "GET today/arrived": () => ({ items: [], left_out: 0 }),
      "GET projects": () => [],
      "GET stages/records": () => [],
      "GET stages/ready": () => [],
      "GET stages/requests": () => [],
    });
    renderApp(<App rc={rcFixture()} />);
    await user.click(await screen.findByRole("button", { name: "Go to Today" }));
    const line = await screen.findByRole("group", { name: /^Start the assistant: 1 item/ });
    await waitFor(() => expect(line).toHaveFocus());
    expect(screen.queryByRole("heading", { name: "Getting started" })).toBeNull();
    expect(finished).toBe(true);
  });

  test("a closed walkthrough stays closed on Today, and Continue setup brings it back at the next step", async () => {
    const user = userEvent.setup();
    window.location.hash = "";
    let walk: Partial<S["WalkthroughView"]> = { open: false, closed: true, step: "mail" };
    const steps = CORE.map((id) => step(id, id === "workspace" || id === "work" || id === "ai" ? { done: true } : {}));
    fakeApi({
      ...routes({ "GET setup": () => setupView(steps, { walkthrough: walk }) }),
      "GET panels": () => [],
      "GET asks": () => [],
      "GET changes": () => [],
      "GET followups": () => [],
      "GET runtime-config": () => ({ instance: null }),
      "GET today/agenda": () => [],
      "GET today/todo": () => [],
      "GET today/arrived": () => ({ items: [], left_out: 0 }),
      "GET projects": () => [],
      "POST setup/walkthrough": (body) => {
        walk = { ...walk, open: true, closed: false, ...(body as object) };
        return { open: true, step: "mail", closed: false, finished: false, ...(body as object) };
      },
    });
    renderApp(<App rc={rcFixture()} />);
    const line = await screen.findByRole("region", { name: "Setup" });
    expect(line).toHaveTextContent("Setup 3 of 7");
    expect(screen.queryByRole("heading", { name: "Getting started" })).toBeNull();
    await user.click(within(line).getByRole("button", { name: "Continue setup" }));
    expect(await screen.findByRole("heading", { level: 1, name: "Getting started" })).toBeInTheDocument();
    expect(await screenTitle()).toHaveTextContent("Mail and calendar");
  });
});

describe("a way back to the step", () => {
  /** The walkthrough open at a step, with the quiet routes the other screens ask for. */
  function started(stepId: S["WalkthroughView"]["step"]) {
    window.location.hash = "";
    const steps = CORE.map((id) => step(id));
    return fakeApi({
      ...routes({ "GET setup": () => setupView(steps, { walkthrough: { open: true, step: stepId, closed: false } }) }),
      "GET panels": () => [],
      "GET asks": () => [],
      "GET changes": () => [],
      "GET followups": () => [],
      "GET runtime-config": () => ({ instance: null }),
      "GET today/agenda": () => [],
      "GET today/todo": () => [],
      "GET today/arrived": () => ({ items: [], left_out: 0 }),
      "GET projects": () => [],
      "GET people": () => [],
      "GET watch": () => [],
      "GET watch/kinds": () => [],
      "GET packs": () => ({ enabled: true, feeds: [], available: [], installed: [] }),
      "POST setup/walkthrough": (body) => ({ open: true, step: stepId, closed: false, finished: false, ...(body as object) }),
    });
  }

  test("the list of screens says what the server decided for Your promises: Done when it happened, Skipped (needs mail) when mail was skipped", async () => {
    window.location.hash = "";
    const steps = CORE.map((id) =>
      id === "mail" ? step(id, { skipped: true }) : id === "promises" ? step(id, { skipped: true, reason: "needs_mail" }) : step(id),
    );
    fakeApi({
      ...routes({ "GET setup": () => setupView(steps, { walkthrough: { open: true, step: "backup", closed: false, promises_done: true } }) }),
      "GET watch": () => [],
    });
    open();
    const item = (await screen.findByRole("button", { name: /Your promises/ })) as HTMLElement;
    expect(item).toHaveAttribute("data-state", "skipped");
    expect(within(item).getByText("Skipped (needs mail)")).toBeInTheDocument();
    // Moving on from the screen does not tick it: only the step's own thing does.
    expect(within(item).queryByText("Done")).toBeNull();
  });

  test("Your promises reads Done in the list once the server says the look back ran", async () => {
    window.location.hash = "";
    const steps = CORE.map((id) => (id === "promises" ? step(id, { done: true }) : step(id)));
    fakeApi({ ...routes({ "GET setup": () => setupView(steps, { walkthrough: { open: true, step: "backup", closed: false } }) }), "GET watch": () => [] });
    open();
    const item = (await screen.findByRole("button", { name: /Your promises/ })) as HTMLElement;
    expect(item).toHaveAttribute("data-state", "done");
    expect(within(item).getByText("Done")).toBeInTheDocument();
  });

  test("Connect one on the mail step leaves for Sources, and Back to setup returns to the mail step", async () => {
    const user = userEvent.setup();
    started("mail");
    renderApp(<App rc={rcFixture()} />);
    expect(await screenTitle()).toHaveTextContent("Mail and calendar");
    await user.click(await screen.findByRole("button", { name: "Connect one" }));
    const back = await screen.findByRole("button", { name: "Back to setup" });
    await user.click(back);
    expect(await screenTitle()).toHaveTextContent("Mail and calendar");
    expect(screen.queryByRole("button", { name: "Back to setup" })).toBeNull();
  });

  test("How to get it leaves for the Add-ons screen, and Back to setup returns to the mail step", async () => {
    const user = userEvent.setup();
    fakeApi({
      ...routes({}, CORE.map((c) => step(c)), { step: "mail" }),
      "GET packs": () => ({ enabled: true, feeds: [], available: [available("mail-addon", { installable: false })], installed: [] }),
      "GET watch": () => [],
      "GET watch/kinds": () => [],
    });
    renderApp(<App rc={rcFixture()} />);
    await user.click(await screen.findByRole("button", { name: "How to get it" }));
    await user.click(await screen.findByRole("button", { name: "Back to setup" }));
    expect(await screenTitle()).toHaveTextContent("Mail and calendar");
  });
});

describe("toasts", () => {
  function Pusher() {
    const { push } = useToasts();
    return (
      <button type="button" onClick={() => push({ message: "Saved. Workspace name: Offsite team" })}>
        say something
      </button>
    );
  }
  const openWith = () => {
    const h = handlers();
    renderApp(
      <RestartProvider hellos={1} pollSeconds={0.05} doneSeconds={0.05}>
        <Walkthrough at={null} {...h} />
        <Pusher />
      </RestartProvider>,
    );
  };
  const region = () => screen.getByRole("region", { name: "Notifications" });

  test("what a screen said in a toast is gone when the walkthrough moves to another screen, by Continue, Back or the list", async () => {
    const user = userEvent.setup();
    fakeApi(routes({}, CORE.map((id) => step(id, id === "workspace" ? { done: true } : {})), { step: "you" }));
    openWith();
    await screenTitle();
    await user.click(screen.getByRole("button", { name: "say something" }));
    expect(within(region()).getByText("Saved. Workspace name: Offsite team")).toBeInTheDocument();
    await user.click(await screen.findByRole("button", { name: "Continue" }));
    expect(await screen.findByRole("heading", { level: 2, name: "Work" }, { timeout: 5000 })).toBeInTheDocument();
    expect(within(region()).queryByText(/Saved\./)).toBeNull();

    await user.click(screen.getByRole("button", { name: "say something" }));
    await user.click(screen.getByRole("button", { name: "Back" }));
    expect(await screen.findByRole("heading", { level: 2, name: "You" }, { timeout: 5000 })).toBeInTheDocument();
    expect(within(region()).queryByText(/Saved\./)).toBeNull();

    await user.click(screen.getByRole("button", { name: "say something" }));
    await user.click(screen.getByRole("button", { name: /^Backups/ }));
    expect(await screen.findByRole("heading", { level: 2, name: "Backups" }, { timeout: 5000 })).toBeInTheDocument();
    expect(within(region()).queryByText(/Saved\./)).toBeNull();
  });

  test("a toast stays while the person stays on the screen that made it", async () => {
    const user = userEvent.setup();
    fakeApi(routes({}, CORE.map((id) => step(id)), { step: "you" }));
    openWith();
    await screenTitle();
    await user.click(screen.getByRole("button", { name: "say something" }));
    await new Promise((r) => setTimeout(r, 50));
    expect(within(region()).getByText("Saved. Workspace name: Offsite team")).toBeInTheDocument();
  });

  test("a toast that arrives as the walkthrough opens at a screen is not cleared by opening", async () => {
    fakeApi(routes({}, CORE.map((id) => step(id)), { step: "ai" }));
    const h = handlers();
    function Early() {
      const { push } = useToasts();
      useEffect(() => push({ message: "Signed in to Example mail." }), [push]);
      return null;
    }
    renderApp(
      <RestartProvider hellos={1} pollSeconds={0.05} doneSeconds={0.05}>
        <Early />
        <Walkthrough at={null} {...h} />
      </RestartProvider>,
    );
    await screenTitle();
    expect(within(region()).getByText("Signed in to Example mail.")).toBeInTheDocument();
  });
});

describe("each screen", () => {
  test("You: asks only the person's name and the time zone; the workspace and assistant names are Settings', not asked here", async () => {
    fakeApi(routes());
    open();
    expect(await screenTitle()).toHaveTextContent("You");
    expect(await screen.findByLabelText("Your full name")).toBeInTheDocument();
    expect(screen.getByLabelText("Your time zone")).toBeInTheDocument();
    expect(screen.queryByLabelText("Workspace name")).toBeNull();
    expect(screen.queryByLabelText("Your assistant's name")).toBeNull();
    expect(screen.queryByRole("radio")).toBeNull();
    expect(screen.getByText(/Saving adds you to People/)).toBeInTheDocument();
  });

  test("You: the name is saved on the person's record and a changed time zone as a setting, then it goes on to Work", async () => {
    const user = userEvent.setup();
    const calls = fakeApi(
      routes({
        "POST me": () => ({ person: "PER-1", full_name: "Sam Tester" }),
        "POST settings": () => ({ changes: [], fingerprint: "fp-2", needs_restart: false }),
      }),
    );
    open();
    const full = await screen.findByLabelText("Your full name");
    expect(full).toHaveFocus();
    await user.type(full, "Sam Tester");
    const zone = screen.getByLabelText("Your time zone");
    await user.clear(zone);
    await user.type(zone, "Zone-Two");
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(await screen.findByRole("heading", { level: 2, name: "Work" }, { timeout: 5000 })).toBeInTheDocument();
    expect(calls.find((c) => c.route === "POST me")!.body).toEqual({ full_name: "Sam Tester", workspace_name: "Sam's" });
    expect(calls.find((c) => c.route === "POST settings")!.body).toMatchObject({ changes: { "workspace.user.timezone": "Zone-Two" } });
    expect(calls.some((c) => c.route === "POST setup/business" || c.route === "POST setup/work")).toBe(false);
  });

  test("Work: Just me first, then two tick boxes under Also track; Continue keeps Just me and goes on to the AI account", async () => {
    const user = userEvent.setup();
    const calls = fakeApi(
      routes(
        { "POST setup/work": () => stateWith([], "me") },
        CORE.map((id) => step(id)),
        { step: "work" },
      ),
    );
    open();
    expect(await screenTitle()).toHaveTextContent("Work");
    const just = await screen.findByRole("radio", { name: "Just me" });
    expect(just).toBeChecked();
    expect(just).toHaveFocus();
    const also = screen.getByRole("group", { name: "Also track" });
    const boxes = within(also).getAllByRole("checkbox");
    expect(boxes.map((b) => (b.closest("label") as HTMLElement).textContent)).toEqual(["My job", "My own business"]);
    expect(boxes.every((b) => !(b as HTMLInputElement).checked)).toBe(true);
    expect(screen.queryByText(/employer's permission/)).toBeNull();
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(await screen.findByRole("heading", { level: 2, name: "Your AI account" }, { timeout: 5000 })).toBeInTheDocument();
    expect(calls.find((c) => c.route === "POST setup/work")!.body).toEqual({ choice: "me" });
  });

  test("Work: My job asks the employer's name and shows the notice about work mail; My own business never shows it", async () => {
    const user = userEvent.setup();
    const calls = fakeApi(
      routes(
        { "POST setup/business": (body) => ({ project: "PRJ-2", name: (body as { name: string }).name, kind: "job", created: true, changeset: "CS-1" }) },
        CORE.map((id) => step(id)),
        { step: "work" },
      ),
    );
    open();
    await user.click(await screen.findByRole("checkbox", { name: "My job" }));
    expect(screen.getByRole("radio", { name: "Just me" })).not.toBeChecked();
    expect(screen.getByRole("note")).toHaveTextContent("Reading work mail may need your employer's permission. Check your workplace's rules before you connect a work mailbox.");
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
    expect(screen.getByText("Say what your work is called to go on.")).toBeInTheDocument();
    await user.type(screen.getByLabelText("What is your employer called?"), EMPLOYER);
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(await screen.findByRole("heading", { level: 2, name: "Your AI account" }, { timeout: 5000 })).toBeInTheDocument();
    expect(calls.filter((c) => c.route === "POST setup/business").map((c) => c.body)).toEqual([{ name: EMPLOYER, kind: "job" }]);
    // The notice belongs to the job path alone: ticking only the business shows none.
    await user.click(screen.getByRole("button", { name: "Back" }));
    await user.click(await screen.findByRole("checkbox", { name: "My own business" }));
    expect(screen.queryByRole("note")).toBeNull();
  });

  test("Work: My own business asks its name and what it works on, and each line becomes a project inside it", async () => {
    const user = userEvent.setup();
    const calls = fakeApi(
      routes(
        {
          "POST setup/business": (body) => ({ project: "PRJ-2", name: (body as { name: string }).name, kind: "business", created: true, changeset: "CS-1" }),
          "POST projects": () => ({ id: "PRJ-9" }),
        },
        CORE.map((id) => step(id)),
        { step: "work" },
      ),
    );
    open();
    await user.click(await screen.findByRole("checkbox", { name: "My own business" }));
    expect(screen.queryByRole("note")).toBeNull();
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
    await user.type(screen.getByLabelText("What is your business called?"), SHOP);
    // The question names the business as it is typed.
    const works = await screen.findByLabelText(`What does ${SHOP} work on?`);
    await user.click(works);
    await user.paste(`- ${WORKS_ON[0]}\n${WORKS_ON[1]}\n\n2. ${WORKS_ON[2]}\n${WORKS_ON[1]}`);
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(await screen.findByRole("heading", { level: 2, name: "Your AI account" }, { timeout: 5000 })).toBeInTheDocument();
    expect(calls.filter((c) => c.route === "POST setup/business").map((c) => c.body)).toEqual([{ name: SHOP, kind: "business" }]);
    expect(calls.filter((c) => c.route === "POST projects").map((c) => c.body)).toEqual(WORKS_ON.map((name) => ({ name, parent: "PRJ-2" })));
  });

  test("Work: Add another business repeats the name and what it works on, and a job and two businesses are saved in order", async () => {
    const user = userEvent.setup();
    const made: Record<string, string> = { [EMPLOYER]: "PRJ-2", [SHOP]: "PRJ-3", [STUDIO]: "PRJ-4" };
    const calls = fakeApi(
      routes(
        {
          "POST setup/business": (body) => {
            const { name, kind } = body as { name: string; kind: "job" | "business" };
            return { project: made[name], name, kind, created: true, changeset: "CS" };
          },
          "POST projects": () => ({ id: "PRJ-9" }),
        },
        CORE.map((id) => step(id)),
        { step: "work" },
      ),
    );
    open();
    await user.click(await screen.findByRole("checkbox", { name: "My job" }));
    await user.click(screen.getByRole("checkbox", { name: "My own business" }));
    await user.type(screen.getByLabelText("What is your employer called?"), EMPLOYER);
    await user.type(screen.getByLabelText("What is your business called?"), SHOP);
    await user.click(screen.getByRole("button", { name: "Add another business" }));
    const names = screen.getAllByLabelText("What is your business called?");
    expect(names).toHaveLength(2);
    await user.type(names[1], STUDIO);
    await user.click(await screen.findByLabelText(`What does ${STUDIO} work on?`));
    await user.paste(WORKS_ON[0]);
    // Each extra business can be taken out again before it is saved.
    expect(screen.getByRole("button", { name: `Remove this business: ${STUDIO}` })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(await screen.findByRole("heading", { level: 2, name: "Your AI account" }, { timeout: 5000 })).toBeInTheDocument();
    expect(calls.filter((c) => c.route === "POST setup/business").map((c) => c.body)).toEqual([
      { name: EMPLOYER, kind: "job" },
      { name: SHOP, kind: "business" },
      { name: STUDIO, kind: "business" },
    ]);
    expect(calls.filter((c) => c.route === "POST projects").map((c) => c.body)).toEqual([{ name: WORKS_ON[0], parent: "PRJ-4" }]);
  });

  test("Work: sides already saved are listed with their projects and stay ticked; Just me can't be picked", async () => {
    fakeApi(
      routes(
        {
          "GET setup/business": () => stateWith([side("PRJ-2", "job", EMPLOYER), side("PRJ-3", "business", SHOP, true)]),
          "GET projects": () => WORKS_ON.slice(0, 2).map((name, i) => ({ id: `PRJ-${i + 5}`, name, parent: "PRJ-3" })),
        },
        CORE.map((id) => step(id, id === "work" ? { done: true } : {})),
        { step: "work" },
      ),
    );
    open();
    const added = await screen.findByRole("region", { name: "Added so far" });
    const rows = within(added).getAllByRole("listitem");
    expect(rows.map((r) => r.getAttribute("data-kind"))).toEqual(["job", "business"]);
    expect(rows[1]).toHaveTextContent(`Projects: ${WORKS_ON[0]}, ${WORKS_ON[1]}`);
    expect(rows[0]).toHaveTextContent("Nothing under it yet.");
    expect(screen.getByRole("radio", { name: "Just me" })).toBeDisabled();
    expect(screen.getByRole("checkbox", { name: "My job" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "My own business" })).toBeChecked();
    // Remove is offered only for a side the server says can still be taken back out.
    expect(within(rows[0]).queryByRole("button", { name: /^Remove/ })).toBeNull();
    expect(within(rows[1]).getByRole("button", { name: `Remove ${SHOP}` })).toBeInTheDocument();
    expect(screen.getByText(/stays part of this/)).toBeInTheDocument();
  });

  test("Work: going Back and changing a name renames the side's project and never posts the name again", async () => {
    const user = userEvent.setup();
    let name = SHOP;
    const calls = fakeApi(
      routes(
        {
          "GET setup/business": () => stateWith([side("PRJ-3", "business", name)]),
          "POST projects/PRJ-3": (body) => {
            name = (body as { name: string }).name;
            return { ok: "PRJ-3" };
          },
        },
        CORE.map((id) => step(id, id === "work" ? { done: true } : {})),
        { step: "work" },
      ),
    );
    open();
    await user.click(await screen.findByRole("button", { name: `Rename ${SHOP}` }));
    const field = screen.getByLabelText(`New name for ${SHOP}`);
    expect(field).toHaveValue(SHOP);
    await user.clear(field);
    await user.type(field, STUDIO);
    await user.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(calls.find((c) => c.route === "POST projects/PRJ-3")).toBeDefined());
    expect(calls.find((c) => c.route === "POST projects/PRJ-3")!.body).toEqual({ name: STUDIO });
    expect(await screen.findByText(STUDIO)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(await screen.findByRole("heading", { level: 2, name: "Your AI account" }, { timeout: 5000 })).toBeInTheDocument();
    expect(calls.some((c) => c.route === "POST setup/business" || c.route === "POST setup/work")).toBe(false);
  });

  test("Work: Remove takes a side made here back out at once, and the toast's Undo calls the restore route", async () => {
    const user = userEvent.setup();
    const sideA = side("PRJ-2", "job", EMPLOYER);
    const sideB = side("PRJ-3", "business", SHOP, true);
    let sides = [sideA, sideB];
    const calls = fakeApi(
      routes(
        {
          "GET setup/business": () => stateWith(sides, sides.length ? "work" : null),
          "POST setup/sides/PRJ-3/remove": () => ((sides = [sideA]), stateWith(sides)),
          "POST setup/sides/PRJ-3/restore": () => ((sides = [sideA, sideB]), stateWith(sides)),
        },
        CORE.map((id) => step(id)),
        { step: "work" },
      ),
    );
    open();
    await user.click(await screen.findByRole("button", { name: `Remove ${SHOP}` }));
    await waitFor(() => expect(calls.some((c) => c.route === "POST setup/sides/PRJ-3/remove")).toBe(true));
    await waitFor(() => expect(screen.queryByRole("button", { name: `Rename ${SHOP}` })).toBeNull());
    expect(await screen.findByText(`Removed ${SHOP}.`)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Undo" }));
    await waitFor(() => expect(calls.find((c) => c.route === "POST setup/sides/PRJ-3/restore")).toBeDefined());
    expect(calls.find((c) => c.route === "POST setup/sides/PRJ-3/restore")!.body).toEqual({ kind: "business", position: 1 });
    expect(await screen.findByRole("button", { name: `Rename ${SHOP}` })).toBeInTheDocument();
  });

  test("Work: Remove of the only side leaves Just me chosen", async () => {
    const user = userEvent.setup();
    let sides = [side("PRJ-3", "business", SHOP, true)];
    const calls = fakeApi(
      routes(
        {
          "GET setup/business": () => stateWith(sides, sides.length ? "work" : null),
          "POST setup/sides/PRJ-3/remove": () => ((sides = []), stateWith([], null)),
        },
        CORE.map((id) => step(id)),
        { step: "work" },
      ),
    );
    open();
    await user.click(await screen.findByRole("button", { name: `Remove ${SHOP}` }));
    await waitFor(() => expect(calls.some((c) => c.route === "POST setup/sides/PRJ-3/remove")).toBe(true));
    await waitFor(() => expect(screen.queryByRole("region", { name: "Added so far" })).toBeNull());
    expect(screen.getByRole("radio", { name: "Just me" })).toBeChecked();
  });

  test("Your AI account: spending is one sentence with its starting amounts, and Continue saves a change to them", async () => {
    const user = userEvent.setup();
    const calls = fakeApi(
      routes(
        { ...WITH_SERVICE, "POST settings": () => ({ changes: [], fingerprint: "fp-2", needs_restart: false }) },
        CORE.map((id) => step(id, id === "ai" ? { done: true } : {})),
        { step: "ai" },
      ),
    );
    open();
    expect(await screenTitle()).toHaveTextContent("Your AI account");
    const line = await screen.findByText(/It asks you before anything over/);
    expect(line).toHaveTextContent("It asks you before anything over $0.10, and stops for the day at $2.");
    await user.click(within(line).getByRole("button", { name: "Change" }));
    const confirm = screen.getByLabelText("Ask me before anything over");
    const day = screen.getByLabelText("Stop for the day at");
    expect(confirm).toHaveValue("0.1");
    expect(day).toHaveValue("2");
    expect(screen.getByText(/Starts at \$0\.10/)).toBeInTheDocument();
    expect(screen.getByText(/Starts at \$2/)).toBeInTheDocument();
    // There is no Save of its own: the screen's Continue is the one button.
    expect(screen.queryByRole("button", { name: "Save" })).toBeNull();
    await user.clear(day);
    await user.type(day, "5");
    await waitFor(() => expect(day).toHaveValue("5"), { timeout: 3000 });
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await waitFor(() => expect(calls.some((c) => c.route === "POST settings")).toBe(true));
    expect(calls.find((c) => c.route === "POST settings")!.body).toEqual({
      changes: { "ai.budgets.per_day_usd": 5 },
      reset: [],
      fingerprint: "fp-1",
    });
    expect(await screen.findByRole("heading", { level: 2, name: "Mail and calendar" }, { timeout: 5000 })).toBeInTheDocument();
  });

  test("a spending amount that is not a number stops Continue, and says why", async () => {
    const user = userEvent.setup();
    const calls = fakeApi(routes(WITH_SERVICE, CORE.map((id) => step(id, id === "ai" ? { done: true } : {})), { step: "ai" }));
    open();
    await user.click(await screen.findByRole("button", { name: "Change" }));
    const day = screen.getByLabelText("Stop for the day at");
    await user.clear(day);
    await user.type(day, "lots");
    expect((await screen.findAllByText("Use a number, such as 0.10.")).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
    expect(calls.some((c) => c.route === "POST settings")).toBe(false);
  });

  test("Your AI account: Continue says what is missing until a service is chosen, and I'll do this later skips it", async () => {
    const user = userEvent.setup();
    const calls = fakeApi(routes({ ...WITH_SERVICE, "POST setup/ai/skip": () => ({ ok: "ai" }) }, CORE.map((id) => step(id)), { step: "ai" }));
    open();
    await screen.findByRole("radio", { name: /Service A/ });
    const go = screen.getByRole("button", { name: "Continue" });
    expect(go).toBeDisabled();
    expect(screen.getByText("Choose an AI service to go on.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "I'll do this later" }));
    await waitFor(() => expect(calls.some((c) => c.route === "POST setup/ai/skip")).toBe(true));
  });

  test("Backups: with no drive found the folder form, and the one button says Back up now and continue", async () => {
    fakeApi(routes({}, CORE.map((id) => step(id)), { step: "backup" }));
    open();
    expect(await screenTitle()).toHaveTextContent("Backups");
    expect(await screen.findByLabelText("Folder")).toBeInTheDocument();
    const go = screen.getByRole("button", { name: "Back up now and continue" });
    expect(go).toBeDisabled();
    expect(screen.getByText("Choose a folder to go on.")).toBeInTheDocument();
  });

  test("Backups: Back up now and continue saves the drive found and moves on", async () => {
    const user = userEvent.setup();
    const calls = fakeApi(
      routes(
        {
          "GET setup/backup-folders": () => ({ folders: [{ name: "Drive One", recommended: true }], shown: "Backups › Example App" }),
          "POST setup/backup-folder/cloud": () => ({ changes: [], fingerprint: "fp-2", needs_restart: false }),
        },
        CORE.map((id) => step(id)),
        { step: "backup" },
      ),
    );
    open();
    const first = await screen.findByRole("radio", { name: /Drive One/ });
    expect(first).toBeChecked();
    await user.click(screen.getByRole("button", { name: "Back up now and continue" }));
    await waitFor(() => expect(calls.some((c) => c.route === "POST setup/backup-folder/cloud")).toBe(true));
    expect(await screen.findByRole("heading", { level: 2, name: "People" }, { timeout: 5000 })).toBeInTheDocument();
  });

  test("People: asked by how they relate, saved with that relation and side, each side of work under its own name", async () => {
    const user = userEvent.setup();
    let added = false;
    const calls = fakeApi(
      routes(
        {
          "GET people": () => (added ? [{ id: "PER-9", name: "Pat Kin", role: null, aliases: [], status: "active", is_pm: false, relation: "my sister or brother", side: "personal", sides: [PERSONAL] }] : []),
          "GET setup/business": () => stateWith([side("PRJ-2", "job", EMPLOYER), side("PRJ-3", "business", SHOP)]),
          "POST people": () => {
            added = true;
            return { id: "PER-9" };
          },
        },
        CORE.map((id) => step(id)),
        { step: "people" },
      ),
    );
    open();
    expect(await screenTitle()).toHaveTextContent("People");
    expect(screen.getByText(/You can skip this: it will ask about names it doesn't recognize/)).toBeInTheDocument();
    // Each side's people are headed by that side's name, in the order of the sides.
    const headings = await screen.findAllByRole("heading", { level: 3 });
    expect(headings.map((h) => h.textContent)).toEqual(["The people in your life", `The people at ${EMPLOYER}`, `The people at ${SHOP}`]);
    const personal = screen.getByRole("region", { name: "The people in your life" });
    await user.type(within(personal).getByLabelText("Their name"), "Pat Kin");
    await user.selectOptions(within(personal).getByLabelText("How they relate to you"), "sibling");
    await user.click(within(personal).getByRole("button", { name: "Add" }));
    expect(await within(personal).findByRole("listitem")).toHaveTextContent("Pat Kin · my sister or brother");
    expect(calls.find((c) => c.route === "POST people")!.body).toEqual({ full_name: "Pat Kin", aliases: [], sides: [PERSONAL], relation: "my sister or brother" });
  });

  test("People: a job's parts and a business's parts are lists to pick from, saved on that side by its id", async () => {
    const user = userEvent.setup();
    const calls = fakeApi(
      routes(
        {
          "GET setup/business": () => stateWith([side("PRJ-2", "job", EMPLOYER), side("PRJ-3", "business", SHOP)]),
          "POST people": () => ({ id: "PER-9" }),
        },
        CORE.map((id) => step(id)),
        { step: "people" },
      ),
    );
    open();
    const job = await screen.findByRole("region", { name: `The people at ${EMPLOYER}` });
    const business = screen.getByRole("region", { name: `The people at ${SHOP}` });
    const options = (el: HTMLElement) => within(within(el).getByLabelText("Their part")).getAllByRole("option").map((o) => o.textContent);
    expect(options(job)).toEqual(expect.arrayContaining(["manager", "colleague"]));
    expect(options(business)).toEqual(expect.arrayContaining(["customer", "supplier", "staff", "client"]));
    expect(options(business)).not.toContain("manager");
    await user.type(within(business).getByLabelText("Their name"), "Sam Kin");
    await user.selectOptions(within(business).getByLabelText("Their part"), "client");
    await user.click(within(business).getByRole("button", { name: "Add" }));
    await waitFor(() => expect(calls.some((c) => c.route === "POST people")).toBe(true));
    expect(calls.find((c) => c.route === "POST people")!.body).toEqual({ full_name: "Sam Kin", aliases: [], sides: ["PRJ-3"], role: "client" });
  });

  test("People: with no side of work, only the people in the person's life are asked, saved on the personal side", async () => {
    fakeApi(routes({ "GET people": () => [] }, CORE.map((id) => step(id)), { step: "people" }));
    open();
    await screen.findByRole("region", { name: "The people in your life" });
    expect(screen.queryByRole("heading", { name: /The people at/ })).toBeNull();
  });

  test("Skip for now skips the step and moves to the next screen; Back and the list move too, and each is kept", async () => {
    const user = userEvent.setup();
    const calls = fakeApi(routes({ "POST setup/people/skip": () => ({ ok: "people" }) }, CORE.map((id) => step(id)), { step: "people" }));
    open();
    await screenTitle();
    await user.click(screen.getByRole("button", { name: "I'll do this later" }));
    expect(await screen.findByRole("heading", { level: 2, name: "Done" }, { timeout: 5000 })).toBeInTheDocument();
    expect(calls.some((c) => c.route === "POST setup/people/skip")).toBe(true);
    await user.click(screen.getByRole("button", { name: "Back" }));
    expect(await screen.findByRole("heading", { level: 2, name: "People" }, { timeout: 5000 })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^Your AI account/ }));
    expect(await screen.findByRole("heading", { level: 2, name: "Your AI account" }, { timeout: 5000 })).toBeInTheDocument();
    const kept = calls.filter((c) => c.route === "POST setup/walkthrough").map((c) => (c.body as S["WalkthroughIn"]).step);
    expect(kept).toEqual(expect.arrayContaining(["done", "people", "ai"]));
  });

  test("a screen that is done offers Continue, not I'll do this later", async () => {
    fakeApi(routes({}, CORE.map((id) => step(id, id === "workspace" ? { done: true } : {}))));
    open();
    expect(await screen.findByRole("button", { name: "Continue" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "I'll do this later" })).toBeNull();
  });
});

describe("Mail and calendar", () => {
  /** A fake service that moves through the states the screen shows: not here, installed and off, on and waiting for the
   * restart, then running. The restart changes the app's start so the screen sees it come back. */
  function service(start: "none" | "off" | "on", over: { signed?: boolean; canRestart?: boolean } = {}) {
    const state = { here: start !== "none", enabled: start === "on", running: start === "on", signed: !!over.signed, restarted: 0 };
    const id = "mail-addon";
    const login = "http://localhost:9090/login?x=1";
    const calls = fakeApi({
      ...routes({}, CORE.map((c) => step(c)), { step: "mail" }),
      "GET packs": () => ({
        enabled: true,
        feeds: [],
        available: [available(id, { installed_version: state.here ? "1.0.0" : null, enabled: state.enabled })],
        installed: state.here
          ? [installedPack(id, { enabled: state.enabled, state: state.running ? "enabled" : "off" })]
          : [],
      }),
      "POST packs/mail-addon/install": () => {
        state.here = true;
        return { name: id, version: "1.0.0", needs_restart: true };
      },
      "POST packs/mail-addon/on": () => {
        state.enabled = true;
        return { changes: [], fingerprint: "fp-2", needs_restart: true };
      },
      "GET status": () => statusFixture({ can_restart: over.canRestart ?? true }),
      "POST restart": () => {
        // The app is gone for a moment and comes back as a new start.
        setTimeout(() => {
          state.restarted += 1;
          state.running = state.enabled;
        }, 150);
        return { restarting: true };
      },
      "GET runtime-config": () => ({ instance: `start-${state.restarted}` }),
      "GET sign-ins": () => (state.running ? [signIn(`${id}/account`, state.signed ? { status: "signed_in", account: "me@example.com" } : {})] : []),
      "POST sign-ins/mail-addon/account/start": () => ({ url: login }),
      "GET watch": () =>
        state.signed ? [source("s1", "Your inbox"), source("s2", "Your calendar", { reads: ["calendar"] })] : [],
    });
    return { calls, state, login };
  }

  let opener: ReturnType<typeof vi.fn>;
  let popup: { closed: boolean; close: ReturnType<typeof vi.fn>; location: { href: string } };
  let assign: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    assign = vi.fn();
    popup = { closed: false, close: vi.fn(), location: { href: "" } };
    opener = vi.fn(() => popup);
    vi.stubGlobal("location", { ...window.location, assign });
    vi.stubGlobal("open", opener);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const row = async () => (await screen.findByText("Service mail-addon")).closest("li") as HTMLElement;
  const oneButton = "Add Service mail-addon and sign in — the app restarts for a moment";

  test("a service that is not installed: the row says it needs the add-on; one click installs, turns on, restarts, then opens the sign-in in its own window", async () => {
    const user = userEvent.setup();
    const { calls, login } = service("none");
    open();
    expect(await screenTitle()).toHaveTextContent("Mail and calendar");
    const mine = await row();
    expect(within(mine).getByText("Reads your mail and calendar")).toBeInTheDocument();
    expect(within(mine).getByText(/needs the Service mail-addon add-on/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Restart to finish connecting/ })).toBeNull();
    // Nothing restarts before the click.
    expect(calls.some((c) => c.route === "POST restart")).toBe(false);
    await user.click(within(mine).getByRole("button", { name: oneButton }));
    await waitFor(() => expect(popup.location.href).toBe(login), { timeout: 3000 });
    const routesCalled = calls.map((c) => c.route);
    expect(routesCalled.indexOf("POST packs/mail-addon/install")).toBeLessThan(routesCalled.indexOf("POST packs/mail-addon/on"));
    expect(routesCalled.indexOf("POST packs/mail-addon/on")).toBeLessThan(routesCalled.indexOf("POST restart"));
    expect(calls.filter((c) => c.route === "POST restart")).toHaveLength(1);
    expect(opener).toHaveBeenCalledWith("", "_blank");
    // The app's own window never goes to the service.
    expect(assign).not.toHaveBeenCalled();
    expect(await screen.findByText(/Waiting for you to sign in/)).toBeInTheDocument();
  });

  test("a refused sign-in shows the service's reason in plain words and Try again", async () => {
    const user = userEvent.setup();
    service("on");
    open();
    const mine = await row();
    await user.click(within(mine).getByRole("button", { name: "Sign in to The account" }));
    expect(await screen.findByText(/Waiting for you to sign in/)).toBeInTheDocument();
    act(() => announceSignIn({ outcome: "refused", name: "mail-addon/account", error: "access_denied", detail: "Not on the testers list" }));
    expect(await screen.findByText("The service didn't allow the sign-in (access_denied): Not on the testers list")).toBeInTheDocument();
    expect(assign).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Sign in to The account" }));
    expect(opener).toHaveBeenCalledTimes(2);
  });

  test("a sign-in window closed with no answer says so, with Try again", async () => {
    const user = userEvent.setup();
    service("on");
    open();
    const mine = await row();
    await user.click(within(mine).getByRole("button", { name: "Sign in to The account" }));
    expect(await screen.findByText(/Waiting for you to sign in/)).toBeInTheDocument();
    popup.closed = true;
    expect(await screen.findByText("The sign-in window was closed before you finished.", {}, { timeout: 3000 })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign in to The account" })).toHaveTextContent("Try again");
  });

  test("when the app can't restart itself, nothing restarts and the visible restart line stays", async () => {
    const user = userEvent.setup();
    const { calls } = service("none", { canRestart: false });
    open();
    const mine = await row();
    await user.click(within(mine).getByRole("button", { name: "Install and connect Service mail-addon" }));
    await waitFor(() => expect(within(mine).getByText("Ready after the restart below.")).toBeInTheDocument());
    expect(calls.some((c) => c.route === "POST restart")).toBe(false);
    expect(screen.getByText(/Close and reopen the app/)).toBeInTheDocument();
    expect(opener).not.toHaveBeenCalled();
  });

  test("a service installed but off: one click turns it on, with no install, then restarts and opens the sign-in", async () => {
    const user = userEvent.setup();
    const { calls, login } = service("off");
    open();
    const mine = await row();
    expect(within(mine).getByText("Installed, but off.")).toBeInTheDocument();
    await user.click(within(mine).getByRole("button", { name: oneButton }));
    await waitFor(() => expect(popup.location.href).toBe(login), { timeout: 3000 });
    expect(calls.some((c) => c.route === "POST packs/mail-addon/install")).toBe(false);
    expect(calls.some((c) => c.route === "POST packs/mail-addon/on")).toBe(true);
  });

  test("a service that is on goes straight to Sign in, with no restart in the way", async () => {
    const user = userEvent.setup();
    const { calls, login } = service("on");
    open();
    const mine = await row();
    expect(within(mine).getByText("On. Sign in to start reading.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Restart to finish connecting/ })).toBeNull();
    expect(within(mine).queryByRole("button", { name: /Install|Turn on/ })).toBeNull();
    await user.click(within(mine).getByRole("button", { name: "Sign in to The account" }));
    await waitFor(() => expect(popup.location.href).toBe(login));
    expect(assign).not.toHaveBeenCalled();
    expect(calls.some((c) => c.route === "POST restart")).toBe(false);
  });

  test("a service row says in plain words what it gives and who made it, with what it reaches behind a disclosure", async () => {
    service("on");
    open();
    const mine = await row();
    expect(within(mine).getByText("Reads your mail and calendar")).toBeInTheDocument();
    expect(within(mine).getByText("Made by Example")).toBeInTheDocument();
    // The reach details are not on the row until asked for, and they are in plain words.
    const reach = within(mine).getByText("What it can access").closest("details")!;
    expect(reach).not.toHaveAttribute("open");
    expect(within(reach).getByText(/You sign in on the service's own page/)).toBeInTheDocument();
    expect(within(reach).getByText("Connects to: api.service.example.com")).toBeInTheDocument();
    for (const jargon of [/Signs in to/, /Internet:/, /Keys you provide/, /^account$/]) expect(mine.textContent).not.toMatch(jargon);
  });

  test("what a service reaches in keys and programs is said as what it needs, not as a count", async () => {
    fakeApi({
      ...routes({}, CORE.map((c) => step(c)), { step: "mail" }),
      "GET packs": () => ({
        enabled: true,
        feeds: [],
        available: [
          available("mail-addon", {
            what: what({ reaches: { sign_ins: ["account"], hosts: [], programs: ["a-helper"], keys: 2 } }),
          }),
        ],
        installed: [],
      }),
    });
    open();
    const reach = within(await row()).getByText("What it can access").closest("details")!;
    expect(within(reach).getByText("Runs these programs on this computer: a-helper")).toBeInTheDocument();
    expect(within(reach).getByText("Needs 2 keys from you")).toBeInTheDocument();
  });

  test("the assistant's sorting of what the rules can't place is on by default and one switch turns it off", async () => {
    const user = userEvent.setup();
    let sorting = "ai";
    const item = (value: string) =>
      ({
        key: "watch.sorting",
        file: "watch",
        group: "watch",
        description: "How unplaced mail is sorted.",
        type: "choice",
        options: ["ai", "rules"],
        value,
        default: "ai",
        source: "default",
        locked: false,
        basic: false,
        editable: true,
      }) as S["SettingItem"];
    const calls = fakeApi({
      ...routes({}, CORE.map((c) => step(c)), { step: "mail" }),
      "GET packs": () => ({ enabled: true, feeds: [], available: [available("mail-addon")], installed: [] }),
      "GET settings": () => ({ fingerprint: "fp-1", items: [...SETTINGS, item(sorting)] }),
      "POST settings": (body) => {
        const changes = (body as { changes: Record<string, string> }).changes;
        sorting = changes["watch.sorting"];
        return {
          changes: [{ key: "watch.sorting", before: "ai", after: sorting, was_default: true, is_default: false }],
          fingerprint: "fp-2",
          needs_restart: false,
        };
      },
    });
    open();
    const box = await screen.findByRole("checkbox", { name: "Set aside newsletters, sales and mailing lists" });
    await waitFor(() => expect(box).toBeChecked());
    expect(screen.getByText(/not the message body/)).toBeInTheDocument();
    await user.click(box);
    await waitFor(() => expect(calls.some((c) => c.route === "POST settings")).toBe(true));
    expect(calls.find((c) => c.route === "POST settings")!.body).toEqual({
      changes: { "watch.sorting": "rules" },
      reset: [],
      fingerprint: "fp-1",
    });
    await waitFor(() => expect(box).not.toBeChecked());
  });

  test("a service the catalog names no publisher for shows none", async () => {
    fakeApi({
      ...routes({}, CORE.map((c) => step(c)), { step: "mail" }),
      "GET packs": () => ({
        enabled: true,
        feeds: [],
        available: [available("mail-addon", { publisher: "" })],
        installed: [],
      }),
    });
    open();
    expect(within(await row()).queryByText(/^Made by/)).toBeNull();
  });

  test("once signed in the row says who and what is read, offers no Sign in, and no longer says to sign in", async () => {
    service("on", { signed: true });
    open();
    const mine = await row();
    expect(await within(mine).findByText("Signed in as me@example.com")).toBeInTheDocument();
    expect(within(mine).getByText("Reading your mail and calendar.")).toBeInTheDocument();
    expect(within(mine).queryByText(/Sign in to start reading/)).toBeNull();
    expect(within(mine).queryByRole("button", { name: /^Sign in/ })).toBeNull();
    expect(mine).toHaveAttribute("data-signed-in");
  });

  test("a sign-in that has run out still offers Sign in, and the row doesn't claim to be reading", async () => {
    const { state } = service("on");
    state.signed = false;
    fakeApi({
      ...routes({}, CORE.map((c) => step(c)), { step: "mail" }),
      "GET packs": () => ({
        enabled: true,
        feeds: [],
        available: [available("mail-addon", { installed_version: "1.0.0", enabled: true })],
        installed: [installedPack("mail-addon", { enabled: true, state: "enabled" })],
      }),
      "GET sign-ins": () => [signIn("mail-addon/account", { status: "expired", account: "me@example.com" })],
    });
    open();
    const mine = await row();
    expect(await within(mine).findByRole("button", { name: "Sign in again to The account" })).toBeInTheDocument();
    expect(within(mine).queryByText(/^Reading your/)).toBeNull();
    expect(mine).not.toHaveAttribute("data-signed-in");
  });

  test("after signing in it says what is read now and that what it reads waits for the first Go", async () => {
    service("on", { signed: true });
    open();
    const mine = await row();
    expect(within(mine).getByText("Signed in as me@example.com")).toBeInTheDocument();
    const reading = await screen.findByText("Now reading");
    const list = reading.closest("[data-reading]") as HTMLElement;
    expect(within(list).getByText("Your inbox")).toBeInTheDocument();
    expect(within(list).getByText("Your calendar")).toBeInTheDocument();
    expect(within(list).getByText(/What it reads waits for you to start the assistant on the next screen/)).toBeInTheDocument();
  });

  test("with a side of work, each mailbox and calendar asks which it serves and saves the ticks as its sides", async () => {
    const user = userEvent.setup();
    service("on", { signed: true });
    let sources: Array<Record<string, unknown>> = [
      { id: "s1", connector: "x/y", label: "Your inbox", settings: {} },
      { id: "s2", connector: "x/y", label: "Your calendar", settings: {}, sides: ["PRJ-3"] },
    ];
    const first = sources;
    const saves: unknown[] = [];
    const mail = fakeApi({
      ...routes({}, CORE.map((c) => step(c)), { step: "mail" }),
      "GET packs": () => ({
        enabled: true,
        feeds: [],
        available: [available("mail-addon", { installed_version: "1.0.0", enabled: true })],
        installed: [installedPack("mail-addon", { enabled: true, state: "enabled" })],
      }),
      "GET sign-ins": () => [signIn("mail-addon/account", { status: "signed_in", account: "me@example.com" })],
      "GET watch": () => [source("s1", "Your inbox"), source("s2", "Your calendar", { reads: ["calendar"] })],
      "GET setup/business": () => stateWith([side("PRJ-2", "job", EMPLOYER), side("PRJ-3", "business", SHOP)]),
      "GET settings": () => ({
        fingerprint: "fp-1",
        items: [
          ...SETTINGS,
          { key: "watch.sources", file: "watch", group: "watch", description: "", type: "other", options: [], value: sources, default: [], source: "file", locked: false, basic: false, editable: false },
        ],
      }),
      "POST settings": (body) => {
        saves.push(body);
        const before = sources;
        sources = (body as { changes: { "watch.sources": Array<Record<string, unknown>> } }).changes["watch.sources"];
        return { changes: [{ key: "watch.sources", before, after: sources, was_default: false, is_default: false }], fingerprint: "fp-2", needs_restart: false };
      },
    });
    open();
    const inbox = await screen.findByRole("group", { name: "Which does Your inbox serve?" });
    const calendar = screen.getByRole("group", { name: "Which does Your calendar serve?" });
    expect(within(inbox).getAllByRole("checkbox").map((b) => (b.closest("label") as HTMLElement).textContent)).toEqual(["Personal", EMPLOYER, SHOP]);
    // Nothing ticked is allowed; what a source already serves is shown ticked.
    expect(within(inbox).getAllByRole("checkbox").every((b) => !(b as HTMLInputElement).checked)).toBe(true);
    expect(within(calendar).getByRole("checkbox", { name: SHOP })).toBeChecked();
    // The same mailbox may serve several: Personal and the job.
    await user.click(within(inbox).getByRole("checkbox", { name: "Personal" }));
    await waitFor(() => expect(saves).toHaveLength(1));
    expect(saves[0]).toEqual({
      changes: { "watch.sources": [{ ...first[0], sides: [PERSONAL] }, first[1]] },
      reset: [],
      fingerprint: "fp-1",
    });
    await user.click(within(inbox).getByRole("checkbox", { name: EMPLOYER }));
    await waitFor(() => expect(saves).toHaveLength(2));
    expect((saves[1] as { changes: { "watch.sources": Array<{ sides: string[] }> } }).changes["watch.sources"][0].sides).toEqual([PERSONAL, "PRJ-2"]);
    expect(mail.filter((c) => c.route === "POST settings")).toHaveLength(2);
  });

  test("with no side of work, the mailboxes are not asked which they serve", async () => {
    service("on", { signed: true });
    open();
    await screen.findByText("Now reading");
    expect(screen.queryByRole("group", { name: /serve\?$/ })).toBeNull();
  });

  test("where the app can't restart itself the step says to close and start it, and offers no restart button", async () => {
    const user = userEvent.setup();
    const state = { enabled: false };
    fakeApi({
      ...routes({}, CORE.map((c) => step(c)), { step: "mail" }),
      "GET packs": () => ({
        enabled: true,
        feeds: [],
        available: [available("mail-addon", { installed_version: "1.0.0", enabled: state.enabled })],
        installed: [installedPack("mail-addon", { enabled: state.enabled })],
      }),
      "POST packs/mail-addon/on": () => ((state.enabled = true), { changes: [], fingerprint: "fp-2", needs_restart: true }),
      "GET status": () => statusFixture({ can_restart: false }),
    });
    open();
    await user.click(await screen.findByRole("button", { name: "Turn on Service mail-addon" }));
    expect(await screen.findByText(/Close and reopen the app to finish adding the add-on/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Restart to finish connecting/ })).toBeNull();
  });

  test("a refusal from the install is said on the row in the server's words, and nothing is turned on", async () => {
    const user = userEvent.setup();
    const calls = fakeApi({
      ...routes({}, CORE.map((c) => step(c)), { step: "mail" }),
      "GET packs": () => ({ enabled: true, feeds: [], available: [available("mail-addon")], installed: [] }),
      "POST packs/mail-addon/install": () => new Refuse(409, "The release file could not be checked."),
    });
    open();
    await user.click(await screen.findByRole("button", { name: "Install and connect Service mail-addon" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("The release file could not be checked.");
    expect(calls.some((c) => c.route === "POST packs/mail-addon/on")).toBe(false);
    expect(screen.queryByRole("button", { name: /Restart to finish connecting/ })).toBeNull();
  });

  test("an add-on that reads no mail or calendar is not offered, and another mail or calendar opens the core's forms", async () => {
    const user = userEvent.setup();
    fakeApi({
      ...routes({}, CORE.map((c) => step(c)), { step: "mail" }),
      "GET packs": () => ({
        enabled: true,
        feeds: [],
        available: [
          available("mail-addon"),
          available("other-addon", { what: what({ reads: [] }) }),
          available("no-sign-in-addon", { what: what({ reaches: { sign_ins: [], hosts: [], programs: [], keys: 0 } }) }),
        ],
        installed: [],
      }),
    });
    const { onChooseSource } = open();
    expect(await screen.findByText("Service mail-addon")).toBeInTheDocument();
    expect(screen.queryByText("Service other-addon")).toBeNull();
    expect(screen.queryByText("Service no-sign-in-addon")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Another mail or calendar" }));
    expect(onChooseSource).toHaveBeenCalledWith(null);
  });

  test("with no service listed and nothing read the step is one sentence and one button, and the way out is the step's own skip", async () => {
    const user = userEvent.setup();
    fakeApi(routes({}, CORE.map((c) => step(c)), { step: "mail" }));
    const { onChooseSource } = open();
    expect(
      await screen.findByText("Mail and calendar sign-in comes with an add-on that isn't installed yet. You can connect a mail folder or a calendar link now, or skip this and hand things in by pasting."),
    ).toBeInTheDocument();
    // The old second sentence, and the mail-sorting choices that mean nothing before any mail is read, are not there.
    expect(screen.queryByText(/No services listed/)).toBeNull();
    expect(screen.queryByText(/Connect another service/)).toBeNull();
    expect(screen.queryByRole("checkbox", { name: "Set aside newsletters, sales and mailing lists" })).toBeNull();
    const buttons = within(document.querySelector<HTMLElement>("[data-mail-none]")!).getAllByRole("button");
    expect(buttons.map((b) => b.textContent)).toEqual(["Connect one"]);
    await user.click(buttons[0]);
    expect(onChooseSource).toHaveBeenCalledWith(null);
  });

  test("a service the app can't install from here points to the Add-ons screen", async () => {
    const user = userEvent.setup();
    fakeApi({
      ...routes({}, CORE.map((c) => step(c)), { step: "mail" }),
      "GET packs": () => ({ enabled: true, feeds: [], available: [available("mail-addon", { installable: false })], installed: [] }),
    });
    const { onOpenAddons } = open();
    await user.click(await screen.findByRole("button", { name: "How to get it" }));
    expect(onOpenAddons).toHaveBeenCalledTimes(1);
  });

  test("an add-on's own steps for mail show on this screen, not under the extras", async () => {
    fakeApi(
      routes(
        {},
        [...CORE.map((c) => step(c)), step("demo/tidy", { label: "Choose which folders to read", plugin: "demo", group: "mail" })],
        { step: "mail" },
      ),
    );
    open();
    expect(await screen.findByRole("heading", { name: "Choose which folders to read" })).toBeInTheDocument();
  });
});

describe("Done", () => {
  const steps = (over: Record<string, Partial<S["SetupStepView"]>>) =>
    CORE.map((id) => step(id, over[id] ?? {}));

  test("it lists what was set up and what was skipped, each skipped item with a Set up button that goes to its screen", async () => {
    const user = userEvent.setup();
    fakeApi(
      routes({}, steps({ workspace: { done: true }, ai: { done: true }, mail: { skipped: true }, backup: { done: true }, people: { skipped: true } }), {
        step: "done",
      }),
    );
    open();
    const recap = await screen.findByRole("list", { name: "What was set up" });
    const item = (id: string) => recap.querySelector(`[data-step="${id}"]`) as HTMLElement;
    expect(item("workspace")).toHaveTextContent("You");
    expect(item("workspace")).toHaveTextContent("Done");
    expect(item("ai")).toHaveTextContent("Done");
    expect(item("mail")).toHaveTextContent("Mail and calendar");
    expect(item("mail")).toHaveTextContent("Skipped");
    expect(item("people")).toHaveTextContent("Skipped");
    expect(within(item("workspace")).queryByRole("button")).toBeNull();
    expect(within(item("mail")).getByRole("button", { name: "Set up: Mail and calendar" })).toBeInTheDocument();
    await user.click(within(item("people")).getByRole("button", { name: "Set up: People" }));
    expect(await screen.findByRole("heading", { level: 2, name: "People" }, { timeout: 5000 })).toBeInTheDocument();
  });

  test("each step is one compact row: the step, how it stands, then Set up, and a done step has no button", async () => {
    fakeApi(routes({}, steps({ workspace: { done: true }, ai: { skipped: true } }), { step: "done" }));
    open();
    const recap = await screen.findByRole("list", { name: "What was set up" });
    const row = (id: string) => recap.querySelector(`[data-step="${id}"]`) as HTMLElement;
    // Three cells, in that order, so one line each (the layout gives them columns, not a card).
    expect([...row("ai").children].map((c) => c.textContent?.replace(/^[✓–○]\s*/, "").trim())).toEqual(["Your AI account", "Skipped", "Set up"]);
    expect([...row("workspace").children].map((c) => c.textContent?.replace(/^[✓–○]\s*/, "").trim())).toEqual(["You", "Done", ""]);
    expect(within(row("workspace")).queryByRole("button")).toBeNull();
  });

  test("it shows the optional extras and they do not count: the last button is there with them undone", async () => {
    fakeApi(
      routes({ "GET templates": () => [{ id: "tpl-a", name: "Book project", description: "Chapters and drafts.", set_up: false, adds: [] }] }, steps({}), {
        step: "done",
      }),
    );
    open();
    const extras = await screen.findByRole("region", { name: "Optional extras" });
    expect(await within(extras).findByText("Book project")).toBeInTheDocument();
    expect(within(extras).getByRole("heading", { name: "What kind of work is this?" })).toBeInTheDocument();
    expect(within(extras).getByRole("heading", { name: "Hand in a first note" })).toBeInTheDocument();
    // The counted steps are not among the extras.
    expect(within(extras).queryByRole("heading", { name: "Choose a backup folder" })).toBeNull();
    expect(screen.getByRole("button", { name: "Go to Today" })).toBeEnabled();
  });

  test("the extras include an add-on's step that is not about mail", async () => {
    fakeApi(routes({}, [...steps({}), step("demo/tidy", { label: "Connect the tidy-up tool", plugin: "demo" })], { step: "done" }));
    open();
    const extras = await screen.findByRole("region", { name: "Optional extras" });
    expect(await within(extras).findByRole("heading", { name: "Connect the tidy-up tool" })).toBeInTheDocument();
  });
});

// The look (design 7.8): the list marks only what is done or skipped and where the person is; one primary button, with
// Skip as a quiet button; and the screen's own form, as wide as what it holds.
// These walk several screens with typing, about four seconds each alone, so a busy machine gets more time for them.
describe("the look", { timeout: 20_000 }, () => {
  const primaries = (root: HTMLElement) => Array.from(root.querySelectorAll("button")).filter((b) => /primary/.test(b.className) && !b.disabled);

  test("the list has no \"Not done yet\" on a row, marks done and skipped ones, and says which screen is open", async () => {
    fakeApi(routes({}, CORE.map((id) => step(id, id === "workspace" ? { done: true } : id === "ai" ? { skipped: true } : {})), { step: "people" }));
    open();
    await screenTitle();
    const list = screen.getByRole("navigation", { name: "Setup steps" });
    expect(within(list).queryByText("Not done yet")).toBeNull();
    const row = (id: string) => list.querySelector<HTMLElement>(`[data-screen="${id}"]`)!;
    expect(row("you")).toHaveTextContent("Done");
    expect(row("ai")).toHaveTextContent("Skipped");
    const here = row("people");
    expect(here).toHaveAttribute("aria-current", "step");
    expect(here).toHaveTextContent("You are here");
    expect(within(list).getAllByText("You are here")).toHaveLength(1);
  });

  test("a screen not done yet has Continue as its one primary button, and I'll do this later is the secondary one beside it", async () => {
    fakeApi(routes({}, CORE.map((id) => step(id)), { step: "people" }));
    open();
    await screenTitle();
    const main = screen.getByRole("main");
    expect(primaries(main).map((b) => b.textContent)).toEqual(["Continue"]);
    expect(within(main).getByRole("button", { name: "I'll do this later" })).toBeEnabled();
    expect(await within(main).findByRole("button", { name: "Add" })).toBeDisabled();
  });

  test("a screen that is done has the same primary button, Continue, and no I'll do this later", async () => {
    fakeApi(routes({}, CORE.map((id) => step(id, id === "people" ? { done: true } : {})), { step: "people" }));
    open();
    await screenTitle();
    const main = screen.getByRole("main");
    expect(primaries(main).map((b) => b.textContent)).toEqual(["Continue"]);
    expect(within(main).queryByRole("button", { name: "I'll do this later" })).toBeNull();
  });

  test("the mail step with nothing connected has one way on, I'll do this later, and no Continue beside it", async () => {
    fakeApi(routes({}, CORE.map((id) => step(id)), { step: "mail" }));
    open();
    await screenTitle();
    const main = screen.getByRole("main");
    expect(within(main).getByRole("button", { name: "I'll do this later" })).toBeEnabled();
    expect(within(main).queryByRole("button", { name: "Continue" })).toBeNull();
    expect(primaries(main)).toEqual([]);
  });

  test("the mail step has Continue once something is connected, and no I'll do this later", async () => {
    fakeApi(routes({}, CORE.map((id) => step(id, id === "mail" ? { done: true } : {})), { step: "mail" }));
    open();
    await screenTitle();
    const main = screen.getByRole("main");
    expect(primaries(main).map((b) => b.textContent)).toEqual(["Continue"]);
    expect(within(main).queryByRole("button", { name: "I'll do this later" })).toBeNull();
  });

  test("a mail step left for later offers Continue when it is opened again", async () => {
    fakeApi(routes({}, CORE.map((id) => step(id, id === "mail" ? { skipped: true } : {})), { step: "mail" }));
    open();
    await screenTitle();
    expect(within(screen.getByRole("main")).getByRole("button", { name: "Continue" })).toBeInTheDocument();
  });

  test("You: Continue says what is missing, then saves the form and opens the next screen", async () => {
    const user = userEvent.setup();
    const calls = fakeApi(routes({ "POST me": () => ({ person: "PER-1", full_name: "Harbor Work" }) }));
    open();
    const name = await screen.findByLabelText("Your full name");
    const main = screen.getByRole("main");
    // Until something is entered Continue is off, and says why under itself.
    expect(within(main).getByRole("button", { name: "Continue" })).toBeDisabled();
    expect(within(main).getByText("Enter your full name to go on.")).toBeInTheDocument();
    await user.click(name);
    await user.paste("Harbor Work");
    await waitFor(() => expect(within(main).getByRole("button", { name: "Continue" })).toBeEnabled(), { timeout: 5000 });
    expect(within(main).queryByRole("button", { name: "Save and continue" })).toBeNull();
    await user.click(within(main).getByRole("button", { name: "Continue" }));
    expect(await screen.findByRole("heading", { level: 2, name: "Work" }, { timeout: 5000 })).toBeInTheDocument();
    expect(calls.find((c) => c.route === "POST me")!.body).toEqual({ full_name: "Harbor Work", workspace_name: "Harbor's" });
  });

  test("a screen that was already done also saves with Continue, and moves on", async () => {
    const user = userEvent.setup();
    let zone = "UTC";
    const calls = fakeApi(
      routes(
        {
          "GET settings": () => ({ fingerprint: "fp-1", items: SETTINGS.map((i) => (i.key === "workspace.user.timezone" ? { ...i, value: zone, default: "Zone-Default" } : i)) }),
          "GET me": () => ({ person: "PER-1", full_name: "Sam Tester" }),
          "POST settings": (body) => {
            zone = String((body as { changes: Record<string, string> }).changes["workspace.user.timezone"]);
            return { changes: [], fingerprint: "fp-2", needs_restart: false };
          },
        },
        CORE.map((id) => step(id, id === "workspace" ? { done: true } : {})),
      ),
    );
    open();
    const box = await screen.findByLabelText("Your time zone");
    await user.clear(box);
    await user.click(box);
    await user.paste("Zone-Two");
    await user.click(screen.getByRole("button", { name: "Continue" }));
    // A busy computer takes longer than the default second to save and move on.
    await waitFor(() => expect(calls.some((c) => c.route === "POST settings")).toBe(true), { timeout: 5000 });
    expect(await screen.findByRole("heading", { level: 2, name: "Work" }, { timeout: 5000 })).toBeInTheDocument();
  });

  test("a screen's Continue that couldn't save keeps the person on it", async () => {
    const user = userEvent.setup();
    fakeApi(
      routes(
        {
          "GET setup/backup-folders": () => ({ folders: [{ name: "Drive One", recommended: true }], shown: "Backups › Example App" }),
          "POST setup/backup-folder/cloud": () => new Refuse(400, "That drive isn't on this computer. Choose another folder."),
        },
        CORE.map((id) => step(id)),
        { step: "backup" },
      ),
    );
    open();
    await screen.findByRole("radio", { name: /Drive One/ });
    await user.click(screen.getByRole("button", { name: "Back up now and continue" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("That drive isn't on this computer.");
    expect(screen.getByRole("heading", { level: 2, name: "Backups" })).toBeInTheDocument();
  });
});

describe("one list of seven steps", () => {
  const SEVEN: [S["WalkthroughView"]["step"], string][] = [
    ["you", "You"],
    ["work", "Work"],
    ["ai", "Your AI account"],
    ["mail", "Mail and calendar"],
    ["promises", "Your promises"],
    ["backup", "Backups"],
    ["people", "People"],
  ];

  test("progress reads 1 of 7 through 7 of 7, in the one order", async () => {
    for (const [at, label] of SEVEN) {
      fakeApi({ ...routes({}, CORE.map((id) => step(id)), { step: at }), "GET watch": () => [] });
      const { unmount } = open();
      expect(await screenTitle()).toHaveTextContent(label);
      const n = SEVEN.findIndex(([id]) => id === at) + 1;
      expect(await screen.findByText(`${label} · ${n} of 7`)).toBeInTheDocument();
      unmount();
    }
  });

  test("the step list is the seven counted steps and Done, each with the standing the server gave it", async () => {
    const steps = CORE.map((id) =>
      id === "workspace" ? step(id, { done: true }) : id === "work" ? step(id, { skipped: true }) : step(id),
    );
    fakeApi({ ...routes({}, steps, { step: "ai" }), "GET watch": () => [] });
    open();
    await screen.findByRole("navigation", { name: "Setup steps" });
    const list = within(document.getElementById("walkthrough-steps")!);
    expect(list.getAllByRole("button").map((b) => b.getAttribute("data-screen"))).toEqual([
      "you", "work", "ai", "mail", "promises", "backup", "people", "done",
    ]);
    const at = (id: string) => document.querySelector(`#walkthrough-steps [data-screen="${id}"]`);
    expect(at("you")).toHaveAttribute("data-state", "done");
    expect(at("work")).toHaveAttribute("data-state", "skipped");
    expect(at("mail")).toHaveAttribute("data-state", "todo");
  });

  test("on a narrow window the list of steps is behind a Steps button, and choosing a step closes it", async () => {
    const user = userEvent.setup();
    document.documentElement.setAttribute("data-narrow", "");
    try {
      fakeApi({ ...routes({}, CORE.map((id) => step(id)), { step: "you" }), "GET watch": () => [] });
      open();
      expect(await screen.findByText("You · 1 of 7")).toBeInTheDocument();
      const steps = screen.getByRole("button", { name: "Steps" });
      const list = document.getElementById("walkthrough-steps")!;
      expect(steps).toHaveAttribute("aria-expanded", "false");
      expect(list).toHaveAttribute("data-open", "false");
      await user.click(steps);
      expect(steps).toHaveAttribute("aria-expanded", "true");
      expect(list).toHaveAttribute("data-open", "true");
      await user.click(within(list).getByRole("button", { name: /^Backups/ }));
      expect(await screenTitle()).toHaveTextContent("Backups");
      expect(screen.getByRole("button", { name: "Steps" })).toHaveAttribute("aria-expanded", "false");
      expect(screen.getByText("Backups · 6 of 7")).toBeInTheDocument();
    } finally {
      document.documentElement.removeAttribute("data-narrow");
    }
  });

  test("Done lists all seven with Done or Skipped, and the reason when one step needed another", async () => {
    const steps = CORE.map((id) =>
      id === "workspace"
        ? step(id, { done: true })
        : id === "mail"
          ? step(id, { skipped: true })
          : id === "promises"
            ? step(id, { skipped: true, reason: "needs_mail" })
            : id === "work"
              ? step(id, { skipped: true })
              : step(id),
    );
    fakeApi({ ...routes({}, steps, { step: "done" }), "GET watch": () => [] });
    open();
    const recap = within(await screen.findByRole("list", { name: "What was set up" }));
    const rows = recap.getAllByRole("listitem");
    expect(rows.map((r) => r.getAttribute("data-step"))).toEqual(["workspace", "work", "ai", "mail", "promises", "backup", "people"]);
    expect(rows[0]).toHaveTextContent("Done");
    expect(rows[1]).toHaveTextContent("Skipped");
    expect(rows[3]).toHaveTextContent("Skipped");
    expect(rows[4]).toHaveTextContent("Skipped (needs mail)");
    expect(rows[2]).toHaveTextContent("Not set up yet");
  });
});

describe("names", () => {
  test("You says what the assistant is called, and Rename turns it into a field in place that saves through the settings", async () => {
    const user = userEvent.setup();
    const calls = fakeApi({
      ...routes(),
      "POST settings": () => ({ changes: [], fingerprint: "fp-2", needs_restart: false }),
    });
    open();
    expect(await screen.findByText("Your assistant is called Reginald.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Rename" }));
    const field = await screen.findByLabelText("Your assistant's name");
    expect(field).toHaveValue("Reginald");
    await waitFor(() => expect(field).toHaveFocus());
    await user.clear(field);
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
    await user.type(field, "Pilot");
    await user.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(calls.some((c) => c.route === "POST settings")).toBe(true));
    expect(calls.find((c) => c.route === "POST settings")!.body).toEqual({
      changes: { "workspace.assistant_name": "Pilot" },
      reset: [],
      fingerprint: "fp-1",
    });
  });

  test("Done shows the app's name with Rename", async () => {
    const user = userEvent.setup();
    const calls = fakeApi({
      ...routes({}, CORE.map((id) => step(id)), { step: "done" }),
      "GET watch": () => [],
      "POST settings": () => ({ changes: [], fingerprint: "fp-2", needs_restart: false }),
    });
    open();
    expect(await screen.findByText("The name at the top of the screen is Workspace.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Rename" }));
    const field = await screen.findByLabelText("The name at the top of the screen");
    await user.clear(field);
    await user.type(field, "Avery's");
    await user.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(calls.some((c) => c.route === "POST settings")).toBe(true));
    expect((calls.find((c) => c.route === "POST settings")!.body as S["SettingsSave"]).changes).toEqual({ "workspace.name": "Avery's" });
  });
});
