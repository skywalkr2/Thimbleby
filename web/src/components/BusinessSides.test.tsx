import "@testing-library/jest-dom/vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { S } from "../lib/api";
import { project } from "../lib/records-fixtures";
import { fakeApi, renderApp } from "../test-utils";
import { BusinessSides } from "./BusinessSides";

// Removing a business after setup (design 7.8, 6.32): Remove is offered whenever there is a business, asks each time whether
// its projects and to-dos move to Personal or end with it, and is one change with Undo.

const SHOP = "Hale Upholstery";
const DAY = "Day job";
const sides: S["SideView"][] = [
  { project: "PRJ-shop", kind: "business", name: SHOP, removable: false, filed: 0 },
  { project: "PRJ-day", kind: "job", name: DAY, removable: false, filed: 0 },
];

function show() {
  return fakeApi({
    "GET setup/business": () => ({ business: true, name: SHOP, personal: "PRJ-personal", sides, chosen: "work" }),
    "GET projects": () => [project("PRJ-personal", "Personal"), project("PRJ-shop", SHOP), project("PRJ-day", DAY), project("PRJ-quotes", "Quotes", { parent: "PRJ-shop" })],
    "POST sides/PRJ-shop/remove": () => ({ changeset: "CS-7", drafts: [], acts: [], names: [] }),
    "POST sides/PRJ-day/remove": () => ({ changeset: "CS-8", drafts: [], acts: [], names: [] }),
    "POST changesets/CS-7/undo": () => ({ restored: [0], skipped: [] }),
  });
}

async function remove(user: ReturnType<typeof userEvent.setup>, name: string) {
  const row = await screen.findByRole("listitem", { name });
  await user.click(within(row).getByRole("button", { name: `Remove ${name}` }));
  return within(row).findByRole("group", { name: `What happens to the projects and to-dos in ${name}?` });
}

test("Remove is there even though something is filed under the business, and it asks what happens to its projects and to-dos", async () => {
  const user = userEvent.setup();
  show();
  renderApp(<BusinessSides />);
  const ask = await remove(user, SHOP);
  expect(within(ask).getByRole("button", { name: "Move them to Personal" })).toBeInTheDocument();
  expect(within(ask).getByRole("button", { name: "End them with it" })).toBeInTheDocument();
  expect(within(ask).getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  await user.click(within(ask).getByRole("button", { name: "Cancel" }));
  expect(screen.queryByRole("group", { name: /What happens to the projects/ })).toBeNull();
});

test("moving them to Personal is one request with Undo that takes the whole change back", async () => {
  const user = userEvent.setup();
  const calls = show();
  renderApp(<BusinessSides />);
  const ask = await remove(user, SHOP);
  await user.click(within(ask).getByRole("button", { name: "Move them to Personal" }));
  await waitFor(() => expect(calls.find((c) => c.route === "POST sides/PRJ-shop/remove")?.body).toEqual({ where: "personal" }));
  expect(await screen.findByText(`Removed ${SHOP}. Its projects and to-dos are in Personal now.`)).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Undo" }));
  await waitFor(() => expect(calls.some((c) => c.route === "POST changesets/CS-7/undo")).toBe(true));
});

test("ending them with it is the other choice, and it asks again for the next business", async () => {
  const user = userEvent.setup();
  const calls = show();
  renderApp(<BusinessSides />);
  await user.click(within(await remove(user, DAY)).getByRole("button", { name: "End them with it" }));
  await waitFor(() => expect(calls.find((c) => c.route === "POST sides/PRJ-day/remove")?.body).toEqual({ where: "end" }));
  expect(await screen.findByText(`Removed ${DAY}. Its projects and to-dos ended with it.`)).toBeInTheDocument();
  // Nothing is chosen for the next one: it asks.
  const again = await remove(user, SHOP);
  expect(calls.some((c) => c.route === "POST sides/PRJ-shop/remove")).toBe(false);
  expect(again).toBeInTheDocument();
});

test("a refusal is said in words and nothing is announced as removed", async () => {
  const user = userEvent.setup();
  fakeApi({
    "GET setup/business": () => ({ business: true, name: SHOP, personal: "PRJ-personal", sides, chosen: "work" }),
    "GET projects": () => [],
    "POST sides/PRJ-shop/remove": () => {
      throw new Error("never reached");
    },
  });
  renderApp(<BusinessSides />);
  const ask = await remove(user, SHOP);
  await user.click(within(ask).getByRole("button", { name: "Move them to Personal" }));
  expect(await screen.findByRole("alert")).toBeInTheDocument();
  expect(screen.queryByText(/Removed Hale/)).toBeNull();
});

test("ending them with a side says a note waits for the yes, and one Undo takes the note and the removal back", async () => {
  const user = userEvent.setup();
  const calls = fakeApi({
    "GET setup/business": () => ({ business: true, name: SHOP, personal: "PRJ-personal", sides, chosen: "work" }),
    "GET projects": () => [project("PRJ-personal", "Personal"), project("PRJ-shop", SHOP), project("PRJ-day", DAY)],
    "POST sides/PRJ-day/remove": () => ({ changeset: "CS-8", drafts: ["CS-50"], acts: ["XACT-1"], names: ["Casey Moor"] }),
    "POST changesets/CS-8/undo": () => ({ restored: [0], skipped: [] }),
    "POST changesets/CS-50/undo": () => ({ restored: [0], skipped: [] }),
  });
  renderApp(<BusinessSides />);
  await user.click(within(await remove(user, DAY)).getByRole("button", { name: "End them with it" }));
  expect(await screen.findByText(`Removed ${DAY}. Its projects and to-dos ended with it. A note to Casey Moor is waiting for your yes.`)).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Undo" }));
  await waitFor(() => expect(calls.filter((c) => c.route.endsWith("/undo")).map((c) => c.route)).toEqual(["POST changesets/CS-8/undo"]));
});
