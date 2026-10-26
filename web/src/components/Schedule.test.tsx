import "@testing-library/jest-dom/vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { S } from "../lib/api";
import { addDays, day, wallTime } from "../lib/dates";
import { fakeApi, renderApp, type Routes } from "../test-utils";
import { Schedule } from "./Schedule";

/** Made-up addresses are built from this, so no address is written out whole. */
const WEB = "https" + "://";

const TODAY = "2026-10-26";

function entry(over: Partial<S["ScheduleEntryView"]> & Pick<S["ScheduleEntryView"], "title">, date = TODAY): S["ScheduleEntryView"] {
  return {
    snapshot: `snap-${over.title}`,
    source: "cal-work",
    start: `${date}T10:00:00+00:00`,
    all_day: false,
    cancelled: false,
    own: false,
    open_items: 0,
    days: [date],
    slot: "timed",
    begins: `${date}T10:00:00+00:00`,
    ...over,
  };
}

function page(first: string, today = TODAY, days = 3): S["ScheduleView"] {
  return {
    today,
    first,
    days: Array.from({ length: days }, (_, n) => {
      const date = addDays(first, n);
      const plain = date === TODAY;
      return {
        date,
        all_day: plain ? [entry({ title: "Offsite", slot: "all_day", all_day: true, begins: undefined, start: date })] : [],
        timed: plain
          ? [
              entry({ title: "Standup", begins: `${date}T09:00:00+00:00`, ends: `${date}T09:30:00+00:00`, where: "Room A", entry: "EVT-1" }),
              entry({ title: "Dentist", own: true, snapshot: "EVT-7", source: "", begins: `${date}T12:00:00+00:00` }),
              entry({ title: "Design review", begins: `${date}T15:00:00+00:00`, source: "cal-home", link: `${WEB}meet.example.com/room/42` }),
            ]
          : [],
      };
    }),
  };
}

/** A route for each first day the test may move to, from a week back to a week on. */
function routes(extra: Routes = {}): Routes {
  const found: Routes = {
    "GET schedule": () => page(TODAY),
    "GET watch": () => [
      { id: "cal-work", label: "Work calendar" },
      { id: "cal-home", label: "Home calendar" },
    ],
    ...extra,
  };
  for (let n = -8; n <= 8; n++) {
    const first = addDays(TODAY, n);
    found[`GET schedule?from=${first}`] ??= () => page(first);
  }
  return found;
}

const requested = (calls: ReturnType<typeof fakeApi>) => calls.filter((c) => c.route.startsWith("GET schedule")).map((c) => c.route.replace("GET ", ""));

async function open(extra: Routes = {}) {
  const calls = fakeApi(routes(extra));
  const view = renderApp(<Schedule />);
  await screen.findByRole("heading", { level: 2, name: new RegExp(day(TODAY)) });
  return { calls, view };
}

test("each day has a heading, its all-day entries apart at the top and its timed entries in time order", async () => {
  await open();
  const today = screen.getByRole("region", { name: new RegExp(`Today · ${day(TODAY)}`) });
  expect(screen.getByRole("heading", { level: 2, name: `Tomorrow · ${day(addDays(TODAY, 1))}` })).toBeInTheDocument();
  expect(screen.getByRole("heading", { level: 2, name: day(addDays(TODAY, 2)) })).toBeInTheDocument();
  const [allDay, timed] = within(today).getAllByRole("list");
  expect(within(allDay).getByRole("listitem")).toHaveTextContent("Offsite");
  expect(within(today).getByRole("heading", { level: 3, name: "All day" })).toBeInTheDocument();
  const rows = within(timed).getAllByRole("listitem");
  expect(rows.map((r) => /Standup|Dentist|Design review/.exec(r.textContent ?? "")?.[0])).toEqual(["Standup", "Dentist", "Design review"]);
  expect(rows[0]).toHaveTextContent(`${wallTime(`${TODAY}T09:00:00`)} – ${wallTime(`${TODAY}T09:30:00`)}`);
  expect(rows[0]).toHaveTextContent("Room A");
  // An empty day says so.
  expect(within(screen.getByRole("region", { name: day(addDays(TODAY, 2)) })).getByText("Nothing on this day.")).toBeInTheDocument();
});

