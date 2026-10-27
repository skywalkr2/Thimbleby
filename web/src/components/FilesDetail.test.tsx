import "@testing-library/jest-dom/vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { S } from "../lib/api";
import { besidePane, fakeApi, renderApp, type Routes } from "../test-utils";
import { Files } from "./Files";

// A file's details pane (design 7.15): a preview, where it came from and what refers to it. Nothing is drawn as a page.

beforeEach(() => besidePane());

const file = (id: string, name: string, extra: Partial<S["FileView"]> = {}): S["FileView"] => ({
  id,
  version: 1,
  name,
  media_type: "application/pdf",
  size: 2048,
  file_kind: "attachment",
  kind_label: "Attachment",
  project: null,
  meta: {},
  origin: "upload",
  replaces: null,
  added_at: "2026-10-09T14:00:00Z",
  data_level: "internal",
  ...extra,
});

function open(list: S["FileView"][], extra: Routes = {}) {
  const routes: Routes = {
    "GET files": () => list,
    "GET projects": () => [],
    "GET plugin-actions": () => [],
    ...Object.fromEntries(list.map((f) => [`GET plugin-actions?kind=file&id=${f.id}`, () => []])),
    ...Object.fromEntries(list.map((f) => [`GET files/${f.id}/used-by`, (): S["FileUsedBy"] => ({ items: [] })])),
    ...extra,
  };
  const calls = fakeApi(routes);
  renderApp(<Files />);
  return calls;
}

const detail = () => screen.findByRole("complementary");

test("choosing a file shows its details beside the list: a preview, where it came from and what refers to it", async () => {
  const user = userEvent.setup();
  open([file("FILE-1", "cover.png", { media_type: "image/png", kind_label: "Picture" })], {
    "GET files/FILE-1/used-by": (): S["FileUsedBy"] => ({ items: [{ kind: "file", id: "FILE-2", kind_label: "File", label: "cover-2.png" }] }),
  });
  await user.click(await screen.findByRole("button", { name: "cover.png" }));
  const pane = await detail();
  expect(within(pane).getByRole("heading", { name: "Preview" })).toBeInTheDocument();
  const picture = within(pane).getByRole("img", { name: "A preview of cover.png" });
  expect(picture).toHaveAttribute("src", "api/files/FILE-1/content");
  expect(within(pane).getByRole("heading", { name: "Where it came from" })).toBeInTheDocument();
  expect(within(pane).getByText(/You added it on /)).toBeInTheDocument();
  expect(within(pane).getByRole("heading", { name: "What refers to it" })).toBeInTheDocument();
  const link = await within(pane).findByRole("link", { name: "File: cover-2.png" });
  expect(link).toHaveAttribute("href", expect.stringContaining("FILE-2"));
  expect(within(pane).getByRole("link", { name: "Open cover.png in a new tab" })).toHaveAttribute("target", "_blank");
});

test("a file nothing refers to says so, and a kind with no preview only offers to open it", async () => {
  const user = userEvent.setup();
  open([file("FILE-1", "plan.pdf")]);
  await user.click(await screen.findByRole("button", { name: "plan.pdf" }));
  const pane = await detail();
  expect(await within(pane).findByText("Nothing refers to it yet.")).toBeInTheDocument();
  expect(within(pane).getByText("There is no preview for this kind of file. Open it to see it.")).toBeInTheDocument();
  expect(within(pane).queryByRole("img")).toBeNull();
});

test("a file a program made says so and that what it holds is from outside, and a newer version names the one it replaces", async () => {
  const user = userEvent.setup();
  open([file("FILE-2", "built-2.pdf", { origin: "tool", replaces: "FILE-1" }), file("FILE-1", "built.pdf")]);
  await user.click(await screen.findByRole("button", { name: "built-2.pdf" }));
  const pane = await detail();
  expect(within(pane).getByText(/A program made it on /)).toBeInTheDocument();
  expect(within(pane).getByText(/never taken as instructions/)).toBeInTheDocument();
  expect(within(pane).getByText("It is a newer version of built.pdf.")).toBeInTheDocument();
});

test("a text file shows the start of its text as plain text, and tags in it are not drawn", async () => {
  const user = userEvent.setup();
  const body = "<b>Notes</b> for the printer\n" + "x".repeat(2500);
  const calls = open([file("FILE-1", "notes.txt", { media_type: "text/plain" })], {
    "GET files/FILE-1/content": () => body,
  });
  await user.click(await screen.findByRole("button", { name: "notes.txt" }));
  const pane = await detail();
  await waitFor(() => expect(calls.some((c) => c.route === "GET files/FILE-1/content")).toBe(true));
  const text = await within(pane).findByText(/Notes.*for the printer/s);
  expect(text.tagName).toBe("PRE");
  expect(text.querySelector("b")).toBeNull();
  expect(within(pane).getByText("This is the start of it. Open the file to read the rest.")).toBeInTheDocument();
});

test("Connections gets no details pane: a row opens its form in place", async () => {
  // The pane belongs to Files; the connections list is a list of rows whose Change opens in place (design 7.15).
  const { Sources } = await import("./Sources");
  fakeApi({
    "GET watch": () => [],
    "GET watch/kinds": () => [],
    "GET settings": () => ({ fingerprint: "fp-1", items: [] }),
  });
  renderApp(<Sources onAsk={vi.fn()} />);
  await screen.findByRole("heading", { name: "Connections" });
  expect(screen.queryByRole("complementary")).toBeNull();
});
