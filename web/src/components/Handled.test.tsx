import "@testing-library/jest-dom/vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { S } from "../lib/api";
import { fakeApi, renderApp, type Routes } from "../test-utils";
import { Handled } from "./Handled";

// Made-up addresses are built from parts, so none is written out whole.
const AT = "@";
const addr = (name: string, domain = "lists.example.com") => `${name}${AT}${domain}`;

const row = (id: string, extra: Partial<S["HandledRow"]> = {}): S["HandledRow"] => ({
  id,
  version: 3,
  tab: "set_aside",
  kind: "sales",
  title: `Offer ${id}`,
  sender: `Sender <${addr(id)}>`,
  source: "Inbox",
  received: "2026-10-11T08:30:00+00:00",
  reason: "it was sent to many people, as a mailing list or bulk mail",
  link: null,
  saved: null,
  address: addr(id),
  domain: "lists.example.com",
  section: "sales",
  request: null,
  ...extra,
});

const read = (id: string, extra: Partial<S["HandledRow"]> = {}) =>
  row(id, { tab: "read", kind: "other", reason: null, saved: `SRC-${id}`, request: `REQ-${id}`, section: "notices", ...extra });

const group = (key: string, items: S["HandledRow"][], label: string | null = null): S["HandledGroup"] => ({ key, label, count: items.length, items });

const ASIDE: S["HandledView"] = {
  tab: "set_aside",
  group: "kind",
  query: "",
  counts: { set_aside: 3, read: 2 },
  groups: [group("sales", [row("a"), row("b")]), group("notices", [row("n", { kind: "notices", section: "notices", reason: "it is an automated notice" })])],
};

const READ: S["HandledView"] = {
  tab: "read",
  group: "kind",
  query: "",
  counts: { set_aside: 3, read: 2 },
  groups: [group("bills", [read("p", { kind: "bills", title: "Statement p" })]), group("other", [read("q", { title: "Lunch q" })])],
};

const SAVED: S["SettingsSaved"] = {
  changes: [{ key: "watch.triage", before: [], after: [{ name: "x" }], was_default: true, is_default: false }],
  fingerprint: "fp-2",
  needs_restart: false,
};

const done = (id: string, extra: Partial<S["HandledDone"]> = {}): S["HandledDone"] => ({
  id,
  version: 5,
  section: "sales",
  request: `REQ-new-${id}`,
  address: addr(id),
  domain: "lists.example.com",
  ...extra,
});

function open(extra: Routes = {}) {
  const calls = fakeApi({
    "GET handled?tab=set_aside&q=": () => ASIDE,
    "GET handled?tab=read&q=": () => READ,
    "GET settings": () => ({ fingerprint: "fp-1", items: [] }),
    ...extra,
  });
  renderApp(<Handled />);
  return calls;
}

const body = (calls: ReturnType<typeof fakeApi>, route: string) => calls.find((c) => c.route === route)?.body;
const open_ = async (user: ReturnType<typeof userEvent.setup>, name: RegExp) => {
  const header = await screen.findByRole("button", { name });
  if (header.getAttribute("aria-expanded") === "false") await user.click(header);
  return header.closest("section") as HTMLElement;
};

test("two lists with their counts, each saying in one line what it holds, and the cursor starts in the search box", async () => {
  const user = userEvent.setup();
  const calls = open();
  expect(await screen.findByRole("heading", { level: 1, name: "Handled for you" })).toBeInTheDocument();
  expect(await screen.findByRole("button", { name: "Set aside · 3" })).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByRole("button", { name: "Read, nothing to do · 2" })).toHaveAttribute("aria-pressed", "false");
  expect(screen.getByText("Mail sorted away before Helper read it: newsletters, sales, codes and alerts.")).toBeInTheDocument();
  expect(screen.getByRole("searchbox", { name: "Search by sender, subject or kind" })).toHaveFocus();
  await user.click(screen.getByRole("button", { name: "Read, nothing to do · 2" }));
  expect(await screen.findByText("Mail Helper read and found nothing for you in.")).toBeInTheDocument();
  expect(calls.some((c) => c.route === "GET handled?tab=read&q=")).toBe(true);
  expect(screen.queryByText(/Mail sorted away before/)).not.toBeInTheDocument();
});

