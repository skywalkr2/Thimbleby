import "@testing-library/jest-dom/vitest";
import { screen } from "@testing-library/react";
import { ConnectionProvider } from "../lib/connection";
import { renderApp } from "../test-utils";
import { Failed } from "./RailPanel";

// A rail card that couldn't load is one line; while the app is offline the offline bar holds the one Try now, so the card draws none.
const live = (state: "live" | "offline") => ({ state, lastUpdate: null, refresh: () => undefined, reconnect: () => undefined });

test("a rail card that couldn't load is one line with Try again, and offline it has no second retry", () => {
  const { unmount } = renderApp(
    <ConnectionProvider live={live("live")}>
      <Failed text="Your calendar couldn't be loaded." retry={() => undefined} />
    </ConnectionProvider>,
  );
  expect(screen.getByRole("button", { name: "Try again" })).toBeVisible();
  expect(document.querySelector("[data-empty] svg")).toBeNull();
  unmount();
  renderApp(
    <ConnectionProvider live={live("offline")}>
      <Failed text="Your calendar couldn't be loaded." retry={() => undefined} />
    </ConnectionProvider>,
  );
  expect(screen.getByText("Your calendar couldn't be loaded.")).toBeVisible();
  expect(screen.queryByRole("button")).toBeNull();
});
