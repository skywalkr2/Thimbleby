import "@testing-library/jest-dom/vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { S } from "../lib/api";
import { org, person, project } from "../lib/records-fixtures";
import { Refuse, fakeApi, renderApp, type Routes } from "../test-utils";
import { People } from "./People";

// A person's details and sides can be added and changed after setup (design 6.32, 7.14): the sides are ticked from the list of
// sides, who they are to you is asked on Personal and their part on a side of work, email and phone are boxes of their own, and
// a name already on file is said while it is typed.

const sided = {
  "GET setup/business": () => ({
    business: true,
    name: "Shop",
    personal: "PRJ-personal",
    sides: [{ project: "PRJ-shop", name: "Shop", kind: "business" }],
    chosen: "both",
  }),
  "GET projects": () => [project("PRJ-personal", "Personal"), project("PRJ-shop", "Shop")],
};

function api(people: S["PersonView"][], extra: Routes = {}) {
  return fakeApi({
    "GET people": () => people,
    "GET organizations": () => [org("ORG-1", "Org one", 1)],
    "GET settings": () => ({ fingerprint: "fp", items: [{ key: "workspace.contact_kinds", value: ["email", "phone"] }] }),
    ...extra,
  });
}

async function openAdd(user: ReturnType<typeof userEvent.setup>) {
  await user.click((await screen.findAllByRole("button", { name: "Add a person" }))[0]);
  return screen.findByRole("dialog", { name: "Add a person" });
}

test("a person is added with their sides ticked from the list, an email and a phone", async () => {
  const user = userEvent.setup();
  const calls = api([], { ...sided, "POST people": () => ({ id: "P-9" }) });
  renderApp(<People />);
  const dialog = await openAdd(user);
  await user.type(within(dialog).getByLabelText("Full name"), "Fay Person");
  const group = within(dialog).getByRole("group", { name: "Where they belong" });
  // The side the screen is showing is ticked to begin with; here that is Personal.
  expect(within(group).getByRole("checkbox", { name: "Personal" })).toBeChecked();
  expect(within(group).getByRole("checkbox", { name: "Shop" })).not.toBeChecked();
  // On Personal they are asked who they are to you; their part and organization are for a side of work.
  expect(within(dialog).getByLabelText(/^Who they are to you/)).toBeInTheDocument();
  expect(within(dialog).queryByLabelText(/^Role/)).toBeNull();
  await user.click(within(group).getByRole("checkbox", { name: "Shop" }));
  expect(within(dialog).getByLabelText(/^Role/)).toBeInTheDocument();
  await user.type(within(dialog).getByLabelText(/^Who they are to you/), "my cousin");
  await user.type(within(dialog).getByLabelText("Email"), "fay@example.com");
  await user.type(within(dialog).getByLabelText("Phone"), "555 0100");
  await user.click(within(dialog).getByRole("button", { name: "Add a person" }));
  await waitFor(() => expect(calls.some((c) => c.route === "POST people")).toBe(true));
  expect(calls.find((c) => c.route === "POST people")!.body).toMatchObject({
    full_name: "Fay Person",
    relation: "my cousin",
    sides: ["PRJ-personal", "PRJ-shop"],
    how_to_reach: { email: "fay@example.com", phone: "555 0100" },
  });
});

test("with sides to tell apart, a person can't be added on none of them", async () => {
  const user = userEvent.setup();
  api([], sided);
  renderApp(<People />);
  const dialog = await openAdd(user);
  await user.type(within(dialog).getByLabelText("Full name"), "Gil Person");
  await user.click(within(dialog).getByRole("checkbox", { name: "Personal" }));
  const add = within(dialog).getByRole("button", { name: "Add a person" });
  expect(add).toBeDisabled();
  expect(within(dialog).getByText("Choose where they belong first.")).toBeInTheDocument();
});

test("a person's email, phone and sides are changed from their own form later", async () => {
  const user = userEvent.setup();
  const calls = api([person("P-1", "Ana Person", { sides: ["PRJ-personal"], side: "personal", relation: "my sister", how_to_reach: { email: "ana@example.com" } })], {
    ...sided,
    "POST people/P-1": () => ({ ok: "P-1" }),
  });
  renderApp(<People />);
  const tr = (await screen.findByRole("link", { name: "Ana Person" })).closest("tr")!;
  await user.click(within(tr).getByRole("button", { name: /More actions for/ }));
  await user.click(await screen.findByRole("menuitem", { name: "Edit" }));
  const dialog = await screen.findByRole("dialog", { name: "Edit person" });
  const email = within(dialog).getByLabelText("Email");
  await waitFor(() => expect(email).toHaveValue("ana@example.com"));
  await user.clear(email);
  await user.type(email, "ana.new@example.com");
  await user.type(within(dialog).getByLabelText("Phone"), "555 0111");
  await user.click(within(dialog).getByRole("checkbox", { name: "Shop" }));
  await user.click(within(dialog).getByRole("button", { name: "Save" }));
  await waitFor(() => expect(calls.some((c) => c.route === "POST people/P-1")).toBe(true));
  expect(calls.find((c) => c.route === "POST people/P-1")!.body).toMatchObject({
    sides: ["PRJ-personal", "PRJ-shop"],
    how_to_reach: { email: "ana.new@example.com", phone: "555 0111" },
  });
});

test("a name that is already on file is said beside the field while it is typed", async () => {
  const user = userEvent.setup();
  const calls = api([person("P-1", "Ana Person")], sided);
  renderApp(<People />);
  const dialog = await openAdd(user);
  const name = within(dialog).getByLabelText("Full name");
  await user.type(name, "ana person");
  expect(within(dialog).getByText("Ana Person is already on your list.")).toBeInTheDocument();
  expect(name).toBeInvalid();
  expect(within(dialog).getByRole("button", { name: "Add a person" })).toBeDisabled();
  await user.clear(name);
  await user.type(name, "Ana Other");
  expect(within(dialog).queryByText(/is already on your list/)).toBeNull();
  expect(within(dialog).getByRole("button", { name: "Add a person" })).toBeEnabled();
  expect(calls.some((c) => c.route === "POST people")).toBe(false);
});

test("a refusal from the server is said in the form, beside what was typed", async () => {
  const user = userEvent.setup();
  api([], {
    ...sided,
    "POST people": () => new Refuse(409, "That address is already Ana Person's."),
  });
  renderApp(<People />);
  const dialog = await openAdd(user);
  await user.type(within(dialog).getByLabelText("Full name"), "Hal Person");
  await user.type(within(dialog).getByLabelText("Email"), "ana@example.com");
  await user.click(within(dialog).getByRole("button", { name: "Add a person" }));
  expect(await within(dialog).findByRole("alert")).toHaveTextContent("That address is already Ana Person's.");
  // What was typed is still there.
  expect(within(dialog).getByLabelText("Email")).toHaveValue("ana@example.com");
});

test("a person with nothing besides their own life is asked who they are to you, and no side", async () => {
  const user = userEvent.setup();
  api([], {
    "GET setup/business": () => ({ business: false, name: "", personal: "PRJ-personal", sides: [], chosen: "personal" }),
    "GET projects": () => [project("PRJ-personal", "Personal")],
  });
  renderApp(<People />);
  const dialog = await openAdd(user);
  expect(within(dialog).queryByRole("group", { name: "Where they belong" })).toBeNull();
  expect(within(dialog).getByLabelText(/^Who they are to you/)).toBeInTheDocument();
  expect(within(dialog).getByLabelText("Email")).toBeInTheDocument();
});
