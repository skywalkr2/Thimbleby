import "@testing-library/jest-dom/vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { S } from "../lib/api";
import { person, project } from "../lib/records-fixtures";
import { fakeApi, renderApp, snapshotOf } from "../test-utils";
import { RecordPage } from "./RecordPage";

// A team's days off and a person's time away (design 5.1, 7.14): each period is a row with Edit and Remove, Add opens a form
// with date pickers and the cursor in its first field, and a team's holiday calendar and working days are lists to pick from.
// Every change is the person's own, at once, with Undo; the ordinary details never say them a second time.

const field = (name: string, type: S["FieldView"]["type"], extra: Partial<S["FieldView"]> = {}): S["FieldView"] => ({ name, description: "", type, required: false, editable: true, ...extra });

const team = {
  name: "Lantern Design",
  members: ["PER-3"],
  holiday_calendar: "en-GB",
  working_days: ["monday", "tuesday", "wednesday", "thursday"],
  days_off: [
    { start: "2026-12-28", end: "2026-12-30", label: "Office move" },
    { start: "2027-01-04", end: null, label: null },
  ],
};
const teamFields = [field("name", "text"), field("members", "list"), field("holiday_calendar", "choice", { options: ["en-GB", "en-US"] }), field("working_days", "list"), field("days_off", "list")];

type Sent = { kind: string; id: string; fields: Record<string, unknown>; read_version: number };

function serve(kind: "team" | "person", id: string, fields: Record<string, unknown>, sent: Sent[], details: S["RecordPageView"]["details"] = []) {
  const k = kind;
  fakeApi({
    [`GET record?kind=${k}&id=${id}`]: () => ({ kind, id, version: 6, fields: { id, ...fields }, long_text: [] }),
    [`GET kinds/${kind}`]: () => ({ kind, fields: kind === "team" ? teamFields : [field("full_name", "text"), field("away", "list")] }),
    [`GET record-pages/${id}?kind=${k}`]: () => ({ kind, id, version: 6, name: String(fields.name ?? fields.full_name), details, open_actions: [], open_questions: [], completed_actions: [], fact_source: null, activity: [] }),
    "GET people": () => [person("PER-1", "Robin Sample", { is_pm: true }), person("PER-3", "Sam Okoro")],
    "GET projects": () => [project("PRJ-1", "Harbor")],
    "GET settings": () => ({ fingerprint: "fp", items: [] }),
    "GET lists": () => [],
    "GET organizations": () => [],
    "GET me": () => ({ person: "PER-1", full_name: "Robin Sample" }),
    "GET people/PER-3/memory": () => ({ person: "PER-3", name: "Sam Okoro", last_in_touch: null, asked_of: [], asked_by: [], promised_to: [], promised_by: [], reach: { kept: {}, replies_on: null, replies_record: null }, dates: [], matters: [] }),
    "GET setup/business": () => ({ business: false, name: "", personal: "PRJ-personal", sides: [], chosen: "both" }),
    [`GET plugin-actions?kind=${k}&id=${id}`]: () => [],
    [`GET task-kinds?kind=${k}&id=${id}`]: () => [],
    "POST records/edit": (body) => {
      sent.push(body as Sent);
      return { changeset: "CS-9" };
    },
    "POST changesets/CS-9/undo": () => ({ restored: [0], skipped: [] }),
  });
}

async function teamPage(sent: Sent[] = []) {
  serve("team", "TEAM-2", team, sent);
  renderApp(<RecordPage kind="team" id="TEAM-2" onBack={() => {}} />);
  return await screen.findByRole("region", { name: "Days off" });
}

test("a team's days off are rows that say the days and what they are, and the details don't say them again", async () => {
  const section = await teamPage();
  const list = within(section).getByRole("list", { name: "Days off of the team" });
  const rows = within(list).getAllByRole("listitem").filter((r) => r.hasAttribute("data-row"));
  expect(rows).toHaveLength(2);
  expect(rows[0]).toHaveTextContent("Office move");
  expect(rows[0]).toHaveTextContent(/to/);
  expect(rows[1]).toHaveTextContent("Closed");
  // The details have the name and members; the days off, calendar and week are only in the section.
  const details = screen.getByRole("region", { name: "Details" });
  expect(within(details).queryByText("Office move")).toBeNull();
});

test("adding days off opens a form with the cursor in its first date, and saving is the person's own change with Undo", async () => {
  const sent: Sent[] = [];
  const section = await teamPage(sent);
  fireEvent.click(within(section).getByRole("button", { name: "Add days off" }));
  const first = await within(section).findByLabelText("First day");
  expect(first).toHaveFocus();
  expect(first).toHaveAttribute("data-kind", "date");
  fireEvent.change(first, { target: { value: "2027-02-01" } });
  fireEvent.change(within(section).getByRole("textbox", { name: /Last day/ }), { target: { value: "2027-02-03" } });
  fireEvent.change(within(section).getByLabelText(/What it is/), { target: { value: "Conference" } });
  fireEvent.click(within(section).getByRole("button", { name: "Save" }));
  await waitFor(() => expect(sent).toHaveLength(1));
  expect(sent[0]).toEqual({
    kind: "team",
    id: "TEAM-2",
    read_version: 6,
    fields: { days_off: [...team.days_off, { start: "2027-02-01", end: "2027-02-03", label: "Conference" }] },
  });
  fireEvent.click(await screen.findByRole("button", { name: "Undo" }));
  await waitFor(() => expect(screen.queryByRole("button", { name: "Undo" })).toBeNull());
});

