import "@testing-library/jest-dom/vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RestartProvider } from "../lib/restart";
import { initAppearance } from "../lib/theme";
import { fakeApi, rcFixture, renderApp, statusFixture } from "../test-utils";
import { Header } from "./Header";

/** Windows narrower than 1440px but not a phone: the media query the header watches matches. */
function below1440() {
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: /max-width:\s*1439px/.test(query), media: query, addEventListener: () => undefined, removeEventListener: () => undefined }));
}

function show(over: { status?: ReturnType<typeof statusFixture>; changes?: unknown[]; demo?: boolean; logo?: boolean; narrow?: boolean; links?: unknown; handlers?: Partial<Record<"onHandIn" | "onAsk" | "onHelp" | "onFeedback" | "onOpenGuide" | "onOpenQuality" | "onOpenSettings", () => void>> } = {}) {
  fakeApi({
    "GET settings": () => ({ fingerprint: "fp", items: over.links === undefined ? [] : [linksItem(over.links)] }),
    "GET status": () => over.status ?? statusFixture(),
    "GET me": () => ({ full_name: "Casey Example", person: null }),
    "GET runtime-config": () => ({ instance: null }),
    "GET changes": () => over.changes ?? [{ id: "REQ-1" }],
  });
  const rc = rcFixture({ demo: over.demo ?? false, logo: over.logo ?? false, workspace_name: "Example Workspace" });
  const noop = () => undefined;
  const h = over.handlers ?? {};
  renderApp(
    <RestartProvider hellos={1}>
      <Header
        rc={rc}
        live={{ state: "live", lastUpdate: null, refresh: noop }}
        narrow={over.narrow ?? false}
        shortcuts={rc.shortcuts}
        onHandIn={h.onHandIn ?? noop}
        onOpenRecord={noop}
        onAsk={h.onAsk ?? noop}
        onHelp={h.onHelp ?? noop}
        onFeedback={h.onFeedback ?? noop}
        onOpenGuide={h.onOpenGuide ?? noop}
        onOpenQuality={h.onOpenQuality ?? noop}
        onOpenSettings={h.onOpenSettings ?? noop}
      />
    </RestartProvider>,
  );
}

const linksItem = (value: unknown) => ({
  key: "ui.links",
  file: "ui",
  group: "ui",
  description: "Links to your own pages.",
  type: "other",
  options: [],
  value,
  default: [],
  source: "file",
  locked: false,
  basic: false,
  editable: true,
});

afterEach(() => {
  vi.unstubAllGlobals();
  document.documentElement.removeAttribute("data-theme");
  document.documentElement.removeAttribute("data-density");
  window.localStorage.clear();
});

