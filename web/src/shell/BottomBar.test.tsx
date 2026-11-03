import "@testing-library/jest-dom/vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { project } from "../lib/records-fixtures";
import { fakeApi, renderApp } from "../test-utils";
import { BottomBar } from "./BottomBar";

function show(handlers: Partial<Record<"onHandIn" | "onAsk" | "onHelp" | "onFeedback" | "onOpenGuide", () => void>> = {}) {
  fakeApi({ "GET panels": () => [], "GET changes": () => [], "GET followups": () => [] });
  const noop = () => undefined;
  renderApp(
    <BottomBar
      current="today"
      version="9.8.7"
      onHandIn={handlers.onHandIn ?? noop}
      onOpenRecord={noop}
      onAsk={handlers.onAsk ?? noop}
      onHelp={handlers.onHelp ?? noop}
      onFeedback={handlers.onFeedback ?? noop}
      onOpenGuide={handlers.onOpenGuide ?? noop}
    />,
  );
}

test("the bar has Today, To-dos, a tonal plus for handing something in, Schedule and More, and no Search", () => {
  show();
  const bar = screen.getByRole("navigation", { name: "Views" });
  expect(within(bar).getByRole("link", { name: "Today" })).toHaveAttribute("aria-current", "page");
  expect(within(bar).getByRole("link", { name: "To-dos" })).toHaveAttribute("href", expect.stringMatching(/#work\/open$/));
  // The plus is the tonal weight, so the bar never draws a second filled button beside a screen's own primary (VP04).
  expect(within(bar).getByRole("button", { name: "Hand something in" })).toHaveAttribute("data-weight", "tonal");
  expect(within(bar).getByRole("link", { name: "Schedule" })).toHaveAttribute("href", expect.stringMatching(/#schedule$/));
  expect(within(bar).getByRole("button", { name: "More" })).toBeInTheDocument();
  expect(within(bar).queryByRole("button", { name: "Search" })).toBeNull();
  expect(within(bar).queryByRole("button", { name: "Work" })).toBeNull();
});

test("the tab of the screen that is open is the current one, and More is current on a screen that has no tab", () => {
  fakeApi({ "GET panels": () => [], "GET changes": () => [], "GET followups": () => [] });
  const noop = () => undefined;
  renderApp(<BottomBar current="work/open" version="9.8.7" onHandIn={noop} onHelp={noop} onFeedback={noop} onOpenGuide={noop} />);
  const bar = screen.getByRole("navigation", { name: "Views" });
  expect(within(bar).getByRole("link", { name: "To-dos" })).toHaveAttribute("aria-current", "page");
  expect(within(bar).getByRole("link", { name: "Today" })).not.toHaveAttribute("aria-current");
  expect(within(bar).getByRole("button", { name: "More" })).not.toHaveAttribute("aria-current");
});

test("the plus runs the same action as the header's", async () => {
  const user = userEvent.setup();
  const onHandIn = vi.fn();
  const onAsk = vi.fn();
  show({ onHandIn, onAsk });
  await user.click(screen.getByRole("button", { name: "Hand something in" }));
  expect(onHandIn).toHaveBeenCalledTimes(1);
  expect(onAsk).not.toHaveBeenCalled();
});

test("More has the work screens, the saved items and Settings in sections, with no Connections or Add-ons beside it, the help items, and this device's theme and density", async () => {
  const user = userEvent.setup();
  const onHelp = vi.fn();
  show({ onHelp });
  await user.click(screen.getByRole("button", { name: "More" }));
  const sheet = await screen.findByRole("dialog", { name: "More" });
  expect(within(sheet).getAllByRole("link").map((a) => a.textContent)).toEqual(["What changed", "Handled for you", "Follow-ups", "Stages", "Projects", "People", "Files", "Notes", "Knowledge", "Settings"]);
  expect(within(sheet).getByText("Work")).toBeInTheDocument();
  expect(within(sheet).getByText("Saved items")).toBeInTheDocument();
  expect(within(sheet).getByRole("link", { name: "Stages" })).toHaveAttribute("href", expect.stringMatching(/#work\/stages$/));
  expect(within(sheet).getByRole("button", { name: "Show keyboard shortcuts" })).toBeInTheDocument();
  expect(within(sheet).getByRole("button", { name: "Setup guide" })).toBeInTheDocument();
  expect(within(sheet).getByRole("button", { name: "Write feedback" })).toBeInTheDocument();
  expect(within(sheet).getByText("Version 9.8.7")).toBeInTheDocument();
  expect(within(sheet).getByRole("radiogroup", { name: "Theme" })).toBeInTheDocument();
  expect(within(sheet).getByRole("radiogroup", { name: "Spacing" })).toBeInTheDocument();
  await user.click(within(sheet).getByRole("button", { name: "Show keyboard shortcuts" }));
  await waitFor(() => expect(onHelp).toHaveBeenCalledTimes(1));
});

test("with no side besides Personal the phone's More sheet says Keeping track, not Work, and lists no Stages", async () => {
  const user = userEvent.setup();
  fakeApi({
    "GET panels": () => [],
    "GET changes": () => [],
    "GET followups": () => [],
    "GET setup/business": () => ({ business: false, name: null, personal: "PRJ-personal", sides: [], chosen: null }),
    "GET projects": () => [project("PRJ-personal", "Personal")],
  });
  const noop = () => undefined;
  renderApp(<BottomBar current="today" version="9.8.7" onHandIn={noop} onOpenRecord={noop} onAsk={noop} onHelp={noop} onFeedback={noop} onOpenGuide={noop} />);
  const bar = screen.getByRole("navigation", { name: "Views" });
  await user.click(within(bar).getByRole("button", { name: "More" }));
  const sheet = await screen.findByRole("dialog", { name: "More" });
  expect(await within(sheet).findByText("Keeping track")).toBeInTheDocument();
  expect(within(sheet).queryByText("Work")).toBeNull();
  expect(within(sheet).queryByRole("link", { name: "Stages" })).toBeNull();
  expect(within(sheet).getAllByRole("link").slice(0, 3).map((a) => a.textContent)).toEqual(["What changed", "Handled for you", "Follow-ups"]);
});