test("rows are grouped by kind with a count, collapsed, and a group opens to its mails with sender, date and why", async () => {
  const user = userEvent.setup();
  open();
  const sales = (await screen.findByRole("button", { name: "Sales and promotions · 2" })).closest("section") as HTMLElement;
  expect(screen.getByRole("button", { name: "Automated notices · 1" })).toHaveAttribute("aria-expanded", "false");
  expect(screen.queryByText("Offer a")).not.toBeInTheDocument();
  await user.click(within(sales).getByRole("button", { name: "Sales and promotions · 2" }));
  const rows = within(sales).getAllByRole("listitem");
  expect(rows).toHaveLength(2);
  expect(rows[0]).toHaveTextContent("Offer a");
  expect(rows[0]).toHaveTextContent(`Sender <${addr("a")}>`);
  expect(rows[0]).toHaveTextContent("Inbox");
  expect(rows[0]).toHaveTextContent("Set aside because: it was sent to many people, as a mailing list or bulk mail");
  expect(screen.queryByText("Offer n")).not.toBeInTheDocument();
});

test("a row on the read list says it was read with nothing to do", async () => {
  const user = userEvent.setup();
  open();
  await user.click(await screen.findByRole("button", { name: "Read, nothing to do · 2" }));
  const bills = await open_(user, /^Bills and statements · 1$/);
  expect(within(bills).getByRole("listitem")).toHaveTextContent("Read: nothing for you to do.");
  expect(screen.getByRole("button", { name: "Other mail · 1" })).toBeInTheDocument();
});

