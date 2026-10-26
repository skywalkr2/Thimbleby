import "@testing-library/jest-dom/vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { S } from "../lib/api";
import { fakeApi, renderApp, type Routes } from "../test-utils";
import { SetAside } from "./SetAside";

// Made-up addresses are built from parts, so none is written out whole.
const AT = "@";
const addr = (name: string, domain = "lists.example.com") => `${name}${AT}${domain}`;

const item = (id: string, extra: Partial<S["SetAsideView"]> = {}): S["SetAsideView"] => ({
  id,
  version: 3,
  section: "sales",
  title: `Offer ${id}`,
  sender: `Sender <${addr(id)}>`,
  source: "Inbox",
  received: "2026-10-11T08:30:00+00:00",
  reason: "it was sent to many people, as a mailing list or bulk mail",
  link: null,
  address: addr(id),
  domain: "lists.example.com",
  ...extra,
});

const FOLDER: S["SetAsideFolder"] = {
  items: [item("a"), item("b"), item("c", { section: "personal", reason: "you set it aside as personal mail" })],
  deleted: 0,
};

const SAVED: S["SettingsSaved"] = {
  changes: [{ key: "watch.triage", before: [], after: [{ name: "x" }], was_default: true, is_default: false }],
  fingerprint: "fp-2",
  needs_restart: false,
};

function open(extra: Routes = {}, folder: S["SetAsideFolder"] = FOLDER) {
  const calls = fakeApi({
    "GET set-aside": () => folder,
    "GET settings": () => ({ fingerprint: "fp-1", items: [] }),
    ...extra,
  });
  renderApp(<SetAside />);
  return calls;
}

const body = (calls: ReturnType<typeof fakeApi>, route: string) => calls.find((c) => c.route === route)?.body;

test("three sections, one row per message with sender, date and why it was set aside", async () => {
  open();
  const sales = await screen.findByRole("region", { name: /Sales and promotions/ });
  const personal = screen.getByRole("region", { name: /Personal/ });
  expect(within(sales).getAllByRole("listitem")).toHaveLength(2);
  expect(within(personal).getAllByRole("listitem")).toHaveLength(1);
  const row = within(sales).getAllByRole("listitem")[0];
  expect(row).toHaveTextContent("Offer a");
  expect(row).toHaveTextContent(`Sender <${addr("a")}>`);
  expect(row).toHaveTextContent("Inbox");
  expect(row).toHaveTextContent("Set aside because: it was sent to many people, as a mailing list or bulk mail");
  expect(within(personal).getByText(/you set it aside as personal mail/)).toBeInTheDocument();
});

test("an empty folder says so, and a deleted count is told in words", async () => {
  open({}, { items: [], deleted: 14 });
  expect(await screen.findByText("Nothing is set aside.")).toBeInTheDocument();
  expect(screen.getByText("14 set-aside messages were deleted from here after you confirmed them.")).toBeInTheDocument();
});

test("Treat as work hands the message in with the version that was read, and offers Always for the sender and the domain", async () => {
  const user = userEvent.setup();
  const calls = open({
    "POST set-aside/a/work": () => ({ id: "a", version: 5, section: "sales", address: addr("a"), domain: "lists.example.com" }),
    "POST watch/sorting": () => SAVED,
  });
  const sales = await screen.findByRole("region", { name: /Sales and promotions/ });
  await user.click(within(sales).getByRole("button", { name: "Treat as work: Offer a" }));
  await waitFor(() => expect(body(calls, "POST set-aside/a/work")).toEqual({ read_version: 3 }));
  expect(await screen.findByText("Handed in Offer a. Helper is on it.")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Apply to this email domain" })).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Apply to this sender" }));
  await waitFor(() =>
    expect(body(calls, "POST watch/sorting")).toEqual({
      fingerprint: "fp-1",
      choice: "never",
      senders: [addr("a")],
      domains: [],
    }),
  );
  expect(await screen.findByText(`From now on, mail from ${addr("a")} stays with Helper.`)).toBeInTheDocument();
});

