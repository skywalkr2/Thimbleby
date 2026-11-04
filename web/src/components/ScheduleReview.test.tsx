import "@testing-library/jest-dom/vitest";
import { render, screen, within } from "@testing-library/react";
import { fullDay } from "../lib/dates";
import { scheduleRoutes, TODAY } from "../lib/schedule-fixtures";
import { fakeApi, renderApp } from "../test-utils";
import { Schedule } from "./Schedule";
import { ShortcutHelp } from "./ShortcutHelp";

// The Schedule as the visual review asks: a two-row toolbar, a now-dot on today's hour line, and the page's own keyboard
// sentence moved into the shortcuts list.

beforeEach(() => {
  window.localStorage.clear();
  window.localStorage.setItem("cockpit:schedule-view", "day");
  vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener: () => undefined, removeEventListener: () => undefined }));
  Element.prototype.scrollIntoView = vi.fn();
});

async function open() {
  fakeApi(scheduleRoutes());
  renderApp(<Schedule />);
  await screen.findByRole("heading", { level: 2, name: fullDay(TODAY) });
}

test("the toolbar is two rows: moving and the range, then the view switch and the side filter", async () => {
  await open();
  const rows = document.querySelectorAll("[data-bar-row]");
  expect(rows).toHaveLength(2);
  const first = within(rows[0] as HTMLElement);
  const second = within(rows[1] as HTMLElement);
  expect(first.getByRole("button", { name: "Today" })).toBeInTheDocument();
  expect(first.getByRole("heading", { level: 2, name: fullDay(TODAY) })).toBeInTheDocument();
  expect(second.getByRole("radiogroup")).toBeInTheDocument();
});

test("the page no longer carries a sentence about keys", async () => {
  await open();
  expect(document.querySelector("p.hint")).toBeNull();
  expect(screen.queryByText(/hold Shift to move a week/)).toBeNull();
});

test("the shortcuts list holds the Schedule's keys", () => {
  render(<ShortcutHelp open onClose={() => undefined} keys={{}} />);
  const dialog = screen.getByRole("dialog");
  expect(within(dialog).getByText(/Pick Day, Work week, Week, Month or Timeline/)).toBeInTheDocument();
  expect(within(dialog).getByText(/Move to the previous or next day, week, month or range/)).toBeInTheDocument();
});

test("the shortcuts list is three labeled groups with the most-used keys first, and no touch gesture in it", () => {
  render(<ShortcutHelp open onClose={() => undefined} keys={{ next: "j", previous: "k", undo: "u", primary: "a", hand_in: "h" }} />);
  const dialog = screen.getByRole("dialog");
  const labels = ["Move around", "Act on an item", "Go to"].map((name) => within(dialog).getByText(name));
  expect(labels).toHaveLength(3);
  const keys = Array.from(dialog.querySelectorAll("kbd")).map((k) => k.textContent);
  expect(keys.indexOf("j")).toBeLessThan(keys.indexOf("u"));
  expect(keys.indexOf("u")).toBeLessThan(keys.indexOf("h"));
  expect(within(dialog).queryByText(/swipe/i)).toBeNull();
});