test("the other grouping, by sender, is one click away and groups by the sender the server names", async () => {
  const user = userEvent.setup();
  const bySender: S["HandledView"] = {
    ...ASIDE,
    group: "sender",
    groups: [group(addr("a"), [row("a"), row("b")], "Sender"), group("", [row("z", { sender: null, address: "" })], null)],
  };
  const calls = open({ "GET handled?tab=set_aside&q=&group=sender": () => bySender });
  await screen.findByRole("button", { name: "Sales and promotions · 2" });
  expect(screen.getByRole("button", { name: "Kind" })).toHaveAttribute("aria-pressed", "true");
  await user.click(screen.getByRole("button", { name: "Sender" }));
  expect(await screen.findByRole("button", { name: "Sender · 2" })).toHaveAttribute("aria-expanded", "false");
  expect(screen.getByRole("button", { name: "No known sender · 1" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Sender" })).toHaveAttribute("aria-pressed", "true");
  expect(calls.some((c) => c.route === "GET handled?tab=set_aside&q=&group=sender")).toBe(true);
});

test("a search asks for the words, opens the groups it found, and says when nothing matches", async () => {
  const user = userEvent.setup();
  const found: S["HandledView"] = { ...ASIDE, query: "offer b", groups: [group("sales", [row("b")])] };
  const none: S["HandledView"] = { ...ASIDE, query: "zzz", groups: [] };
  const calls = open({ "GET handled?tab=set_aside&q=offer+b": () => found, "GET handled?tab=set_aside&q=zzz": () => none });
  await screen.findByRole("button", { name: "Sales and promotions · 2" });
  await user.type(screen.getByRole("searchbox", { name: "Search by sender, subject or kind" }), "offer b");
  expect(await screen.findByRole("button", { name: "Sales and promotions · 1" })).toHaveAttribute("aria-expanded", "true");
  expect(screen.getByText("Offer b")).toBeInTheDocument();
  expect(screen.queryByText("Offer a")).not.toBeInTheDocument();
  expect(calls.filter((c) => c.route === "GET handled?tab=set_aside&q=offer+b").length).toBeGreaterThan(0);
  await user.clear(screen.getByRole("searchbox", { name: "Search by sender, subject or kind" }));
  await user.type(screen.getByRole("searchbox", { name: "Search by sender, subject or kind" }), "zzz");
  expect(await screen.findByText("No mail matches your search.")).toBeInTheDocument();
});

test("each list says so when it is empty", async () => {
  const user = userEvent.setup();
  open({
    "GET handled?tab=set_aside&q=": () => ({ ...ASIDE, groups: [], counts: { set_aside: 0, read: 0 } }),
    "GET handled?tab=read&q=": () => ({ ...READ, groups: [], counts: { set_aside: 0, read: 0 } }),
  });
  expect(await screen.findByText("Nothing has been set aside.")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Read, nothing to do · 0" }));
  expect(await screen.findByText("Nothing has been read with nothing to do.")).toBeInTheDocument();
});

test("a row offers Treat as work, and in its menu Treat as personal, Always set aside mail like this and Open the message, with no Keep set aside anywhere", async () => {
  const user = userEvent.setup();
  open({
    "GET handled?tab=set_aside&q=": () => ({ ...ASIDE, groups: [group("sales", [row("a", { link: "message-a" })])] }),
  });
  const sales = await open_(user, /^Sales and promotions · 1$/);
  expect(within(sales).getByRole("button", { name: "Treat as work: Offer a" })).toBeInTheDocument();
  await user.click(within(sales).getByRole("button", { name: "More actions for Offer a" }));
  expect(await screen.findByRole("menuitem", { name: "Treat as personal" })).toBeInTheDocument();
  expect(screen.getByRole("menuitem", { name: "Always set aside mail like this" })).toBeInTheDocument();
  expect(screen.getByRole("menuitem", { name: "Open the message" })).toBeInTheDocument();
  expect(screen.queryByText(/Keep (it|them all)? ?set aside/i)).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /keep/i })).not.toBeInTheDocument();
});

test("the same four choices are on a row of the read list", async () => {
  const user = userEvent.setup();
  open();
  await user.click(await screen.findByRole("button", { name: "Read, nothing to do · 2" }));
  const other = await open_(user, /^Other mail · 1$/);
  expect(within(other).getByRole("button", { name: "Treat as work: Lunch q" })).toBeInTheDocument();
  await user.click(within(other).getByRole("button", { name: "More actions for Lunch q" }));
  expect(await screen.findByRole("menuitem", { name: "Treat as personal" })).toBeInTheDocument();
  expect(screen.getByRole("menuitem", { name: "Always set aside mail like this" })).toBeInTheDocument();
  expect(screen.getByRole("menuitem", { name: "Open the message" })).toBeInTheDocument();
});

test("Open the message goes to the saved page when the message has no link in the mail service", async () => {
  const user = userEvent.setup();
  open({ "GET handled?tab=set_aside&q=": () => ({ ...ASIDE, groups: [group("sales", [row("a", { saved: "SRC-a" })])] }) });
  const sales = await open_(user, /^Sales and promotions · 1$/);
  await user.click(within(sales).getByRole("button", { name: "More actions for Offer a" }));
  await user.click(await screen.findByRole("menuitem", { name: "Open the message" }));
  expect(window.location.hash).toBe("#records/source/SRC-a");
});

test("Open the message is not offered for a message with neither a link nor a saved page", async () => {
  const user = userEvent.setup();
  open();
  const sales = await open_(user, /^Sales and promotions · 2$/);
  await user.click(within(sales).getAllByRole("button", { name: /^More actions for/ })[0]);
  expect(await screen.findByRole("menuitem", { name: "Treat as personal" })).toBeInTheDocument();
  expect(screen.queryByRole("menuitem", { name: "Open the message" })).not.toBeInTheDocument();
});

test("Treat as work on a set-aside mail hands it in with the version read, offers Always for the sender, and Undo sets it aside again", async () => {
  const user = userEvent.setup();
  const calls = open({
    "POST handled/a/work": () => done("a"),
    "POST mail/a/set-aside": () => ({ id: "a", version: 6, section: "sales", address: addr("a"), domain: null }),
    "POST watch/sorting": () => SAVED,
  });
  const sales = await open_(user, /^Sales and promotions · 2$/);
  await user.click(within(sales).getByRole("button", { name: "Treat as work: Offer a" }));
  await waitFor(() => expect(body(calls, "POST handled/a/work")).toEqual({ read_version: 3 }));
  expect(await screen.findByText("Handed in Offer a. Helper is on it.")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Apply to this email domain" })).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Undo" }));
  await waitFor(() => expect(body(calls, "POST mail/a/set-aside")).toEqual({ section: "sales" }));
});

