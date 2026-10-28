import "@testing-library/jest-dom/vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import type { S } from "../lib/api";
import { setAreaChoice } from "../lib/area-filter";
import { RestartProvider } from "../lib/restart";
import { forgetLine } from "../lib/today";
import { fakeApi, renderApp, statusFixture, type Routes } from "../test-utils";
import { Today } from "./Today";

// One Today across the areas of life (design 6.32): each line is tagged by the area it is in, and a choice beside the heading
// narrows Today to one area. The choice is offered only while the lines are in more than one place, a line in no area shows only
// under All, and a remembered choice for an area nothing is in reads as All.

type Line = S["QueueLineView"];

const decision = (n: number, text: string, over: Partial<Line> = {}): Line => ({
  key: `question:Q-${n}`,
  group: "decide",
  kind: "decision",
  count: 1,
  untrusted: false,
  unpriced: 0,
  actions: [],
  questions: [],
  outcome: {},
  text,
  question: `Q-${n}`,
  ...over,
});

const clinic = decision(1, "Which clinic day suits you?", { area: "PRJ-10", area_name: "Health" });
const fence = decision(2, "Which fence do you prefer?", { area: "PRJ-11", area_name: "Garden" });
const work = decision(3, "Matte or soft-touch?");

function show(lines: Line[], extra: Routes = {}) {
  vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener: () => undefined, removeEventListener: () => undefined }));
  const calls = fakeApi({
    "GET today/queue": () => lines,
    "GET changes": () => [],
    "GET followups": () => [],
    "GET plugin-today": () => [],
    "GET stages/records": () => [],
    "GET stages/ready": () => [],
    "GET stages/requests": () => [],
    "GET today/agenda": () => [],
    "GET today/arrived": () => ({ items: [], left_out: 0, set_aside: 0 }),
    "GET today/week": () => ({ first: "2026-10-19", last: "2026-10-23", due: [], waiting: [], meetings: [] }),
    "GET acts": () => ({ acts: [] }),
    "GET watch": () => [],
    "GET projects": () => [],
    "GET status": () => statusFixture({}, { assistant: { last_run_at: "2026-10-20T08:00:00Z" } }),
    "GET runtime-config": () => ({ instance: null }),
    ...extra,
  });
  renderApp(
    <RestartProvider hellos={1}>
      <Today workspace="Workspace" onView={vi.fn()} onAddSource={vi.fn()} onOpenGuide={vi.fn()} onOpenRecord={vi.fn()} shortcuts={{ next: "j", previous: "k" }} />
    </RestartProvider>,
  );
  return calls;
}

afterEach(() => {
  vi.unstubAllGlobals();
  forgetLine();
  setAreaChoice("all");
  window.localStorage.clear();
});

const rowOf = async (text: string) => (await screen.findByText(text, { selector: "li *" })).closest("li") as HTMLElement;
const shownTexts = () => screen.queryAllByText(/Which clinic day|Which fence|Matte or soft-touch/, { selector: "li *" }).map((e) => e.textContent?.replace(/^.*: /, ""));

test("each line in an area is tagged with its area, and a line in none has no tag", async () => {
  show([clinic, fence, work]);
  expect((await rowOf("Which clinic day suits you?")).querySelector("[data-area]")).toHaveTextContent("Health:");
  expect((await rowOf("Which fence do you prefer?")).querySelector("[data-area]")).toHaveTextContent("Garden:");
  expect((await rowOf("Matte or soft-touch?")).querySelector("[data-area]")).toBeNull();
});

test("a choice of area is offered beside the heading, and picking one shows only that area's lines", async () => {
  const user = userEvent.setup();
  show([clinic, fence, work]);
  const choice = await screen.findByRole("radiogroup", { name: "Which area" });
  for (const name of ["All areas", "Health", "Garden"]) expect(within(choice).getByRole("radio", { name })).toBeInTheDocument();
  expect(within(choice).getByRole("radio", { name: "All areas" })).toBeChecked();
  expect(shownTexts()).toHaveLength(3);
  await user.click(within(choice).getByRole("radio", { name: "Health" }));
  await waitFor(() => expect(shownTexts()).toEqual(["Which clinic day suits you?"]));
  await user.click(within(choice).getByRole("radio", { name: "All areas" }));
  await waitFor(() => expect(shownTexts()).toHaveLength(3));
});

test("with every line in one area, or none in an area, there is no choice and no tag", async () => {
  show([clinic, { ...clinic, key: "question:Q-4", question: "Q-4", text: "Which dentist takes the new plan?" }]);
  await screen.findByText("Which clinic day suits you?", { selector: "li *" });
  expect(screen.queryByRole("radiogroup", { name: "Which area" })).toBeNull();
  expect(document.querySelector("[data-area]")).toBeNull();
});

test("a remembered choice for an area no line is in reads as All, so Today is never empty because of a hidden filter", async () => {
  setAreaChoice("PRJ-99");
  show([clinic, fence, work]);
  await rowOf("Which clinic day suits you?");
  expect(shownTexts()).toHaveLength(3);
  expect(within(await screen.findByRole("radiogroup", { name: "Which area" })).getByRole("radio", { name: "All areas" })).toBeChecked();
});
