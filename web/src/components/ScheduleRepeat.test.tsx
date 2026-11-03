import "@testing-library/jest-dom/vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import type { S } from "../lib/api";
import { entry } from "../lib/schedule-fixtures";
import { fakeApi, renderApp, typeMoment, dayValue } from "../test-utils";
import { EntryDetails } from "./ScheduleEntryPane";

// An entry of the person's own that repeats says so in its details, and Move and Cancel act on the date that was opened or on every
// date (design 7.7; sweep X45), each at once with Undo.

afterEach(() => vi.unstubAllGlobals());

const ENTRY = "EVT-1";
const WAS = "2026-10-23T10:00:00+00:00";
const calendars = { name: () => undefined, color: () => undefined } as unknown as Parameters<typeof EntryDetails>[0]["calendars"];

const options = (): S["ActOptionsView"] =>
  ({ record: ENTRY, kind: "event", account: null, account_label: null, acting: false, can_act: false, channel_label: null, actions: [], answers: [], propose_refusal: null, folder_source: null, folders_listed: false, event_actions: [], event_own: true, event_why: null }) as S["ActOptionsView"];

function open(extra: Record<string, () => unknown> = {}) {
  const calls = fakeApi({
    [`GET record?kind=event&id=${ENTRY}`]: () => ({ kind: "event", id: ENTRY, version: 5, fields: { id: ENTRY, title: "Print sync", start: "2026-10-16T10:00:00+00:00", end: "2026-10-16T11:00:00+00:00" }, long_text: [] }),
    [`GET acts/options?record=${ENTRY}`]: () => options(),
    [`POST events/${ENTRY}/cancel`]: () => ({ changeset: "CS-1", refused: null }),
    [`POST events/${ENTRY}/move`]: () => ({ changeset: "CS-2", refused: null }),
    "POST changesets/CS-1/undo": () => ({ restored: [0], skipped: [] }),
    ...extra,
  });
  const repeating = entry({ title: "Print sync", snapshot: ENTRY, own: true, kind: "own", where: "Room 2", repeats: "week", occurrence: WAS, start: WAS, end: "2026-10-23T11:00:00+00:00" }, "2026-10-23");
  renderApp(<EntryDetails entry={repeating} date="2026-10-23" calendars={calendars} sideName={null} />);
  return calls;
}

const menu = async (user: ReturnType<typeof userEvent.setup>) => user.click(await screen.findByRole("button", { name: /More actions for/ }));

test("the details say the place and how often it repeats", async () => {
  open();
  expect(await screen.findByText("Room 2")).toBeInTheDocument();
  expect(screen.getByText("Every week")).toBeInTheDocument();
});

test("the menu offers this date and every date, and Cancel this date sends the date alone with Undo", async () => {
  const user = userEvent.setup();
  const calls = open();
  await menu(user);
  expect((await screen.findAllByRole("menuitem")).map((x) => x.textContent)).toEqual(["Move this date…", "Cancel this date", "Move every date…", "Cancel every date"]);
  await user.click(screen.getByRole("menuitem", { name: "Cancel this date" }));
  await waitFor(() => expect(calls.filter((c) => c.route === `POST events/${ENTRY}/cancel`)).toHaveLength(1));
  expect(calls.find((c) => c.route === `POST events/${ENTRY}/cancel`)!.body).toEqual({ read_version: 5, occurrence: WAS });
  expect(await screen.findByText("Cancelled that date.")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Undo" }));
  await waitFor(() => expect(calls.some((c) => c.route === "POST changesets/CS-1/undo")).toBe(true));
});

test("Cancel every date sends no date, and Move this date starts from that date's own time", async () => {
  const user = userEvent.setup();
  const calls = open();
  await menu(user);
  await user.click(await screen.findByRole("menuitem", { name: "Cancel every date" }));
  await waitFor(() => expect(calls.filter((c) => c.route === `POST events/${ENTRY}/cancel`)).toHaveLength(1));
  expect(calls.find((c) => c.route === `POST events/${ENTRY}/cancel`)!.body).toEqual({ read_version: 5 });
  await menu(user);
  await user.click(await screen.findByRole("menuitem", { name: "Move this date…" }));
  const start = await screen.findByLabelText("Starts");
  expect(dayValue(start)).toBe("2026-10-23");
  await typeMoment(userEvent.setup(), start, "2026-10-24T09:00");
  await typeMoment(userEvent.setup(), screen.getByLabelText("Ends"), "2026-10-24T10:00");
  await user.click(screen.getByRole("button", { name: "Move it" }));
  await waitFor(() => expect(calls.filter((c) => c.route === `POST events/${ENTRY}/move`)).toHaveLength(1));
  expect(calls.find((c) => c.route === `POST events/${ENTRY}/move`)!.body).toMatchObject({ read_version: 5, occurrence: WAS });
});