test("Treat as work on a mail read with nothing to do offers no sorting rule, and Undo takes the new read back", async () => {
  const user = userEvent.setup();
  const calls = open({
    "POST handled/q/work": () => done("q", { section: "notices" }),
    "POST handled/q/undo": () => done("q", { section: "notices", request: null, version: 6 }),
  });
  await user.click(await screen.findByRole("button", { name: "Read, nothing to do · 2" }));
  const other = await open_(user, /^Other mail · 1$/);
  await user.click(within(other).getByRole("button", { name: "Treat as work: Lunch q" }));
  await waitFor(() => expect(body(calls, "POST handled/q/work")).toEqual({ read_version: 3 }));
  expect(await screen.findByText("Handed in Lunch q. Helper is on it.")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /^Apply to this/ })).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Undo" }));
  await waitFor(() => expect(body(calls, "POST handled/q/undo")).toEqual({ read_version: 5 }));
  expect(calls.some((c) => c.route === "POST mail/q/set-aside")).toBe(false);
});

test("Treat as personal hands the message in for the Personal project, and Undo sets it aside again", async () => {
  const user = userEvent.setup();
  const calls = open({
    "POST handled/a/personal": () => done("a", { domain: null }),
    "POST mail/a/set-aside": () => ({ id: "a", version: 6, section: "sales", address: addr("a"), domain: null }),
  });
  const sales = await open_(user, /^Sales and promotions · 2$/);
  await user.click(within(sales).getByRole("button", { name: "More actions for Offer a" }));
  await user.click(await screen.findByRole("menuitem", { name: "Treat as personal" }));
  await waitFor(() => expect(body(calls, "POST handled/a/personal")).toEqual({ read_version: 3 }));
  expect(await screen.findByText(/Handed in Offer a for your Personal project/)).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Undo" }));
  await waitFor(() => expect(body(calls, "POST mail/a/set-aside")).toEqual({ section: "sales" }));
});

test("Always set aside mail like this saves a rule for the sender in the row's section, kept as a correction, and reads it back", async () => {
  const user = userEvent.setup();
  const calls = open({ "POST watch/sorting": () => SAVED });
  await user.click(await screen.findByRole("button", { name: "Read, nothing to do · 2" }));
  const other = await open_(user, /^Other mail · 1$/);
  await user.click(within(other).getByRole("button", { name: "More actions for Lunch q" }));
  await user.click(await screen.findByRole("menuitem", { name: "Always set aside mail like this" }));
  await waitFor(() =>
    expect(body(calls, "POST watch/sorting")).toEqual({ fingerprint: "fp-1", choice: "notices", senders: [addr("q")], domains: [], mail: "q" }),
  );
  expect(await screen.findByText(`From now on, mail from ${addr("q")} is set aside as automated notices.`)).toBeInTheDocument();
});

test("a list that can't be loaded says so and tries again", async () => {
  const user = userEvent.setup();
  let attempts = 0;
  open({
    "GET handled?tab=set_aside&q=": () => {
      attempts += 1;
      if (attempts === 1) throw new Error("down");
      return ASIDE;
    },
  });
  expect(await screen.findByText(/The list couldn't be loaded/)).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Try again" }));
  expect(await screen.findByRole("button", { name: "Sales and promotions · 2" })).toBeInTheDocument();
});

test("an assistant with no name of its own is called your assistant", async () => {
  fakeApi({ "GET handled?tab=set_aside&q=": () => ASIDE, "GET handled?tab=read&q=": () => READ });
  renderApp(<Handled />, {}, { unnamed: true });
  expect(await screen.findByText("Mail sorted away before your assistant read it: newsletters, sales, codes and alerts.")).toBeInTheDocument();
});
