import "@testing-library/jest-dom/vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useQuery } from "@tanstack/react-query";
import { vi } from "vitest";
import { ApiError } from "../lib/api";
import { ConnectionProvider } from "../lib/connection";
import { COUNT_MAX, countText } from "../lib/counts";
import { fakeApi, renderApp } from "../test-utils";
import { ChangedElsewhere } from "./ChangedElsewhere";
import { FilteredEmpty } from "./FilteredEmpty";
import { ListState } from "./ListState";
import { NotSaved } from "./NotSaved";
import { GroupLabel } from "./GroupLabel";
import { OfflineBanner } from "./OfflineBanner";
import { TabStrip } from "./TabStrip";

// The states every list screen shares (VP07): offline, a failed save, changed elsewhere, filtered to nothing, loading and
// couldn't load, and a large count.

const live = (state: "live" | "offline", extra: { retry?: () => void; at?: Date | null } = {}) => ({
  state,
  lastUpdate: extra.at === undefined ? new Date("2026-11-03T10:42:00Z") : extra.at,
  refresh: extra.retry ?? (() => undefined),
  reconnect: () => undefined,
});

test("the offline bar is one slim line: what is shown was loaded when, that it reconnects by itself, and Try now (the header's chip says Offline)", () => {
  renderApp(
    <ConnectionProvider live={live("offline")}>
      <OfflineBanner />
    </ConnectionProvider>,
  );
  const banner = screen.getByRole("status");
  expect(banner).toHaveTextContent("Showing what loaded at");
  expect(banner).toHaveTextContent("It reconnects by itself.");
  expect(banner).not.toHaveTextContent("You're offline.");
  expect(banner.querySelectorAll("p")).toHaveLength(1);
  expect(within(banner).getByRole("button", { name: "Try now" })).toBeVisible();
});

test("a screen can say the offline state in its own words: setup says the answers are kept", () => {
  renderApp(
    <ConnectionProvider live={live("offline")}>
      <OfflineBanner words={{ title: "walkthrough.offline.title", text: "walkthrough.offline.text" }} />
    </ConnectionProvider>,
  );
  const banner = screen.getByRole("status");
  expect(banner).toHaveTextContent("You're offline.");
  expect(banner).toHaveTextContent("Your answers are kept");
  expect(banner).not.toHaveTextContent("Showing what loaded");
});

test("Try now asks the connection to look at once", async () => {
  const user = userEvent.setup();
  const retry = vi.fn();
  renderApp(
    <ConnectionProvider live={live("offline", { retry })}>
      <OfflineBanner />
    </ConnectionProvider>,
  );
  await user.click(screen.getByRole("button", { name: "Try now" }));
  expect(retry).toHaveBeenCalled();
});

test("the offline banner is not drawn while the connection is up", () => {
  renderApp(
    <ConnectionProvider live={live("live")}>
      <OfflineBanner />
    </ConnectionProvider>,
  );
  expect(screen.queryByRole("status")).toBeNull();
});

test("with no time known the offline banner still says it, without a made-up time", () => {
  renderApp(
    <ConnectionProvider live={live("offline", { at: null })}>
      <OfflineBanner />
    </ConnectionProvider>,
  );
  expect(screen.getByRole("status")).toHaveTextContent("loaded earlier");
});

test("a failed save names what was not saved, says nothing is lost, and Try again runs it again", async () => {
  const user = userEvent.setup();
  const again = vi.fn();
  renderApp(<NotSaved what="Pay the deposit" reason="The app couldn't write to its folder." onRetry={again} />);
  const row = screen.getByRole("alert");
  expect(row).toHaveTextContent("Not saved");
  expect(row).toHaveTextContent("“Pay the deposit” wasn't saved.");
  expect(row).toHaveTextContent("The app couldn't write to its folder.");
  expect(row).toHaveTextContent("Nothing is lost: your change is kept here until it saves.");
  await user.click(within(row).getByRole("button", { name: "Try again" }));
  expect(again).toHaveBeenCalledTimes(1);
});

test("a failed save with no name or reason still says what happened", () => {
  renderApp(<NotSaved onRetry={() => undefined} />);
  expect(screen.getByRole("alert")).toHaveTextContent("That wasn't saved. Nothing is lost");
});