test("every entry says where it comes from in words, and opens its page", async () => {
  await open();
  const row = (title: string) => screen.getByText(title).closest("li") as HTMLElement;
  expect(row("Standup")).toHaveTextContent("From Work calendar");
  expect(row("Design review")).toHaveTextContent("From Home calendar");
  expect(row("Dentist")).toHaveTextContent("From your notes");
  expect(row("Standup")).toHaveAttribute("data-source", "cal-work");
  expect(within(row("Dentist")).getByRole("link", { name: "Dentist" })).toHaveAttribute("href", expect.stringMatching(/#records\/event\/EVT-7$/));
  expect(within(row("Standup")).getByRole("link", { name: "Standup" })).toHaveAttribute("href", expect.stringMatching(/#records\/event\/EVT-1$/));
  // An event the app keeps no page for opens in its calendar, showing the address' domain.
  const review = within(row("Design review")).getByRole("link", { name: "Design review" });
  expect(review).toHaveAttribute("href", `${WEB}meet.example.com/room/42`);
  expect(row("Design review")).toHaveTextContent("meet.example.com");
});

test("the arrows move a day at a time and Today comes back", async () => {
  const user = userEvent.setup();
  const calls = (await open()).calls;
  await user.click(screen.getByRole("button", { name: "Next day" }));
  await screen.findByRole("heading", { level: 2, name: `Tomorrow · ${day(addDays(TODAY, 1))}` });
  expect(requested(calls)).toContain(`schedule?from=${addDays(TODAY, 1)}`);
  expect(screen.queryByRole("heading", { level: 2, name: `Today · ${day(TODAY)}` })).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Previous day" }));
  await screen.findByRole("heading", { level: 2, name: `Today · ${day(TODAY)}` });
  await user.click(screen.getByRole("button", { name: "Previous day" }));
  await screen.findByRole("heading", { level: 2, name: day(addDays(TODAY, -1)) });
  expect(requested(calls)).toContain(`schedule?from=${addDays(TODAY, -1)}`);
  await user.click(screen.getByRole("button", { name: "Today" }));
  await screen.findByRole("heading", { level: 2, name: `Today · ${day(TODAY)}` });
});

test("moving back onto today asks for today itself, so the first day follows the clock", async () => {
  const user = userEvent.setup();
  const calls = (await open()).calls;
  await user.click(screen.getByRole("button", { name: "Next day" }));
  await screen.findByRole("heading", { level: 2, name: `Tomorrow · ${day(addDays(TODAY, 1))}` });
  await user.click(screen.getByRole("button", { name: "Previous day" }));
  await screen.findByRole("heading", { level: 2, name: `Today · ${day(TODAY)}` });
  expect(requested(calls).at(-1)).toBe("schedule");
});

test("the left and right arrow keys move a day, Shift moves a week", async () => {
  const calls = (await open()).calls;
  fireEvent.keyDown(document.body, { key: "ArrowRight" });
  await waitFor(() => expect(requested(calls)).toContain(`schedule?from=${addDays(TODAY, 1)}`));
  await screen.findByRole("heading", { level: 2, name: `Tomorrow · ${day(addDays(TODAY, 1))}` });
  fireEvent.keyDown(document.body, { key: "ArrowLeft", shiftKey: true });
  await waitFor(() => expect(requested(calls)).toContain(`schedule?from=${addDays(TODAY, -6)}`));
});

test("the arrow keys never move the days while the cursor is in a field or on another control's own keys", async () => {
  const calls = fakeApi(routes());
  renderApp(
    <>
      <input aria-label="Typing here" />
      <div role="radiogroup" aria-label="Options">
        <button type="button" role="radio" aria-checked="true">
          One
        </button>
      </div>
      <Schedule />
    </>,
  );
  await screen.findByRole("heading", { level: 2, name: `Today · ${day(TODAY)}` });
  fireEvent.keyDown(screen.getByLabelText("Typing here"), { key: "ArrowRight" });
  fireEvent.keyDown(screen.getByRole("radio"), { key: "ArrowRight" });
  // A key with a modifier that is not Shift is the browser's own.
  fireEvent.keyDown(document.body, { key: "ArrowRight", ctrlKey: true });
  expect(requested(calls)).toEqual(["schedule"]);
});

test("a schedule that can't be loaded says so and tries again", async () => {
  const user = userEvent.setup();
  const broken = routes();
  delete broken["GET schedule"];
  fakeApi(broken);
  renderApp(<Schedule />);
  expect(await screen.findByText("Your schedule couldn't be loaded.")).toBeInTheDocument();
  fakeApi(routes());
  await user.click(screen.getByRole("button", { name: "Try again" }));
  await screen.findByRole("heading", { level: 2, name: `Today · ${day(TODAY)}` });
});