test("Treat as work offers only Apply to this sender when the server sends no domain", async () => {
  const user = userEvent.setup();
  open({
    "POST set-aside/a/work": () => ({ id: "a", version: 5, section: "sales", address: addr("a"), domain: null }),
  });
  await user.click(await screen.findByRole("button", { name: "Treat as work: Offer a" }));
  expect(await screen.findByRole("button", { name: "Apply to this sender" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Apply to this email domain" })).not.toBeInTheDocument();
});

test("Apply to this email domain writes a keep rule for the domain", async () => {
  const user = userEvent.setup();
  const calls = open({
    "POST set-aside/a/work": () => ({ id: "a", version: 5, section: "sales", address: addr("a"), domain: "lists.example.com" }),
    "POST watch/sorting": () => SAVED,
  });
  await user.click(await screen.findByRole("button", { name: "Treat as work: Offer a" }));
  await user.click(await screen.findByRole("button", { name: "Apply to this email domain" }));
  await waitFor(() => expect(body(calls, "POST watch/sorting")).toMatchObject({ choice: "never", senders: [], domains: ["lists.example.com"] }));
});

test("Undo of Treat as work sets the message aside again in its section", async () => {
  const user = userEvent.setup();
  const calls = open({
    "POST set-aside/c/work": () => ({ id: "c", version: 5, section: "personal", address: addr("c"), domain: "lists.example.com" }),
    "POST mail/c/set-aside": () => ({ id: "c", version: 6, section: "personal", address: addr("c"), domain: "lists.example.com" }),
  });
  const personal = await screen.findByRole("region", { name: /Personal/ });
  await user.click(within(personal).getByRole("button", { name: "Treat as work: Offer c" }));
  await user.click(await screen.findByRole("button", { name: "Undo" }));
  await waitFor(() => expect(body(calls, "POST mail/c/set-aside")).toEqual({ section: "personal" }));
});

test("a row offers Treat as work, and in its menu Treat as personal, Always set aside mail like this and Open the message, with no Keep set aside anywhere", async () => {
  const user = userEvent.setup();
  open({}, { items: [item("a", { link: "message-a" })], deleted: 0 });
  const sales = await screen.findByRole("region", { name: /Sales and promotions/ });
  expect(within(sales).getByRole("button", { name: "Treat as work: Offer a" })).toBeInTheDocument();
  await user.click(within(sales).getByRole("button", { name: "More actions for Offer a" }));
  expect(await screen.findByRole("menuitem", { name: "Treat as personal" })).toBeInTheDocument();
  expect(screen.getByRole("menuitem", { name: "Always set aside mail like this" })).toBeInTheDocument();
  expect(screen.getByRole("menuitem", { name: "Open the message" })).toBeInTheDocument();
  expect(screen.queryByText(/Keep (it|them all) set aside/)).not.toBeInTheDocument();
});

test("Open the message is offered only for a message that has a link", async () => {
  const user = userEvent.setup();
  open({}, { items: [item("a")], deleted: 0 });
  const sales = await screen.findByRole("region", { name: /Sales and promotions/ });
  await user.click(within(sales).getByRole("button", { name: "More actions for Offer a" }));
  expect(await screen.findByRole("menuitem", { name: "Treat as personal" })).toBeInTheDocument();
  expect(screen.queryByRole("menuitem", { name: "Open the message" })).not.toBeInTheDocument();
});

test("Treat as personal hands the message in for the Personal project, and Undo sets it aside again", async () => {
  const user = userEvent.setup();
  const calls = open({
    "POST set-aside/a/personal": () => ({ id: "a", version: 4, section: "sales", address: addr("a"), domain: null }),
    "POST mail/a/set-aside": () => ({ id: "a", version: 5, section: "sales", address: addr("a"), domain: null }),
  });
  const sales = await screen.findByRole("region", { name: /Sales and promotions/ });
  await user.click(within(sales).getByRole("button", { name: "More actions for Offer a" }));
  await user.click(await screen.findByRole("menuitem", { name: "Treat as personal" }));
  await waitFor(() => expect(body(calls, "POST set-aside/a/personal")).toEqual({ read_version: 3 }));
  expect(await screen.findByText(/Handed in Offer a for your Personal project/)).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Undo" }));
  await waitFor(() => expect(body(calls, "POST mail/a/set-aside")).toEqual({ section: "sales" }));
});

test("Always set aside mail like this saves a rule for the sender, kept as a correction, and reads it back", async () => {
  const user = userEvent.setup();
  const calls = open({ "POST watch/sorting": () => SAVED });
  const sales = await screen.findByRole("region", { name: /Sales and promotions/ });
  await user.click(within(sales).getByRole("button", { name: "More actions for Offer a" }));
  await user.click(await screen.findByRole("menuitem", { name: "Always set aside mail like this" }));
  await waitFor(() =>
    expect(body(calls, "POST watch/sorting")).toEqual({
      fingerprint: "fp-1",
      choice: "sales",
      senders: [addr("a")],
      domains: [],
      mail: "a",
    }),
  );
  expect(await screen.findByText(`From now on, mail from ${addr("a")} is set aside as sales mail.`)).toBeInTheDocument();
});

test("the automated notices section is listed beside the others", async () => {
  open({}, { items: [item("n", { section: "notices", reason: "it is an automated notice" })], deleted: 0 });
  const notices = await screen.findByRole("region", { name: /Automated notices/ });
  expect(within(notices).getAllByRole("listitem")).toHaveLength(1);
});
