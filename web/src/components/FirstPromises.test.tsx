import "@testing-library/jest-dom/vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { S } from "../lib/api";
import { RestartProvider } from "../lib/restart";
import { fakeApi, renderApp, setupStep, setupView, statusFixture } from "../test-utils";
import { FirstPromises } from "./FirstPromises";
import { MissedOneProvider } from "./MissedOne";
import { Walkthrough } from "./Walkthrough";

// The walkthrough's first-result step (design 7.8): with an AI account and mail it explains what the assistant looks for and
// that it reads in the background; the findings and what was read are never shown here, they arrive on Today.

const view = (over: Partial<S["FirstPromisesView"]> = {}): S["FirstPromisesView"] => ({
  stage: "ready",
  sources: ["Your inbox"],
  days: 14,
  count: 0,
  finished: 0,
  unpriced: 0,
  promises: [],
  more: 0,
  coverage: [],
  complete: true,
  messages_read: 0,
  meetings_week: 0,
  ...over,
});

const folder = (name: string, over: Partial<S["FirstFolder"]> = {}): S["FirstFolder"] => ({ source: name.toLowerCase(), name, sent: false, outcome: "read", ...over });
const place = (folders: S["FirstFolder"][], over: Partial<S["FirstPlace"]> = {}): S["FirstPlace"] => ({ kind: "mail", account: "work@example.com", folders, missing_sent: false, ...over });

const promise = (id: string, over: Partial<S["FirstPromise"]> = {}): S["FirstPromise"] => ({
  action: id,
  text: `Promise ${id}`,
  owner: "Ana Example",
  mine: false,
  promised_to: [],
  ...over,
});

const noop = () => undefined;

function show(
  first: S["FirstPromisesView"],
  routes: Parameters<typeof fakeApi>[0] = {},
  go: (screen: S["WalkthroughView"]["step"]) => void = noop,
  handIn: () => void = noop,
) {
  const calls = fakeApi({ "GET setup/first-promises": () => first, ...routes });
  const rendered = renderApp(
    <MissedOneProvider>
      <FirstPromises go={go} onHandIn={handIn} />
    </MissedOneProvider>,
  );
  return Object.assign(calls, { client: rendered.client });
}

