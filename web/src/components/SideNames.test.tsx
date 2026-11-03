import "@testing-library/jest-dom/vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { setSideChoice } from "../lib/sides";
import { project } from "../lib/records-fixtures";
import { Sidebar } from "../shell/Sidebar";
import { fakeApi, renderApp, snapshotOf } from "../test-utils";
import { SideFilter } from "./SideFilter";

// Long names of sides (design 6.32, 7.1): the side filter is a list to pick from on a phone and cut chips with the full name on
// hover elsewhere, and the menu cuts a long name, gives the full one on hover, and marks each side so a narrow menu tells five
// sides apart. Names are made up here.
const PERSONAL = "PRJ-personal";
const SIDES = [
  { project: "PRJ-a", kind: "job", name: "Harborview Community Support Partnership Incorporated" },
  { project: "PRJ-b", kind: "business", name: "Harbor Light Candle Works and Garden Supply Cooperative" },
  { project: "PRJ-c", kind: "business", name: "Northfield Mobile Bicycle Repair and Neighborhood Delivery Service" },
  { project: "PRJ-d", kind: "business", name: "Lantern Row Studio" },
];

const routes = () => ({
  "GET setup/business": () => ({ business: true, name: SIDES[0].name, personal: PERSONAL, sides: SIDES, chosen: null }),
  "GET projects": () => [project(PERSONAL, "Personal"), ...SIDES.map((s) => project(s.project, s.name))],
  "GET views": () => [],
  "GET waiting": () => ({ changed: { total: 0, sides: [] }, followups: { total: 0, sides: [] }, open: { total: 0, sides: [] }, handled: { total: 0, sides: [] } }),
  "GET panels": () => [],
  "GET today/queue": () => [],
  "GET plugin-today": () => [],
  "GET changes": () => [],
  "GET followups": () => [],
  "GET stages/requests": () => [],
  "GET stages/records": () => [],
  "GET stages/ready": () => [],
});

beforeEach(() => vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener: () => undefined, removeEventListener: () => undefined })));
afterEach(() => {
  vi.unstubAllGlobals();
  document.documentElement.removeAttribute("data-narrow");
  window.localStorage.clear();
  setSideChoice("all");
});

test("on a phone the side filter is one list to pick from, with every side by its full name", async () => {
  document.documentElement.setAttribute("data-narrow", "");
  fakeApi(routes());
  renderApp(<SideFilter />);
  const list = await screen.findByRole("combobox", { name: "Show" });
  expect(within(await snapshotOf(list)).getAllByRole("option").map((o) => o.textContent)).toEqual(["All", "Personal", ...SIDES.map((s) => s.name)]);
  await userEvent.selectOptions(list, SIDES[2].name);
  expect(list).toHaveValue(SIDES[2].project);
  expect(screen.queryByRole("radio")).toBeNull();
});

test("elsewhere each side is a chip cut to a width, with its full name on hover and in its own words", async () => {
  fakeApi(routes());
  renderApp(<SideFilter />);
  const chip = await screen.findByRole("radio", { name: SIDES[0].name });
  const label = within(chip).getByText(SIDES[0].name);
  expect(label).toHaveAttribute("title", SIDES[0].name);
  expect(label.className).toMatch(/label/);
  expect(screen.queryByRole("combobox")).toBeNull();
});

test("the menu gives each side a mark of its own, never the same one twice, and the full name on hover", async () => {
  fakeApi(routes());
  renderApp(<Sidebar current="today" expanded onToggle={() => undefined} />);
  const links = await screen.findAllByRole("link", { name: /Harborview|Harbor Light|Northfield|Lantern|Personal/ });
  const marks = links.map((a) => a.querySelector('[class*="glyph"]')?.textContent ?? "");
  expect(marks).toHaveLength(5);
  expect(new Set(marks).size).toBe(5);
  // Two sides that begin alike are still told apart, and no icon is the same grid for all.
  expect(links.every((a) => a.querySelector("svg") === null)).toBe(true);
  const harbor = links.find((a) => a.textContent?.includes("Harborview"))!;
  expect(harbor.querySelector('[class*="label"]')).toHaveAttribute("title", SIDES[0].name);
});

test("on the icon rail the marks tell the sides apart too", async () => {
  fakeApi(routes());
  renderApp(<Sidebar current="today" expanded={false} onToggle={() => undefined} />);
  const links = await screen.findAllByRole("link", { name: /Harborview|Harbor Light|Northfield|Lantern|Personal/ });
  expect(new Set(links.map((a) => a.querySelector('[class*="glyph"]')?.textContent)).size).toBe(5);
});