test("changed elsewhere shows each field as old, an arrow, new, keeps the person's edit, and lets them choose", async () => {
  const user = userEvent.setup();
  const keep = vi.fn();
  const take = vi.fn();
  renderApp(<ChangedElsewhere changes={[{ label: "Due", was: "Tue, Nov 3", now: "Thu, Nov 5", mine: "Fri, Nov 6" }]} time="10:51 AM" onKeep={keep} onTake={take} />);
  const box = screen.getByRole("alert");
  expect(box).toHaveTextContent("Changed somewhere else");
  expect(box).toHaveTextContent("10:51 AM");
  expect(box.querySelector("[data-was]")).toHaveTextContent("Tue, Nov 3");
  expect(box.querySelector("[data-now]")).toHaveTextContent("Thu, Nov 5");
  expect(box).toHaveTextContent("Yours: Fri, Nov 6");
  await user.click(within(box).getByRole("button", { name: "Keep mine" }));
  expect(keep).toHaveBeenCalled();
  expect(take).not.toHaveBeenCalled();
  await user.click(within(box).getByRole("button", { name: "Use the new one" }));
  expect(take).toHaveBeenCalled();
});

test("changed elsewhere draws nothing when no field moved", () => {
  renderApp(<ChangedElsewhere changes={[]} onKeep={() => undefined} onTake={() => undefined} />);
  expect(screen.queryByRole("alert")).toBeNull();
});

test("filtered to nothing names the filter and the one button is Clear filter", async () => {
  const user = userEvent.setup();
  const clear = vi.fn();
  renderApp(<FilteredEmpty text="Nothing for Lantern Row Studio today." onClear={clear} />);
  expect(screen.getByText("Nothing for Lantern Row Studio today.")).toBeVisible();
  await user.click(screen.getByRole("button", { name: "Clear filter" }));
  expect(clear).toHaveBeenCalled();
});

test("a count above the limit is written with a plus, and the limit itself in full", () => {
  expect(countText(7)).toBe("7");
  expect(countText(COUNT_MAX)).toBe("99");
  expect(countText(COUNT_MAX + 1)).toBe("99+");
  expect(countText(140)).toBe("99+");
});

test("a large count shows as 99+ in a group label and a tab, and the tab still says the real number to a screen reader", () => {
  renderApp(
    <>
      <GroupLabel count={128}>Look over</GroupLabel>
      <TabStrip label="Lists" value="a" onChange={() => undefined} options={[{ value: "a", label: "Open", count: 140 }]} />
    </>,
  );
  expect(document.querySelector("[data-group-count]")).toHaveTextContent("99+");
  const tab = screen.getByRole("button", { name: "Open, 140" });
  expect(tab).toHaveTextContent("99+");
});

function Probe(props: { read: () => Promise<string[]>; offline?: boolean }) {
  const q = useQuery({ queryKey: ["probe"], queryFn: props.read });
  return (
    <ConnectionProvider live={live(props.offline ? "offline" : "live")}>
      <ListState query={q} failed="The probe couldn't be loaded.">
        {(rows) => <ul>{rows.map((r) => <li key={r}>{r}</li>)}</ul>}
      </ListState>
    </ConnectionProvider>
  );
}

test("a list that is still loading shows skeleton rows, not words", () => {
  renderApp(<Probe read={() => new Promise<string[]>(() => undefined)} />);
  const region = screen.getByRole("status", { name: "Loading…" });
  expect(region).toHaveAttribute("aria-busy", "true");
  expect(region.querySelectorAll("[aria-hidden]").length).toBeGreaterThanOrEqual(3);
});

test("a list that could not be loaded says so plainly with Try again, and Try again loads it", async () => {
  const user = userEvent.setup();
  let ok = false;
  renderApp(<Probe read={() => (ok ? Promise.resolve(["First row"]) : Promise.reject(new ApiError(500, "The folder is locked.")))} />);
  const alert = await screen.findByRole("alert");
  expect(alert).toHaveTextContent("The probe couldn't be loaded.");
  ok = true;
  await user.click(within(alert).getByRole("button", { name: "Try again" }));
  expect(await screen.findByText("First row")).toBeVisible();
  expect(screen.queryByRole("alert")).toBeNull();
});

test("offline, a list that could not be loaded says the app can't reach its server", async () => {
  renderApp(<Probe offline read={() => Promise.reject(new TypeError("Failed to fetch"))} />);
  expect(await screen.findByRole("alert")).toHaveTextContent("The probe couldn't be loaded. The app can't reach its server.");
});

test("a list that loaded once stays readable when a later read fails", async () => {
  fakeApi({});
  let calls = 0;
  const { client } = renderApp(<Probe read={() => (++calls === 1 ? Promise.resolve(["Kept row"]) : Promise.reject(new ApiError(500, "")))} />);
  expect(await screen.findByText("Kept row")).toBeVisible();
  await client.invalidateQueries();
  await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("The probe couldn't be loaded."));
  expect(screen.getByText("Kept row")).toBeVisible();
});