test("the last day can't come before the first, so there is nothing to save", async () => {
  const section = await teamPage();
  fireEvent.click(within(section).getByRole("button", { name: "Add days off" }));
  fireEvent.change(await within(section).findByLabelText("First day"), { target: { value: "2027-02-05" } });
  fireEvent.change(within(section).getByRole("textbox", { name: /Last day/ }), { target: { value: "2027-02-01" } });
  expect(within(section).getByRole("button", { name: "Save" })).toBeDisabled();
  expect(within(section).getByText("The last day can't come before the first.")).toBeInTheDocument();
});

test("Edit changes one period and Remove, in its menu, takes it out", async () => {
  const sent: Sent[] = [];
  const section = await teamPage(sent);
  const user = userEvent.setup();
  const first = within(section).getAllByRole("listitem").filter((r) => r.hasAttribute("data-row"))[0];
  await user.click(within(first).getByRole("button", { name: "Edit" }));
  const label = within(first).getByLabelText(/What it is/);
  fireEvent.change(label, { target: { value: "Moving office" } });
  await user.click(within(first).getByRole("button", { name: "Save" }));
  await waitFor(() => expect(sent).toHaveLength(1));
  expect((sent[0].fields.days_off as Array<{ label: string | null }>).map((p) => p.label)).toEqual(["Moving office", null]);
  const second = within(section).getAllByRole("listitem").filter((r) => r.hasAttribute("data-row"))[1];
  await user.click(within(second).getByRole("button", { name: /More/ }));
  await user.click(await screen.findByRole("menuitem", { name: "Remove" }));
  await waitFor(() => expect(sent).toHaveLength(2));
  expect(sent[1].fields).toEqual({ days_off: [team.days_off[0]] });
});

test("the holiday calendar and the working days are lists to pick from", async () => {
  const sent: Sent[] = [];
  const section = await teamPage(sent);
  const calendar = within(section).getByLabelText("Holiday calendar");
  expect(calendar).toHaveAttribute("data-ui", "select");
  expect(within(await snapshotOf(calendar as HTMLElement)).getAllByRole("option").map((o) => o.textContent)).toEqual(["The workspace's calendar", "en-GB", "en-US"]);
  await userEvent.setup().selectOptions(calendar, "");
  await waitFor(() => expect(sent).toHaveLength(1));
  expect(sent[0].fields).toEqual({ holiday_calendar: null });
  const friday = within(section).getByRole("checkbox", { name: "Friday" });
  expect(friday).not.toBeChecked();
  expect(within(section).getByRole("checkbox", { name: "Monday" })).toBeChecked();
  fireEvent.click(friday);
  await waitFor(() => expect(sent).toHaveLength(2));
  expect(sent[1].fields).toEqual({ working_days: ["monday", "tuesday", "wednesday", "thursday", "friday"] });
});

test("a person's page has their time away with the same rows and form", async () => {
  const sent: Sent[] = [];
  serve("person", "PER-3", { full_name: "Sam Okoro", away: [{ start: "2026-11-20", end: "2026-11-24", label: "Vacation" }] }, sent);
  renderApp(<RecordPage kind="person" id="PER-3" onBack={() => {}} />);
  const section = await screen.findByRole("region", { name: "Time away" });
  expect(within(section).getByText("Vacation")).toBeInTheDocument();
  fireEvent.click(within(section).getByRole("button", { name: "Add time away" }));
  fireEvent.change(await within(section).findByLabelText("First day"), { target: { value: "2026-12-21" } });
  fireEvent.click(within(section).getByRole("button", { name: "Save" }));
  await waitFor(() => expect(sent).toHaveLength(1));
  expect(sent[0]).toEqual({
    kind: "person",
    id: "PER-3",
    read_version: 6,
    fields: { away: [{ start: "2026-11-20", end: "2026-11-24", label: "Vacation" }, { start: "2026-12-21", end: null, label: null }] },
  });
  // A person has no calendar or week of their own.
  expect(within(section).queryByLabelText("Holiday calendar")).toBeNull();
});

test("a person's team is a link to the team's page, where its days off are kept", async () => {
  const refs = [{ field: "team", value: "TEAM-2", type: "text", refs: [{ kind: "team", id: "TEAM-2", name: "Lantern Design" }] }];
  serve("person", "PER-3", { full_name: "Sam Okoro", team: "TEAM-2", away: [] }, [], refs as S["RecordPageView"]["details"]);
  renderApp(<RecordPage kind="person" id="PER-3" onBack={() => {}} />);
  const link = await screen.findByRole("link", { name: "Lantern Design" });
  expect(link.getAttribute("href")).toMatch(/team\/TEAM-2$/);
});