describe("before the offer", () => {
  test("with no AI account it points back to the account screen", async () => {
    const user = userEvent.setup();
    const go = vi.fn();
    show(view({ stage: "no_ai" }), {}, go);
    expect(await screen.findByText(/Choose an AI account first/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Go to your AI account" }));
    expect(go).toHaveBeenCalledWith("ai");
  });

  test("with no mail the main action is to hand something in, and the way back to mail is the quieter one", async () => {
    const user = userEvent.setup();
    const go = vi.fn();
    const handIn = vi.fn();
    show(view({ stage: "no_mail" }), {}, go, handIn);
    expect(await screen.findByText(/hand it something to read/)).toBeInTheDocument();
    expect(screen.queryByText(/Connect your mail first/)).toBeNull();
    const main = screen.getByRole("button", { name: "Hand something in to see what it does" });
    const mail = screen.getByRole("button", { name: "Go to mail and calendar" });
    expect(main.className).toMatch(/_primary/);
    expect(mail.className).not.toMatch(/_primary/);
    await user.click(main);
    expect(handIn).toHaveBeenCalledTimes(1);
    await user.click(mail);
    expect(go).toHaveBeenCalledWith("mail");
  });

});

describe("the background explanation", () => {
  const stages = ["reading", "offer", "working", "ready"] as const;

  test.each(stages)("at the %s stage it says what is looked for and that it reads in the background, and offers nothing to start", async (stage) => {
    show(view({ stage, count: 4, days: 14, estimate_usd: 0.12 }));
    expect(await screen.findByText(/Once setup is done, the assistant reads/)).toBeInTheDocument();
    expect(screen.getByText(/promises you made and promises made to you/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Start" })).toBeNull();
  });

  test("even when the API holds promises, a follow-up and what was read, none of it is shown", async () => {
    const calls = show(view({
      stage: "ready",
      count: 3,
      finished: 3,
      promises: [promise("ACT-1", { mine: true }), promise("ACT-2")],
      more: 2,
      follow_up: { person: "PER-1", name: "Ana Example", message: "Hello Ana", to_send: 1 },
      coverage: [place([folder("Inbox")])],
      messages_read: 12,
      meetings_week: 3,
    }));
    await screen.findByText(/Once setup is done, the assistant reads/);
    const main = document.body;
    expect(main).not.toHaveTextContent("Promise ACT-1");
    expect(main).not.toHaveTextContent("Promises found");
    expect(main).not.toHaveTextContent("What was read");
    expect(main).not.toHaveTextContent(/follow-up/i);
    expect(main).not.toHaveTextContent(/messages? read/);
    expect(screen.queryByRole("list")).toBeNull();
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(calls.some((c) => c.route === "POST setup/first-promises/go")).toBe(false);
  });

  test("it says Today holds what was found, as one line to look over", async () => {
    show(view({ stage: "ready" }));
    expect(await screen.findByText(/waits there as one line to look over/)).toBeInTheDocument();
  });
});

describe("in the walkthrough", () => {
  const CORE = ["workspace", "ai", "mail", "backup", "people", "template", "first_note", "addons"];
  const shell = (step: S["WalkthroughView"]["step"]) => {
    const calls = fakeApi({
      "GET setup": () => setupView(CORE.map((id) => setupStep(id, { done: id === "mail" })), { walkthrough: { open: true, step } }),
      "GET setup/first-promises": () => view({ stage: "offer", count: 4, days: 14, estimate_usd: 0.12 }),
      "GET settings": () => ({ fingerprint: "fp", items: [] }),
      "GET me": () => ({ person: null, full_name: "" }),
      "GET ai/endpoints": () => [],
      "GET ai/accounts": () => [],
      "GET ai/local": () => [],
      "GET packs": () => ({ enabled: true, feeds: [], available: [], installed: [] }),
      "GET sign-ins": () => [],
      "GET watch": () => [],
      "GET status": () => statusFixture(),
      "GET templates": () => [],
      "POST setup/walkthrough": (body: unknown) => ({ open: true, step: "you", closed: false, finished: false, ...(body as object) }),
    });
    renderApp(
      <RestartProvider hellos={1} pollSeconds={0.05} doneSeconds={0.05}>
        <Walkthrough at={null} onOpenPeople={noop} onOpenAddons={noop} onHandIn={noop} onFinishLater={noop} onDone={noop} />
      </RestartProvider>,
    );
    return calls;
  };

  test("the first result is the screen right after mail and before backups, and nothing else comes first", async () => {
    const user = userEvent.setup();
    shell("mail");
    const nav = await screen.findByRole("navigation", { name: "Setup steps" });
    expect(within(nav).getAllByRole("button").map((b) => b.getAttribute("data-screen")).filter(Boolean)).toEqual(["you", "work", "ai", "mail", "promises", "backup", "people", "done"]);
    await user.click(await screen.findByRole("button", { name: "Continue" }));
    expect(await screen.findByRole("heading", { level: 2, name: "Your promises" })).toBeInTheDocument();
    expect(await screen.findByText(/Once setup is done, the assistant reads/)).toBeInTheDocument();
    // The explanation is on screen before anything about projects, areas, packs or more accounts.
    expect(screen.queryByText(/Optional extras/)).toBeNull();
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(await screen.findByRole("heading", { level: 2, name: "Backups" })).toBeInTheDocument();
  });

  test("one primary button: the walkthrough's Continue, with nothing to start in the step", async () => {
    shell("promises");
    await screen.findByText(/Once setup is done, the assistant reads/);
    expect(screen.queryByRole("button", { name: "Start" })).toBeNull();
    expect(screen.getByRole("button", { name: "Continue" })).toHaveAttribute("data-variant", "primary");
    expect(document.querySelectorAll('button[data-variant="primary"]')).toHaveLength(1);
  });

  test("it resumes at the first result", async () => {
    shell("promises");
    expect(await screen.findByRole("heading", { level: 2, name: "Your promises" })).toBeInTheDocument();
  });
});
