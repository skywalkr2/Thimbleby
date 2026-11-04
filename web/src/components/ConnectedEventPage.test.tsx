import "@testing-library/jest-dom/vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { S } from "../lib/api";
import { day, wallTime } from "../lib/dates";
import { fakeApi, renderApp } from "../test-utils";
import { ConnectedEventPage } from "./ConnectedEventPage";

/** Made-up addresses are built from this, so no address is written out whole. */
const WEB = "https" + "://";
const START = "2026-10-26T09:00:00+00:00";

const view = (extra: Partial<S["ConnectedEventView"]> = {}): S["ConnectedEventView"] => ({
  snapshot: "snap-1",
  source: "cal-work",
  title: "Proof review",
  start: START,
  end: "2026-10-26T10:30:00+00:00",
  all_day: false,
  where: "Room 2",
  cancelled: false,
  link: `${WEB}calendar.example.com/event/1`,
  organizer: { name: "Organizer Name", address: "organizer@example.com" },
  attendees: [
    { name: "Guest One", address: "one@example.com", response: "accepted" },
    { address: "two@example.com" },
  ],
  ...extra,
});

function open(found: () => unknown, onBack = vi.fn()) {
  const calls = fakeApi({
    [`GET schedule/events/snap-1?start=${encodeURIComponent(START)}`]: found,
    "GET watch": () => [{ id: "cal-work", label: "Work calendar" }],
  });
  renderApp(<ConnectedEventPage id={`snap-1@${START}`} onBack={onBack} />);
  return { calls, onBack };
}

test("the page says what the calendar says: title, when, where, who is coming and which calendar", async () => {
  open(() => view());
  expect(await screen.findByRole("heading", { level: 1, name: "Proof review" })).toBeInTheDocument();
  const details = screen.getByRole("region", { name: "Details" });
  expect(within(details).getByText("When").nextSibling).toHaveTextContent(`${day(START)}, ${wallTime(START)} – ${wallTime("2026-10-26T10:30:00+00:00")}`);
  expect(within(details).getByText("Where").nextSibling).toHaveTextContent("Room 2");
  expect(within(details).getByText("Calendar").nextSibling).toHaveTextContent("Work calendar");
  const asked = screen.getByRole("region", { name: "Who is asked" });
  expect(asked).toHaveTextContent("Organizer Name");
  expect(within(asked).getAllByRole("listitem").map((li) => li.textContent)).toEqual([
    expect.stringContaining("Guest One"),
    expect.stringContaining("two@example.com"),
  ]);
  expect(asked).toHaveTextContent("one@example.com");
});

test("it is read-only: it says so and offers nothing to change", async () => {
  open(() => view());
  await screen.findByRole("heading", { level: 1, name: "Proof review" });
  // One line says where it comes from and where to change it; nothing here is edited.
  expect(screen.getByText("From your calendar. Change it there.")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Edit" })).toBeNull();
  expect(screen.queryByRole("textbox")).toBeNull();
});

test("the link opens the event in its calendar and shows the address' real domain", async () => {
  open(() => view());
  const link = await screen.findByRole("link", { name: "Open in your calendar" });
  expect(link).toHaveAttribute("href", `${WEB}calendar.example.com/event/1`);
  expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
  expect(link.parentElement).toHaveTextContent("calendar.example.com");
  // It is the page's one action, drawn filled.
  expect(link).toHaveAttribute("data-weight", "filled");
});

test("an event with no address has no link, and a called-off one says so", async () => {
  open(() => view({ link: null, cancelled: true, where: null }));
  await screen.findByRole("heading", { level: 1, name: "Proof review" });
  expect(screen.queryByRole("link", { name: "Open in your calendar" })).toBeNull();
  const details = screen.getByRole("region", { name: "Details" });
  expect(within(details).getByText("Status").nextSibling).toHaveTextContent("Called off");
  expect(within(details).queryByText("Where")).toBeNull();
});

test("an all-day event shows its days, and the calendar's own words are never read as markup", async () => {
  fakeApi({
    "GET schedule/events/snap-1": () => view({ all_day: true, start: "2026-10-26", end: "2026-10-28", title: "<b>Away</b>", where: null, attendees: [], organizer: null }),
    "GET watch": () => [],
  });
  renderApp(<ConnectedEventPage id="snap-1" onBack={() => undefined} />);
  expect(await screen.findByRole("heading", { level: 1, name: "<b>Away</b>" })).toBeInTheDocument();
  expect(document.querySelector("h1 b")).toBeNull();
  expect(screen.getByText(`${day("2026-10-26")} to ${day("2026-10-28")} (all day)`)).toBeInTheDocument();
  // A calendar that isn't on the list is called by a plain name, never its id.
  expect(screen.getByText("A connected calendar")).toBeInTheDocument();
});

test("an event that is gone from its calendar says so, and Back goes back", async () => {
  const user = userEvent.setup();
  fakeApi({ "GET watch": () => [] });
  const onBack = vi.fn();
  renderApp(<ConnectedEventPage id="snap-9" onBack={onBack} />);
  expect(await screen.findByText("This event isn't on a connected calendar any more.")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Back" }));
  expect(onBack).toHaveBeenCalledTimes(1);
});

test("opened from a clash, the page shows the clash it came from: both meetings and how to open each", async () => {
  fakeApi({
    [`GET schedule/events/snap-1?start=${encodeURIComponent(START)}`]: () => view(),
    "GET watch": () => [{ id: "cal-work", label: "Work calendar" }],
    "GET today/queue": () => [
      {
        key: "clash:a:b",
        group: "risk",
        kind: "clash",
        count: 1,
        untrusted: false,
        unpriced: 0,
        actions: [],
        questions: [],
        outcome: {},
        text: "Proof review",
        other: "Supplier call",
        event_page: `snap-1@${START}`,
        other_event_page: "snap-2@2026-10-26T10:00:00+00:00",
        state: "overlap",
        minutes: 30,
      },
    ],
  });
  renderApp(<ConnectedEventPage id={`snap-1@${START}`} onBack={vi.fn()} />);
  const clash = await screen.findByRole("region", { name: "It clashes with another meeting" });
  expect(within(clash).getByRole("group", { name: "Proof review" })).toBeInTheDocument();
  expect(within(clash).getByRole("group", { name: "Supplier call" })).toBeInTheDocument();
  expect(within(clash).getAllByRole("link", { name: "Open the event" })).toHaveLength(2);
});

test("the kind of page is said in the line under the title, not as a tag beside it", async () => {
  open(() => view());
  await screen.findByRole("heading", { level: 1, name: "Proof review" });
  expect(screen.getByText("Calendar event").closest("[data-pill]")).toBeNull();
  expect(screen.getByText("Calendar event")).toHaveTextContent("Calendar event");
});
