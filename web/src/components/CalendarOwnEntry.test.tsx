import "@testing-library/jest-dom/vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import type { S } from "../lib/api";
import { fakeApi, renderApp, type Routes } from "../test-utils";
import { RecordPage } from "./RecordPage";

// The person's own calendar entry is moved or cancelled from its page at once, with Undo in a toast, and a connected event that
// can't be changed through its account says why in plain words instead of showing nothing.

afterEach(() => vi.unstubAllGlobals());

const ENTRY = "EVT-1";
const CHANGESET = "CS-9";
const START = "2026-11-02T09:00:00+00:00";
const END = "2026-11-02T10:00:00+00:00";

const options = (over: Partial<S["ActOptionsView"]> = {}): S["ActOptionsView"] => ({
  record: ENTRY,
  kind: "event",
  account: null,
  account_label: null,
  acting: false,
  can_act: false,
  channel_label: null,
  actions: [],
  answers: [],
  propose_refusal: null,
  folder_source: null,
  folders_listed: false,
  event_actions: [],
  event_own: true,
  event_why: null,
  ...over,
});

function open(shown: S["ActOptionsView"], extra: Routes = {}) {
  const calls = fakeApi({
    [`GET record?kind=event&id=${ENTRY}`]: () => ({ kind: "event", id: ENTRY, version: 3, fields: { id: ENTRY, title: "Planning session", start: START, end: END }, long_text: [] }),
    "GET kinds/event": () => ({ kind: "event", fields: [{ name: "title", description: "", type: "text", required: true, editable: false }] }),
    "GET people": () => [],
    "GET projects": () => [],
    [`GET acts/options?record=${ENTRY}`]: () => shown,
    ...extra,
  });
  renderApp(<RecordPage kind="event" id={ENTRY} onBack={() => {}} />);
  return calls;
}

const menu = async (user: ReturnType<typeof userEvent.setup>) => user.click(await screen.findByRole("button", { name: /More actions for Change this event/ }));
const posted = (calls: ReturnType<typeof fakeApi>, route: string) => calls.filter((c) => c.route === route);

describe("an entry the app keeps itself", () => {
  test("is cancelled at once with the version read, and Undo in the toast puts it back", async () => {
    const user = userEvent.setup();
    const calls = open(options(), {
      [`POST events/${ENTRY}/cancel`]: () => ({ changeset: CHANGESET, refused: null }),
      [`POST changesets/${CHANGESET}/undo`]: () => ({ restored: [0], skipped: [] }),
    });
    await menu(user);
    await user.click(await screen.findByRole("menuitem", { name: "Cancel this event" }));
    await waitFor(() => expect(posted(calls, `POST events/${ENTRY}/cancel`)).toHaveLength(1));
    expect(posted(calls, `POST events/${ENTRY}/cancel`)[0].body).toEqual({ read_version: 3 });
    await user.click(await screen.findByRole("button", { name: "Undo" }));
    await waitFor(() => expect(posted(calls, `POST changesets/${CHANGESET}/undo`)).toHaveLength(1));
    expect(calls.some((c) => c.route === "POST acts")).toBe(false);
  });

  test("is moved at once to the time typed, with Undo", async () => {
    const user = userEvent.setup();
    const calls = open(options(), {
      [`POST events/${ENTRY}/move`]: () => ({ changeset: CHANGESET, refused: null }),
      [`POST changesets/${CHANGESET}/undo`]: () => ({ restored: [0], skipped: [] }),
    });
    await menu(user);
    await user.click(await screen.findByRole("menuitem", { name: "Move to another time…" }));
    const start = await screen.findByLabelText("Starts");
    await user.clear(start);
    await user.type(start, "2026-11-03T14:00");
    const end = screen.getByLabelText("Ends");
    await user.clear(end);
    await user.type(end, "2026-11-03T15:00");
    await user.click(screen.getByRole("button", { name: "Move it" }));
    await waitFor(() => expect(posted(calls, `POST events/${ENTRY}/move`)).toHaveLength(1));
    expect(posted(calls, `POST events/${ENTRY}/move`)[0].body).toEqual({
      start: new Date("2026-11-03T14:00").toISOString(),
      end: new Date("2026-11-03T15:00").toISOString(),
      read_version: 3,
    });
    expect(await screen.findByRole("button", { name: "Undo" })).toBeInTheDocument();
  });

  test("a cancel something else needs is said in plain words, with no Undo", async () => {
    const user = userEvent.setup();
    open(options(), { [`POST events/${ENTRY}/cancel`]: () => ({ changeset: null, refused: "referred_to" }) });
    await menu(user);
    await user.click(await screen.findByRole("menuitem", { name: "Cancel this event" }));
    expect(await screen.findByText(/tied to this entry, so it can't be cancelled yet/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Undo" })).toBeNull();
  });
});

describe("a connected event that can't be changed through its account", () => {
  const connected = (over: Partial<S["ActOptionsView"]>) =>
    options({ event_own: false, account: "demo-service:pat@example.com", account_label: "Demo service (pat@example.com)", ...over });

  test("says acting is off for the account and links to the setting", async () => {
    open(connected({ event_why: "acting_off" }));
    expect(await screen.findByText(/turned off for Demo service \(pat@example.com\)/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Turn it on in Settings." })).toHaveAttribute("href", expect.stringContaining("settings"));
    expect(screen.queryByRole("button", { name: /More actions for Change this event/ })).toBeNull();
  });

  test("says to change it in the calendar app when the service does neither", async () => {
    open(connected({ acting: true, event_why: "app_only" }));
    expect(await screen.findByText("Change it in your calendar app.", { exact: false })).toBeInTheDocument();
  });
});
