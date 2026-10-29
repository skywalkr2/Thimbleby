import "@testing-library/jest-dom/vitest";
import { cleanup, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

test("Not right is about one item: the box names it, only it is sent back, and it leaves the list at once", async () => {
  const second: Line = { ...item, key: "item:CS-1:1", text: "Book the room", op: 1 };
  const two: Line = { ...batch, items: [item, second] };
  const calls = fakeApi({ "POST changesets/CS-1/send-back": () => ({ request: "REQ-2" }) });
  const user = userEvent.setup();
  renderApp(<BatchDetail line={two} />);
  await user.click(screen.getByRole("button", { name: /Not right: Send two spine options/ }));
  await user.type(screen.getByLabelText(/differently about: Send two spine options/), "Not a to-do");
  await user.click(screen.getByRole("button", { name: "Send back" }));
  expect(calls.filter((c) => c.route === "POST changesets/CS-1/send-back").map((c) => c.body)).toEqual([{ note: "Not a to-do", ops: [0] }]);
  await waitFor(() => expect(screen.queryByText("Send two spine options")).not.toBeInTheDocument());
  expect(screen.getByText("Book the room")).toBeInTheDocument();
});

test("Not right on one item says the whole note runs again with the note, and shows the estimate", async () => {
  const priced: Line = { ...batch, items: [{ ...item, estimate_usd: 0.4 }] };
  fakeApi({});
  const user = userEvent.setup();
  renderApp(<BatchDetail line={priced} />);
  await user.click(screen.getByRole("button", { name: /Not right: Send two spine options/ }));
  expect(screen.getByText("Runs the whole note again with your note")).toBeInTheDocument();
  expect(screen.getByText(/About \$0\.40/)).toBeInTheDocument();
});

test("each item shows where it came from, its side and its owner, and a draft shows its text", () => {
  const todo: Line = {
    ...item,
    title: { kind: "email", person_name: "Pat Example", topic: "Spine options" },
    project_name: "Launch",
    side_name: "Work",
    person_name: "Robin Sample",
  };
  const draft: Line = { ...item, key: "item:CS-1:1", what: "draft", text: "Draft new text for the week plan", draft: "Week one: the spine.", op: 1 };
  renderApp(<BatchDetail line={{ ...batch, items: [todo, draft] }} />);
  expect(screen.getByText(/Email from Pat Example/)).toBeInTheDocument();
  expect(screen.getByText(/Launch/)).toBeInTheDocument();
  expect(screen.getByText(/Robin Sample/)).toBeInTheDocument();
  expect(screen.getByText("Week one: the spine.")).toBeInTheDocument();
});

test("Not right is a quiet link on the item's row, never a second button beside the primary action", () => {
  renderApp(<BatchDetail line={batch} />);
  expect(screen.getByRole("button", { name: /Not right: Send two spine options/ })).toHaveAttribute("data-variant", "quiet");
  expect(screen.getByRole("button", { name: "All looks good" })).toHaveAttribute("data-variant", "primary");
});
