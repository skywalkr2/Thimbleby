import "@testing-library/jest-dom/vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { addDays, fullDay } from "../lib/dates";
import { entry, scheduleRoutes, TODAY, WEEK } from "../lib/schedule-fixtures";
import { fakeApi, renderApp } from "../test-utils";
import { Schedule } from "./Schedule";

// Moving through the calendar by touch, and where each entry's details lead. The views, keys, grid, details pane and side
// filter are in ScheduleViews.test.tsx. The old three-day layout this file once covered (a heading and region for each of
// three days, the arrows moving one day) is replaced by the calendar page; what still holds is here.

/** Made-up addresses are built from this, so no address is written out whole. */
const WEB = "https" + "://";

const requested = (calls: ReturnType<typeof fakeApi>) => calls.filter((c) => c.route.startsWith("GET schedule")).map((c) => c.route.replace("GET ", ""));

beforeEach(() => {
  window.localStorage.clear();
  window.localStorage.setItem("cockpit:schedule-view", "day");
  vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener: () => undefined, removeEventListener: () => undefined }));
});

async function open() {
  const calls = fakeApi(scheduleRoutes());
  renderApp(<Schedule />);
  await screen.findByRole("heading", { level: 2, name: fullDay(TODAY) });
  return calls;
}

/** A touch at a point, as the screen's own handlers read it. */
const touch = (x: number, y: number) => ({ touches: [{ clientX: x, clientY: y }], changedTouches: [{ clientX: x, clientY: y }] });

const swipe = (from: [number, number], to: [number, number]) => {
  const frame = document.querySelector("[data-swipe]") as HTMLElement;
  fireEvent.touchStart(frame, touch(...from));
  fireEvent.touchEnd(frame, { touches: [], changedTouches: [{ clientX: to[0], clientY: to[1] }] });
};

describe("swiping on a phone", () => {
  beforeEach(() => document.documentElement.setAttribute("data-narrow", ""));
  afterEach(() => document.documentElement.removeAttribute("data-narrow"));

  test("a swipe to the left moves forward by the view's unit and a swipe to the right moves back, as the arrows do", async () => {
    const calls = await open();
    swipe([300, 200], [100, 210]);
    await screen.findByRole("heading", { level: 2, name: fullDay(addDays(TODAY, 1)) });
    expect(requested(calls)).toContain(`schedule?from=${addDays(TODAY, 1)}&days=1`);
    swipe([100, 200], [300, 190]);
    await screen.findByRole("heading", { level: 2, name: fullDay(TODAY) });
    swipe([100, 200], [300, 200]);
    await screen.findByRole("heading", { level: 2, name: fullDay(addDays(TODAY, -1)) });
  });

  test("a mostly vertical or a short movement is the page scrolling and moves nothing, and the arrows still work", async () => {
    const user = userEvent.setup();
    const calls = await open();
    const before = requested(calls).length;
    swipe([200, 100], [150, 400]); // mostly down
    swipe([200, 100], [230, 100]); // too short
    expect(requested(calls)).toHaveLength(before);
    await user.click(screen.getByRole("button", { name: "Next day" }));
    await screen.findByRole("heading", { level: 2, name: fullDay(addDays(TODAY, 1)) });
  });

  test("a movement with two fingers moves nothing", async () => {
    const calls = await open();
    const before = requested(calls).length;
    const frame = document.querySelector("[data-swipe]") as HTMLElement;
    fireEvent.touchStart(frame, { touches: [{ clientX: 300, clientY: 200 }, { clientX: 320, clientY: 200 }], changedTouches: [] });
    fireEvent.touchEnd(frame, { touches: [], changedTouches: [{ clientX: 50, clientY: 200 }] });
    expect(requested(calls)).toHaveLength(before);
  });
});

test("off the phone layout a sideways touch moves nothing", async () => {
  const calls = await open();
  const before = requested(calls).length;
  swipe([300, 200], [100, 200]);
  expect(requested(calls)).toHaveLength(before);
});

test("the arrow keys never move the calendar while the cursor is on another control's own keys", async () => {
  const calls = fakeApi(scheduleRoutes());
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
  await screen.findByRole("heading", { level: 2, name: fullDay(TODAY) });
  const before = requested(calls).length;
  fireEvent.keyDown(screen.getByLabelText("Typing here"), { key: "ArrowRight" });
  fireEvent.keyDown(screen.getByRole("radio", { name: "One" }), { key: "ArrowRight" });
  expect(requested(calls)).toHaveLength(before);
});

test("an entry's page: its own page for the app's entries and kept ones, a read-only page for a connected event the app keeps none for", async () => {
  const user = userEvent.setup();
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: /min-width: 1024px/.test(query), addEventListener: () => undefined, removeEventListener: () => undefined }));
  fakeApi(
    scheduleRoutes((date) => (date === TODAY ? { timed: [...(WEEK(date).timed ?? []), entry({ title: "Linked", link: `${WEB}meet.example.com/room/42`, begins: `${date}T16:00:00+00:00` })] } : {})),
  );
  renderApp(<Schedule />);
  await screen.findByRole("heading", { level: 2, name: fullDay(TODAY) });
  const hrefOf = async (title: RegExp) => {
    await user.click(await screen.findByRole("button", { name: title }));
    const pane = await screen.findByRole("complementary");
    return within(pane).getByRole("link", { name: "Open" }).getAttribute("href") ?? "";
  };
  expect(await hrefOf(/Standup/)).toMatch(/#records\/event\/EVT-1$/);
  expect(await hrefOf(/Dentist/)).toMatch(/#records\/event\/EVT-7$/);
  // The date opened is part of the read-only page's address, so a repeating event shows the right date.
  const href = await hrefOf(/Design review/);
  expect(decodeURIComponent(href.split("#")[1].split("/")[2])).toBe(`snap-Design review@${TODAY}T15:00:00+00:00`);
  await waitFor(() => expect(screen.getByRole("complementary", { name: "Design review" })).toBeInTheDocument());
});
