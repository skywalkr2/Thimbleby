import "@testing-library/jest-dom/vitest";
import { screen } from "@testing-library/react";
import { beforeEach } from "vitest";
import type { S } from "../lib/api";
import { setSideChoice } from "../lib/sides";
import { waitingUnder } from "../lib/waiting";
import { fakeApi, renderApp, type Routes } from "../test-utils";
import { SideFilter } from "./SideFilter";

// Each side's tab on a screen with something waiting for the person says how many wait in it (design 7.1, 7.8), in words for
// a screen reader; a side with nothing waiting has no number. The counts are the server's: what is on no side is already in each.

const PERSONAL = "PRJ-personal";
const SHOP = "PRJ-shop";
const DAY = "PRJ-day";
const business: Routes = {
  "GET setup/business": () => ({
    business: true,
    name: "Example Works",
    personal: PERSONAL,
    sides: [
      { project: SHOP, kind: "business", name: "Example Works" },
      { project: DAY, kind: "job", name: "Example Studio" },
    ],
  }),
};
const count = (total: number, sides: Record<string, number>): S["WaitingCount"] => ({ total, sides: Object.entries(sides).map(([side, n]) => ({ side, count: n })) });
const waiting = (followups: S["WaitingCount"]): S["WaitingCounts"] => ({ changed: count(0, {}), followups, open: count(0, {}), handled: count(0, {}) });

beforeEach(() => setSideChoice("all"));

test("each tab says how many wait in it, and a side with nothing waiting has no number", async () => {
  fakeApi({ ...business, "GET waiting": () => waiting(count(5, { [PERSONAL]: 2, [SHOP]: 4, [DAY]: 0 })) });
  renderApp(<SideFilter waiting="followups" />);
  // The words are the tab's name; the figure beside it is drawn only.
  expect(await screen.findByRole("radio", { name: "All, 5 waiting" })).toBeInTheDocument();
  expect(screen.getByRole("radio", { name: "Personal, 2 waiting" })).toBeInTheDocument();
  expect(screen.getByRole("radio", { name: "Example Works, 4 waiting" })).toBeInTheDocument();
  expect(screen.getByRole("radio", { name: "Example Studio" })).toBeInTheDocument();
});

test("a screen that passes nothing waiting shows the tabs as they were", async () => {
  fakeApi({ ...business, "GET waiting": () => waiting(count(5, { [PERSONAL]: 2 })) });
  renderApp(<SideFilter />);
  expect(await screen.findByRole("radio", { name: "Personal" })).toBeInTheDocument();
  expect(screen.getByRole("radio", { name: "All" })).toBeInTheDocument();
});

test("a count under a choice is all of them under All, else that side's (none for a side the answer lacks)", () => {
  const c = count(5, { [PERSONAL]: 2, [SHOP]: 4 });
  expect(waitingUnder(c, "all")).toBe(5);
  expect(waitingUnder(c, PERSONAL)).toBe(2);
  expect(waitingUnder(c, SHOP)).toBe(4);
  expect(waitingUnder(c, DAY)).toBe(0);
  expect(waitingUnder(undefined, "all")).toBe(0);
});
