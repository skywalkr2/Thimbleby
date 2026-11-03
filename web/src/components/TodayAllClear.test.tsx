import "@testing-library/jest-dom/vitest";
import { screen, waitFor } from "@testing-library/react";
import type { S } from "../lib/api";
import { time } from "../lib/dates";
import { fakeApi, renderApp } from "../test-utils";
import { AllClear } from "./TodayAllClear";
import { useCoverage } from "../lib/coverage";

const NOW = new Date(2026, 9, 19, 9, 0);
const LATEST = new Date(2026, 9, 19, 7, 40);
const read = (id: string, when: Date): S["WatchSourceView"] => ({
  id,
  label: id,
  connector: "kind-a",
  connector_label: "A kind",
  enabled: true,
  every_minutes: 15,
  items: 0,
  last: { outcome: "ok", started_at: when.toISOString(), new: 0, changed: 0, removed: 0 },
  read_at: when.toISOString(),
  failures: 0,
  problem: null,
});

function Card() {
  const found = useCoverage();
  return found ? <AllClear found={found} /> : null;
}

function open(handledToday: number) {
  fakeApi({ "GET watch": () => [read("a", LATEST), read("b", new Date(2026, 9, 19, 6, 0))], "GET handled/counts": () => ({ set_aside: handledToday, read: 0, today: handledToday }) });
  renderApp(<Card />);
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
});
afterEach(() => vi.useRealTimers());

test("the card has a decorative mark in each theme, a title in a heading, and the calm line", async () => {
  open(0);
  expect(await screen.findByRole("heading", { name: "Nothing needs you" })).toBeInTheDocument();
  expect(screen.getByText(/^A little more room to think\./)).toBeInTheDocument();
  for (const theme of ["day", "night"]) {
    const mark = document.querySelector(`[data-brand-mark="${theme}"]`);
    expect(mark).not.toBeNull();
    expect(mark).toHaveAttribute("alt", "");
  }
});

test("the coverage stays as a quiet line under the card, with Missed something?", async () => {
  open(0);
  expect(await screen.findByText(`Checked 2 connections, last at ${time(LATEST)}`)).toBeInTheDocument();
  expect(document.querySelector("[data-queue-empty] [data-coverage-line]")).not.toBeNull();
  expect(screen.getByRole("button", { name: "Missed something?" })).toBeInTheDocument();
});

test("the handled button shows only when something was handled today, and opens Handled for you", async () => {
  open(5);
  const link = await screen.findByRole("link", { name: "See what was handled today" });
  expect(link.getAttribute("href")).toMatch(/work\/handled$/);
});

test("with nothing handled today there is no button", async () => {
  open(0);
  await screen.findByRole("heading", { name: "Nothing needs you" });
  await waitFor(() => expect(screen.queryByRole("link", { name: "See what was handled today" })).toBeNull());
});
