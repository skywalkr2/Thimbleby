import "@testing-library/jest-dom/vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { S } from "../lib/api";
import { Refuse, fakeApi, renderApp } from "../test-utils";
import { PageLinks, middleCut, webAddress } from "./PageLinks";

// The list of the person's quick links, in Settings → Quick links (design 7.9): a name and a web address each, saved as it is
// made with Undo. The header shows them (HeaderLinks.test.tsx).

/** Made-up addresses are built from this, so no address is written out whole. */
const WEB = "https" + "://";
const PLAIN = "http" + "://";
const board = { name: "Planning board", address: `${WEB}boards.example.org/plan` };
const schedule = { name: "Team schedule", address: `${WEB}schedule.example.org/team` };

const item = (value: unknown): S["SettingItem"] => ({
  key: "ui.links",
  file: "ui",
  group: "ui",
  description: "Links to your own pages.",
  type: "other",
  options: [],
  value,
  default: [],
  source: "file",
  locked: false,
  basic: false,
  editable: true,
});

function show(initial: unknown, extra: Record<string, (body: unknown) => unknown> = {}) {
  let current = initial;
  let n = 1;
  const calls = fakeApi({
    "GET settings": () => ({ fingerprint: `fp-${n}`, items: [item(current)] }),
    "POST settings": (body) => {
      const sent = body as S["SettingsSave"];
      const before = current;
      current = (sent.changes as Record<string, unknown>)["ui.links"];
      n += 1;
      return { changes: [{ key: "ui.links", before, after: current, was_default: false, is_default: false }], fingerprint: `fp-${n}`, needs_restart: false };
    },
    ...extra,
  });
  renderApp(<PageLinks />);
  return calls;
}

const sent = (calls: ReturnType<typeof fakeApi>) => calls.filter((c) => c.route === "POST settings").map((c) => (c.body as S["SettingsSave"]).changes);

test("each saved link is a row with its name and address and a way to remove it", async () => {
  show([board, schedule]);
  const list = await screen.findByRole("list", { name: "Quick links" });
  const rows = within(list).getAllByRole("listitem");
  expect(rows).toHaveLength(2);
  expect(rows[0]).toHaveTextContent("Planning board");
  expect(rows[0]).toHaveTextContent(board.address);
  expect(within(rows[1]).getByRole("button", { name: "Remove Team schedule" })).toBeInTheDocument();
});

test("a page is added from a name and an address, saved at once with Undo", async () => {
  const user = userEvent.setup();
  const calls = show([board]);
  const name = await screen.findByRole("textbox", { name: "Name" });
  await user.type(name, "Team schedule");
  await user.type(screen.getByRole("textbox", { name: "Address" }), schedule.address);
  await user.click(screen.getByRole("button", { name: "Add this link" }));
  await waitFor(() => expect(sent(calls)).toEqual([{ "ui.links": [board, schedule] }]));
  expect(await screen.findByText(/Team schedule added to your quick links/)).toBeInTheDocument();
  // The form is empty again and the new row is there.
  expect(screen.getByRole("textbox", { name: "Name" })).toHaveValue("");
  expect(await screen.findByText(schedule.address)).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Undo" }));
  await waitFor(() => expect(sent(calls).pop()).toEqual({ "ui.links": [board] }));
});

test("removing a page saves at once with Undo, and leaves the others", async () => {
  const user = userEvent.setup();
  const calls = show([board, schedule]);
  await user.click(await screen.findByRole("button", { name: "Remove Planning board" }));
  await waitFor(() => expect(sent(calls)).toEqual([{ "ui.links": [schedule] }]));
  expect(await screen.findByText(/Planning board removed from your quick links/)).toBeInTheDocument();
});

test("an address that is not a web address is told in plain words and nothing is saved", async () => {
  const user = userEvent.setup();
  const calls = show([]);
  await user.type(await screen.findByRole("textbox", { name: "Name" }), "Odd one");
  await user.type(screen.getByRole("textbox", { name: "Address" }), "javascript:alert(1)");
  await user.click(screen.getByRole("button", { name: "Add this link" }));
  expect(await screen.findByText(/isn.t a web address/)).toBeInTheDocument();
  expect(sent(calls)).toEqual([]);
});

test("a name or address left empty keeps the button from saving", async () => {
  const user = userEvent.setup();
  const calls = show([]);
  const add = await screen.findByRole("button", { name: "Add this link" });
  expect(add).toBeDisabled();
  await user.type(screen.getByRole("textbox", { name: "Name" }), "Only a name");
  expect(add).toBeDisabled();
  expect(sent(calls)).toEqual([]);
});

test("a refusal from the server is shown by the form, with what was typed kept", async () => {
  const user = userEvent.setup();
  show([], { "POST settings": () => new Refuse(409, "The settings changed since you opened them. Look again, then save.") });
  await user.type(await screen.findByRole("textbox", { name: "Name" }), "Planning board");
  await user.type(screen.getByRole("textbox", { name: "Address" }), board.address);
  await user.click(screen.getByRole("button", { name: "Add this link" }));
  expect(await screen.findByText(/The settings changed since you opened them/)).toBeInTheDocument();
  expect(screen.getByRole("textbox", { name: "Name" })).toHaveValue("Planning board");
});

test("an address typed without https:// gets it, and one that is not a web address is left to be refused", () => {
  expect(webAddress("example.org/bank")).toBe(`${WEB}example.org/bank`);
  expect(webAddress("  example.org:8080/x ")).toBe(`${WEB}example.org:8080/x`);
  expect(webAddress(`${PLAIN}example.org/a`)).toBe(`${PLAIN}example.org/a`);
  expect(webAddress("javascript:alert(1)")).toBe("javascript:alert(1)");
  expect(webAddress("mailto:me@example.org")).toBe("mailto:me@example.org");
  expect(webAddress("not an address")).toBe("not an address");
});

test("the form adds https:// itself, says where the links appear, shows the name's limit, and the browser's own message never appears", async () => {
  const user = userEvent.setup();
  const calls = show([]);
  expect(await screen.findByText(/shown in the menu under your initials/)).toBeInTheDocument();
  const name = screen.getByRole("textbox", { name: "Name" });
  expect(screen.getByText("0 of 40 characters.")).toBeInTheDocument();
  await user.type(name, "My bank");
  expect(screen.getByText("7 of 40 characters.")).toBeInTheDocument();
  await user.type(screen.getByRole("textbox", { name: "Address" }), "example.org/bank");
  expect(document.querySelector("form")).toHaveAttribute("novalidate");
  await user.click(screen.getByRole("button", { name: "Add this link" }));
  await waitFor(() => expect(sent(calls)).toEqual([{ "ui.links": [{ name: "My bank", address: `${WEB}example.org/bank` }] }]));
});

test("with no link the list says so in one line, and a long address is cut in its middle with the whole one on hover", async () => {
  const empty = show([]);
  expect(await screen.findByText("No quick links yet.")).toBeInTheDocument();
  void empty;
  const long = `${WEB}www.example.com/${"folder/".repeat(12)}page`;
  const cut = middleCut(long);
  expect(cut.length).toBeLessThan(long.length);
  expect(cut.startsWith(`${WEB}www.example.com`)).toBe(true);
  expect(cut.endsWith("page")).toBe(true);
  expect(cut).toContain("…");
  expect(middleCut(`${WEB}example.com/a`)).toBe(`${WEB}example.com/a`);
});
