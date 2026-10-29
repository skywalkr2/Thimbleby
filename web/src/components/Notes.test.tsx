import "@testing-library/jest-dom/vitest";
import { screen, within } from "@testing-library/react";
import type { S } from "../lib/api";
import { project } from "../lib/records-fixtures";
import { fakeApi, renderApp } from "../test-utils";
import { Notes } from "./Notes";

// A list of the notes that were filed (design 5.3, 7.15): newest first, each a link to its page, with the day and where.

const note = (id: string, text: string, over: Partial<S["NoteView"]> = {}): S["NoteView"] => ({ id, text, project: null, project_name: null, side_name: null, created_at: "2026-10-20T09:00:00Z", trust: "trusted", ...over });

const served = (notes: S["NoteView"][]) =>
  fakeApi({
    "GET notes": () => notes,
    "GET projects": () => [project("PRJ-1", "Harbor")],
    "GET setup/business": () => ({ business: false, name: "", personal: "PRJ-1", sides: [], chosen: "personal" }),
  });

test("each note is one row whose first line opens its page, with the day it was filed and where", async () => {
  served([note("N-2", "Call the printer\nAbout the proof", { project: "PRJ-1", project_name: "Harbor" }), note("N-1", "Order paper", { created_at: "2026-10-18T09:00:00Z" })]);
  renderApp(<Notes />);
  const list = await screen.findByRole("list", { name: "Notes" });
  const rows = within(list).getAllByRole("listitem");
  expect(rows).toHaveLength(2);
  const first = within(rows[0]).getByRole("link", { name: "Call the printer" });
  expect(first.getAttribute("href")).toMatch(/#records\/note\/N-2$/);
  expect(rows[0]).toHaveTextContent("Harbor");
  expect(rows[0]).toHaveTextContent("Filed");
  expect(screen.getByText("2 notes")).toBeInTheDocument();
});

test("a note from outside content says so", async () => {
  served([note("N-1", "A forwarded line", { trust: "untrusted" })]);
  renderApp(<Notes />);
  expect(await screen.findByText("From outside")).toBeInTheDocument();
});

test("with no notes it says how one is made, in one line", async () => {
  served([]);
  renderApp(<Notes />);
  expect(await screen.findByText("No notes yet. A note you hand in to be kept shows up here.")).toBeInTheDocument();
});
