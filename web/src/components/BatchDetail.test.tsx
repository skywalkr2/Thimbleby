import "@testing-library/jest-dom/vitest";
import { cleanup, screen } from "@testing-library/react";
import { vi } from "vitest";
import type { S } from "../lib/api";
import { fakeApi, renderApp } from "../test-utils";
import { BatchDetail } from "./BatchDetail";

type Line = S["QueueLineView"];

const item: Line = {
  key: "item:CS-1:0",
  group: "review",
  kind: "batch_item",
  count: 1,
  untrusted: false,
  unpriced: 0,
  actions: [],
  questions: [],
  outcome: {},
  what: "action",
  text: "Send two spine options",
  request: "REQ-1",
  changeset: "CS-1",
  op: 0,
};
const batch: Line = { ...item, key: "review:REQ-1", kind: "review", changesets: ["CS-1"], items: [item] };

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

test("the review pane on Today counts the time it is open, and says so once when it closes", () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-28T09:00:00Z"));
  const calls = fakeApi({ "POST quality/review-time": () => ({ seconds: 95 }) });
  const { unmount } = renderApp(<BatchDetail line={batch} />);
  expect(screen.getByText("Send two spine options")).toBeInTheDocument();
  vi.setSystemTime(new Date("2026-10-28T09:01:35Z"));
  unmount();
  expect(calls.filter((c) => c.route === "POST quality/review-time").map((c) => c.body)).toEqual([{ screen: "today", seconds: 95 }]);
});