test("the brand is a link to Today, named for what it does, with the product's mark and the product's name from the wording sheet", () => {
  show();
  const brand = screen.getByRole("link", { name: "Go to Today · Example Workspace" });
  expect(brand).toHaveAttribute("href", expect.stringMatching(/#today$/));
  // The name beside the mark is the product's; the workspace's own name is in the link's name, the person's menu and the tab's title.
  expect(brand).toHaveTextContent("Thimbleby");
  expect(brand).not.toHaveTextContent("Example Workspace");
  // The mark is decorative (the name beside it is the text), and comes in a day and a night version, one drawn at a time.
  const marks = Array.from(brand.querySelectorAll("img[data-brand-mark]"));
  expect(marks.map((m) => m.getAttribute("data-brand-mark"))).toEqual(["day", "night"]);
  for (const mark of marks) expect(mark).toHaveAttribute("alt", "");
  expect(marks[0].getAttribute("src")).not.toBe(marks[1].getAttribute("src"));
  expect(marks[0].className).not.toBe(marks[1].className);
});

test("the mark switches with the theme in force, the person's own choice as well as the system's", () => {
  const css = readFileSync(join(__dirname, "Header.module.css"), "utf8");
  expect(css).toMatch(/\.markDay \{ display: var\(--mark-day-display\); \}/);
  expect(css).toMatch(/\.markNight \{ display: var\(--mark-night-display\); \}/);
  // The two display tokens are set under the same selectors as the rest of the night values, so the theme menu's choice and the system's both reach them.
  const tokens = readFileSync(join(__dirname, "..", "theme", "tokens.css"), "utf8");
  const light = tokens.slice(0, tokens.indexOf("/* ---------- Dark"));
  const media = tokens.slice(tokens.indexOf('@media (prefers-color-scheme: dark)'), tokens.indexOf(':root[data-theme="dark"] {'));
  const chosen = tokens.slice(tokens.indexOf(':root[data-theme="dark"] {'), tokens.indexOf("/* ---------- Density"));
  expect(light).toContain("--mark-day-display: block; --mark-night-display: none;");
  expect(media).toContain(":root:not([data-theme=\"light\"])");
  for (const night of [media, chosen]) expect(night).toContain("--mark-day-display: none; --mark-night-display: block;");
});

test("a workspace with a logo shows the image, found under the API's brand address", () => {
  show({ logo: true });
  const image = screen.getByRole("link", { name: "Go to Today · Example Workspace" }).querySelector("img")!;
  expect(image).toHaveAttribute("src", "api/brand/logo");
  expect(image).toHaveAttribute("alt", "");
  // The workspace's own logo wins: the product's mark is not drawn beside it.
  expect(screen.getByRole("link", { name: "Go to Today · Example Workspace" }).querySelector("[data-brand-mark]")).toBeNull();
});

test("a demo workspace shows the Demo chip, in words, and others don't", () => {
  show({ demo: true });
  expect(screen.getByText("Demo")).toBeInTheDocument();
});

test("the assistant's line is a dot and its name in the header beside the status chip", async () => {
  show();
  const chip = await screen.findByRole("button", { name: /^App status: / });
  const alive = await screen.findByRole("button", { name: /^Helper/ });
  expect(alive).toHaveTextContent(/^Helper$/);
  expect(alive.querySelector("[data-indicator]")).not.toBeNull();
  expect(alive.parentElement).toBe(chip.parentElement);
});

// One status on screen: a stopped or held-up assistant used to show a red "x" line beside a chip saying "All good".
const BAD_ASSISTANTS: [string, ReturnType<typeof statusFixture>][] = [
  ["a failed run", statusFixture({}, { assistant: { last_run_failed: true } })],
  ["an account out of credit", statusFixture({}, { assistant: { paused: [{ account: "acct-1", until: "9999-01-01T00:00:00+00:00" }] } })],
  ["stuck background work", statusFixture({}, { assistant: { loop_stuck_since: "2026-10-13T08:00:00+00:00" } })],
];

test.each(BAD_ASSISTANTS)("%s: one status in the header, it names the assistant's state and never says All good", async (_name, status) => {
  show({ status });
  await waitFor(() => expect(screen.getByRole("button", { name: /^App status: / })).not.toHaveTextContent("All good"));
  const chip = screen.getByRole("button", { name: /^App status: / });
  expect(chip).toHaveTextContent(/^Helper: /);
  expect(screen.queryByRole("button", { name: /^Helper: / })).toBeNull();
  expect(screen.queryByText("All good")).toBeNull();
  expect(document.querySelectorAll("[data-status], [data-alive]")).toHaveLength(1);
});

test("a fine assistant: the chip says All good, and the assistant's line shows beside it", async () => {
  show();
  const chip = await screen.findByRole("button", { name: /^App status: / });
  await waitFor(() => expect(chip).toHaveTextContent("All good"));
  expect(await screen.findByRole("button", { name: /^Helper/ })).toHaveAttribute("data-alive", "fine");
});

test("no Demo chip when the workspace is not a demo", () => {
  show();
  expect(screen.queryByText("Demo")).toBeNull();
});

test("the header carries a search field named for the assistant, which is not a button that opens a box", () => {
  show();
  const field = screen.getAllByRole("searchbox")[0];
  expect(field).toHaveAttribute("placeholder", "Search or ask Helper");
  expect(screen.queryByRole("button", { name: "Search or ask" })).toBeNull();
});

test("Hand something in is the tonal weight, never the filled one, so a screen's own primary is the only filled button; it opens the hand-in", async () => {
  const user = userEvent.setup();
  const onHandIn = vi.fn();
  show({ handlers: { onHandIn } });
  const button = screen.getByRole("button", { name: "Hand something in" });
  expect(button).toHaveAttribute("data-variant", "tonal");
  expect(button).toHaveAttribute("data-weight", "tonal");
  expect(document.querySelectorAll('header [data-weight="filled"]')).toHaveLength(0);
  await user.click(button);
  expect(onHandIn).toHaveBeenCalledTimes(1);
});

test("Help is a menu: shortcuts, the setup guide, Missed one, feedback and the version as a line that does nothing", async () => {
  const user = userEvent.setup();
  const onHelp = vi.fn();
  const onFeedback = vi.fn();
  const onOpenGuide = vi.fn();
  show({ handlers: { onHelp, onFeedback, onOpenGuide } });
  await user.click(screen.getByRole("button", { name: "Help" }));
  expect(screen.getAllByRole("menuitem").map((i) => i.textContent)).toEqual(["Show keyboard shortcuts", "Setup guide", "Missed something?", "Write feedback", "Version 9.8.7"]);
  expect(screen.getByRole("menuitem", { name: "Version 9.8.7" })).toHaveAttribute("aria-disabled", "true");
  await user.click(screen.getByRole("menuitem", { name: "Show keyboard shortcuts" }));
  expect(onHelp).toHaveBeenCalledTimes(1);
  await user.click(screen.getByRole("button", { name: "Help" }));
  await user.click(screen.getByRole("menuitem", { name: "Setup guide" }));
  await waitFor(() => expect(onOpenGuide).toHaveBeenCalledTimes(1));
  await user.click(screen.getByRole("button", { name: "Help" }));
  await user.click(screen.getByRole("menuitem", { name: "Write feedback" }));
  expect(onFeedback).toHaveBeenCalledTimes(1);
});

test("the person's initials open the user menu, where theme and density are saved for this device", async () => {
  const user = userEvent.setup();
  initAppearance({ brand_color: null, theme: "system", density: "comfortable" });
  show();
  const avatar = await screen.findByRole("button", { name: "Menu for Casey Example" });
  expect(avatar).toHaveTextContent("CE");
  await user.click(avatar);
  const dark = screen.getByRole("menuitemradio", { name: "Dark" });
  expect(screen.getByRole("menuitemradio", { name: "Match this computer" })).toBeChecked();
  await user.click(dark);
  expect(document.documentElement).toHaveAttribute("data-theme", "dark");
  expect(window.localStorage.getItem("cockpit:theme")).toBe("dark");
  await user.click(screen.getByRole("button", { name: "Menu for Casey Example" }));
  expect(screen.getByRole("menuitemradio", { name: "Dark" })).toBeChecked();
  await user.click(screen.getByRole("menuitemradio", { name: "Compact" }));
  expect(document.documentElement).toHaveAttribute("data-density", "compact");
  expect(window.localStorage.getItem("cockpit:density")).toBe("compact");
});

test("until the workspace knows the person's name, the avatar uses the workspace's", async () => {
  show();
  await waitFor(() => expect(screen.getByRole("button", { name: /^Menu for / })).toBeInTheDocument());
});

test("on a phone only the brand, the status chip, a search icon and the user menu remain", async () => {
  show({ narrow: true, demo: true });
  const header = screen.getByRole("banner");
  expect(within(header).getByRole("link", { name: /Go to Today/ })).toBeInTheDocument();
  expect(within(header).getByRole("button", { name: /^App status: / })).toBeInTheDocument();
  expect(within(header).getByRole("button", { name: /^Menu for / })).toBeInTheDocument();
  expect(within(header).getByRole("button", { name: "Search" })).toBeInTheDocument();
  expect(within(header).queryByRole("button", { name: "Search or ask" })).toBeNull();
  expect(within(header).queryByRole("button", { name: "Hand something in" })).toBeNull();
  expect(within(header).queryByRole("button", { name: "Help" })).toBeNull();
  expect(within(header).getByText("Demo")).toBeInTheDocument();
});

test("on a phone only the logo, the status chip, the search icon and the avatar are in the header: no workspace name, no assistant label", async () => {
  show({ narrow: true });
  const header = screen.getByRole("banner");
  const brand = within(header).getByRole("link", { name: "Go to Today · Example Workspace" });
  // The name is the link's accessible name; it takes no room on screen.
  expect(brand).not.toHaveTextContent("Example Workspace");
  expect(brand.querySelector("img[data-brand-mark]")).not.toBeNull();
  await within(header).findByRole("button", { name: /^App status: / });
  expect(within(header).queryByRole("button", { name: /^Helper/ })).toBeNull();
  expect(Array.from(header.querySelectorAll("button, a")).map((el) => el.getAttribute("aria-label") ?? el.textContent)).toHaveLength(4);
});

test("the search icon on a phone opens the search field in a strip under the header, which ends with Ask", async () => {
  const user = userEvent.setup();
  const onAsk = vi.fn();
  show({ narrow: true, handlers: { onAsk } });
  await user.click(screen.getByRole("button", { name: "Search" }));
  const field = screen.getByRole("searchbox");
  expect(field).toHaveAttribute("placeholder", "Search or ask Helper");
  await user.click(field);
  await user.click(screen.getByRole("button", { name: "Ask Helper" }));
  expect(onAsk).toHaveBeenCalledWith("");
});

test("on a phone the assistant's state is in the status chip's popover", async () => {
  const user = userEvent.setup();
  show({ narrow: true });
  await user.click(await screen.findByRole("button", { name: /^App status: / }));
  const dialog = await screen.findByRole("dialog", { name: "Status" });
  const alive = within(dialog).getByText("Helper", { selector: "p" }).closest("li")!;
  expect(alive).toHaveAttribute("data-state", "alive");
  expect(alive).toHaveTextContent("No tasks yet");
});

test("from a wider screen the assistant's line is beside the chip and the popover doesn't repeat it", async () => {
  const user = userEvent.setup();
  show();
  await user.click(await screen.findByRole("button", { name: /^App status: / }));
  const dialog = await screen.findByRole("dialog", { name: "Status" });
  expect(dialog.querySelector('[data-state="alive"]')).toBeNull();
});

test("below 1440px the assistant's state moves into the status chip's popover, as on the phone, and the line beside the chip is gone", async () => {
  const user = userEvent.setup();
  below1440();
  show();
  const chip = await screen.findByRole("button", { name: /^App status: / });
  expect(screen.queryByRole("button", { name: /^Helper/ })).toBeNull();
  await user.click(chip);
  const dialog = await screen.findByRole("dialog", { name: "Status" });
  const alive = dialog.querySelector('[data-state="alive"]') as HTMLElement;
  expect(alive).not.toBeNull();
  expect(alive).toHaveTextContent("No tasks yet");
});

test("the header has no Quick links button: the links are the first group of the person's menu, each opening in a new tab", async () => {
  const user = userEvent.setup();
  const address = "https" + "://boards.example.org/plan";
  show({ links: [{ name: "Planning board", address }, { name: "Odd one", address: "not an address" }] });
  expect(screen.queryByRole("button", { name: "Quick links" })).toBeNull();
  await user.click(await screen.findByRole("button", { name: /^Menu for / }));
  const link = await screen.findByRole("menuitem", { name: "Planning board" });
  expect(link).toHaveAttribute("href", address);
  expect(link).toHaveAttribute("target", "_blank");
  expect(screen.queryByRole("menuitem", { name: "Odd one" })).toBeNull();
  // The person and Settings lead, then the links under their own title, then the figures and the appearance choices.
  const groups = screen.getAllByRole("group").map((g) => g.getAttribute("aria-label"));
  expect(groups.slice(0, 4)).toEqual(["Casey Example · Example Workspace", "Quick links", "How Helper is doing", "Theme"]);
});

test("the person's menu leads with their name and the workspace's, then Settings, and the button is named after them, not after what is in the menu", async () => {
  const user = userEvent.setup();
  const onOpenSettings = vi.fn();
  show({ handlers: { onOpenSettings } });
  const button = await screen.findByRole("button", { name: "Menu for Casey Example" });
  expect(button).not.toHaveAccessibleName(/appearance/i);
  await user.click(button);
  const first = screen.getAllByRole("group")[0];
  expect(first).toHaveAccessibleName("Casey Example · Example Workspace");
  expect(within(first).getAllByRole("menuitem").map((m) => m.textContent)).toEqual(["Settings"]);
  // The figures entry is a plain line: nothing in it looks like a chosen option.
  const doing = screen.getByRole("menuitem", { name: "How Helper is doing" });
  expect(doing.querySelector("svg")).toBeNull();
  await user.click(within(first).getByRole("menuitem", { name: "Settings" }));
  await waitFor(() => expect(onOpenSettings).toHaveBeenCalledTimes(1));
});

test("with no links the person's menu is only the appearance choices", async () => {
  const user = userEvent.setup();
  show({ links: [] });
  await user.click(await screen.findByRole("button", { name: /^Menu for / }));
  expect(screen.queryByRole("group", { name: "Quick links" })).toBeNull();
  expect(screen.getByRole("group", { name: "Theme" })).toBeInTheDocument();
});

test("the person's menu has How the assistant is doing, which opens the figures, and Quality is no longer in Settings' list", async () => {
  const user = userEvent.setup();
  const onOpenQuality = vi.fn();
  show({ handlers: { onOpenQuality } });
  await user.click(await screen.findByRole("button", { name: /^Menu for / }));
  await user.click(screen.getByRole("menuitem", { name: "How Helper is doing" }));
  expect(onOpenQuality).toHaveBeenCalledTimes(1);
});

test("Missed something? is in the Help menu, with its words, and not a button of the header", async () => {
  const user = userEvent.setup();
  show();
  await user.click(await screen.findByRole("button", { name: "Help" }));
  expect(await screen.findByRole("menuitem", { name: "Missed something?" })).toBeInTheDocument();
  await user.keyboard("{Escape}");
  expect(screen.queryByRole("button", { name: "Missed something?" })).toBeNull();
});

test("a new workspace offers no Missed one until something has been read or handed in", async () => {
  show({ changes: [] });
  const user = userEvent.setup();
  await screen.findByRole("button", { name: "Hand something in" });
  await user.click(screen.getByRole("button", { name: "Help" }));
  await waitFor(() => expect(screen.queryByRole("menuitem", { name: "Missed something?" })).toBeNull());
});

test("Missed one shows once the assistant has been given anything it could have missed", async () => {
  const user = userEvent.setup();
  show({ changes: [{ id: "REQ-1" }] });
  await user.click(await screen.findByRole("button", { name: "Help" }));
  expect(await screen.findByRole("menuitem", { name: "Missed something?" })).toBeInTheDocument();
});

test("the header clips what is wider than the window but lets the search results drop below it", () => {
  const css = readFileSync(join(__dirname, "Header.module.css"), "utf8");
  const header = css.slice(css.indexOf(".header {"), css.indexOf("}", css.indexOf(".header {")));
  expect(header).toMatch(/overflow-x: clip/);
  expect(header).toMatch(/overflow-y: visible/);
  expect(header).not.toMatch(/overflow: hidden/);
});
