import "@testing-library/jest-dom/vitest";
import { cleanup, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { setSideChoice } from "../lib/sides";
import { fakeApi, renderApp } from "../test-utils";
import { SideFilter } from "./SideFilter";

// On a phone, and under 1100px of window, there is no strip of choices: one button in the page header names the pick and opens a
// sheet with the choices as a list (VP08, VP12). A side with a long name wraps in the sheet and is cut at the button.

const LONG = "Harborview Community Support Partnership Incorporated";
const sides = [
  { project: "PRJ-a", kind: "business", name: "Northwind Clinic" },
  { project: "PRJ-b", kind: "job", name: LONG },
];

function show(narrow: { phone?: boolean; tight?: boolean }) {
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: /max-width:\s*1100px/.test(query) && !!narrow.tight, media: query, addEventListener: () => undefined, removeEventListener: () => undefined }));
  if (narrow.phone) document.documentElement.setAttribute("data-narrow", "");
  fakeApi({ "GET setup/business": () => ({ business: true, name: "Northwind Clinic", personal: "PRJ-personal", sides, chosen: "work" }), "GET views": () => [] });
  renderApp(<SideFilter />);
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  document.documentElement.removeAttribute("data-narrow");
  setSideChoice("all");
});

test("wide, the choices are a strip", async () => {
  show({});
  expect(await screen.findByRole("radiogroup", { name: "Show" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /^Side: / })).toBeNull();
});

test.each([
  ["on a phone", { phone: true }],
  ["under 1100px", { tight: true }],
])("%s there is no strip: one button names the pick and opens a sheet of choices", async (_where, narrow) => {
  const user = userEvent.setup();
  show(narrow);
  const button = await screen.findByRole("button", { name: "Side: All" });
  expect(screen.queryByRole("radiogroup", { name: "Show" })).toBeNull();
  await user.click(button);
  const sheet = await screen.findByRole("dialog", { name: "Show one side" });
  const choices = within(sheet).getAllByRole("button").filter((b) => b.hasAttribute("data-side-option"));
  expect(choices.map((b) => b.textContent)).toEqual(["All", "Personal", "Northwind Clinic", LONG]);
  expect(choices[0]).toHaveAttribute("aria-current", "true");
  // Every choice is a hit target of at least the tap size on a touch screen, and the sheet is the only place the long name is whole.
  expect(within(sheet).getByText(LONG)).toBeVisible();
});

test("picking a side in the sheet sets the filter, closes the sheet and names the pick on the button", async () => {
  const user = userEvent.setup();
  show({ phone: true });
  await user.click(await screen.findByRole("button", { name: "Side: All" }));
  await user.click(within(await screen.findByRole("dialog", { name: "Show one side" })).getByRole("button", { name: LONG }));
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(await screen.findByRole("button", { name: `Side: ${LONG}` })).toBeInTheDocument();
  expect(window.localStorage.getItem("cockpit:side-filter")).toBe("PRJ-b");
});

test("Escape closes the sheet and leaves the pick as it was", async () => {
  const user = userEvent.setup();
  show({ phone: true });
  await user.click(await screen.findByRole("button", { name: "Side: All" }));
  await screen.findByRole("dialog", { name: "Show one side" });
  await user.keyboard("{Escape}");
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(screen.getByRole("button", { name: "Side: All" })).toBeInTheDocument();
});
