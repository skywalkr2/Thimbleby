import "@testing-library/jest-dom/vitest";
import { screen, within } from "@testing-library/react";
import { vi } from "vitest";
import type { S } from "../lib/api";
import { RestartProvider } from "../lib/restart";
import { setSideChoice } from "../lib/sides";
import { forgetLine } from "../lib/today";
import { project } from "../lib/records-fixtures";
import { fakeApi, renderApp, statusFixture, type Routes } from "../test-utils";
import { Today } from "./Today";

// A person with several accounts and sides (design 6.32): what Today lists under the side filter, and what it says of the same
// thread held by two mailboxes. Every line is on the side its source or its entries are on; a line on more than one side shows
// under each; one on none shows under every choice.

type Line = S["QueueLineView"];
type Arrived = S["ArrivedView"];

const PERSONAL = project("PRJ-personal", "Personal");
const FIRST: S["SideView"] = { project: "PRJ-first", kind: "business", name: "Harborview Community Support Partnership Incorporated", removable: false, filed: 0 };
const SECOND: S["SideView"] = { project: "PRJ-second", kind: "job", name: "Lantern Row Studio", removable: false, filed: 0 };

const line = (kind: Line["kind"], over: Partial<Line> = {}): Line => ({ key: kind, group: "risk", kind, count: 1, untrusted: false, unpriced: 0, actions: [], questions: [], outcome: {}, ...over });
const clash = (key: string, text: string, other: string, over: Partial<Line> = {}): Line =>
  line("clash", {
    key,
    text,
    other,
    state: "overlap",
    minutes: 30,
    due: "2026-10-27",
    at: "2026-10-27T11:00:00+00:00",
    starts: "2026-10-27T10:30:00+00:00",
    ends: "2026-10-27T11:30:00+00:00",
    other_starts: "2026-10-27T11:00:00+00:00",
    other_ends: "2026-10-27T12:00:00+00:00",
    ...over,
  });
const mail = (id: string, title: string, source: string, over: Partial<Arrived> = {}): Arrived => ({
  snapshot: id,
  source,
  title,
  sender: "Pat Sample",
  received: "2026-10-27T08:00:00+00:00",
  unread: true,
  version: 1,
  also_in: [],
  sides: [],
  ...over,
});
const source = (id: string, label: string): S["WatchSourceView"] => ({ id, label, connector: "k", connector_label: "Mail", enabled: true, every_minutes: 15, items: 1, last: null, read_at: null, failures: 0, problem: null, reads: ["mail"] });

function show(lines: Line[], arrived: Arrived[], extra: Routes = {}) {
  vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener: () => undefined, removeEventListener: () => undefined }));
  const sides = [FIRST, SECOND];
  fakeApi({
    "GET today/queue": () => lines,
    "GET changes": () => [],
    "GET followups": () => [],
    "GET plugin-today": () => [],
    "GET stages/records": () => [],
    "GET stages/ready": () => [],
    "GET stages/requests": () => [],
    "GET today/agenda": () => [],
    "GET today/todo": () => [],
    "GET today/arrived": () => ({ items: arrived, left_out: 0, set_aside: 0 }),
    "GET watch": () => [source("mail-a", "Inbox, alex@example.com"), source("mail-b", "Inbox, blake@example.com"), source("mail-c", "Inbox, casey@example.com")],
    "GET status": () => statusFixture({}, { assistant: { last_run_at: "2026-10-20T08:00:00Z" } }),
    "GET runtime-config": () => ({ instance: null }),
    "GET setup/business": () => ({ business: true, name: FIRST.name, personal: PERSONAL.id, sides, chosen: null }),
    "GET projects": () => [PERSONAL, ...sides.map((s) => project(s.project, s.name))],
    "GET views": () => [],
    ...extra,
  });
  renderApp(
    <RestartProvider hellos={1}>
      <Today workspace="Workspace" onView={vi.fn()} onAddSource={vi.fn()} onOpenGuide={vi.fn()} onOpenRecord={vi.fn()} shortcuts={{ next: "j", previous: "k" }} />
    </RestartProvider>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  forgetLine();
  window.localStorage.clear();
  setSideChoice("all");
});

const clashTitle = (a: string, b: string) => new RegExp(`^Sort out the clash on [^:]*: ${a} and ${b}$`);

const CLASHES = [
  clash("clash:1", "Supplier call", "Fitting", { side: FIRST.project }),
  clash("clash:2", "Review", "Planning", { sides: [PERSONAL.id, SECOND.project] }),
  clash("clash:3", "Dentist", "School run", { sides: [PERSONAL.id, FIRST.project] }),
];

test("under a side, a clash shows when it is between that side and another, and not a clash of two others", async () => {
  setSideChoice(SECOND.project);
  show(CLASHES, []);
  expect(await screen.findByText(clashTitle("Review", "Planning"))).toBeInTheDocument();
  expect(screen.queryByText(clashTitle("Supplier call", "Fitting"))).toBeNull();
  expect(screen.queryByText(clashTitle("Dentist", "School run"))).toBeNull();
});

test("under Personal, both clashes between Personal and another side show, and the one inside a business does not", async () => {
  setSideChoice(PERSONAL.id);
  show(CLASHES, []);
  expect(await screen.findByText(clashTitle("Dentist", "School run"))).toBeInTheDocument();
  expect(screen.getByText(clashTitle("Review", "Planning"))).toBeInTheDocument();
  expect(screen.queryByText(clashTitle("Supplier call", "Fitting"))).toBeNull();
});

test("under All every clash shows", async () => {
  show(CLASHES, []);
  expect(await screen.findByText(clashTitle("Supplier call", "Fitting"))).toBeInTheDocument();
  expect(screen.getByText(clashTitle("Review", "Planning"))).toBeInTheDocument();
  expect(screen.getByText(clashTitle("Dentist", "School run"))).toBeInTheDocument();
});

test("a clash line names the calendars the two meetings are in", async () => {
  show([clash("clash:1", "Supplier call", "Fitting", { source_name: "Calendar, alex@example.com", other_source_name: "Calendar, blake@example.com" })], []);
  expect(await screen.findByText("They overlap by 30 minutes · In Calendar, alex@example.com and in Calendar, blake@example.com")).toBeInTheDocument();
});

const MESSAGES = [
  mail("m1", "Personal parcel", "mail-a", { sides: [PERSONAL.id] }),
  mail("m2", "Order for the first business", "mail-b", { sides: [FIRST.project, SECOND.project] }),
  mail("m3", "Newsletter nobody placed", "mail-c", { sides: [] }),
];
const came = async () => (await screen.findByRole("region", { name: /Came in/ })) as HTMLElement;

test("under a business, the mail that came in is that of the mailboxes serving it, and of one that serves none", async () => {
  setSideChoice(FIRST.project);
  show([], MESSAGES);
  await within(await came()).findByText("Order for the first business");
  expect(within(await came()).getByText("Newsletter nobody placed")).toBeInTheDocument();
  expect(within(await came()).queryByText("Personal parcel")).toBeNull();
});

test("under Personal, a mailbox serving two businesses is left out, and under All everything shows", async () => {
  setSideChoice(PERSONAL.id);
  show([], MESSAGES);
  await within(await came()).findByText("Personal parcel");
  expect(within(await came()).queryByText("Order for the first business")).toBeNull();
  expect(within(await came()).getByText("Newsletter nobody placed")).toBeInTheDocument();
});

test("under All every message that came in shows", async () => {
  show([], MESSAGES);
  await within(await came()).findByText("Order for the first business");
  expect(within(await came()).getByText("Personal parcel")).toBeInTheDocument();
});

test("a thread held by two mailboxes is one row, naming the other mailbox that holds it", async () => {
  show([], [mail("m1", "Joint lease renewal", "mail-a", { also_in: ["mail-b"] }), mail("m2", "Something else", "mail-c")]);
  const card = (await screen.findByRole("region", { name: /Came in/ })) as HTMLElement;
  const rows = within(card).getAllByRole("listitem");
  expect(within(card).getAllByText("Joint lease renewal")).toHaveLength(1);
  const shared = rows.find((r) => r.textContent?.includes("Joint lease renewal"))!;
  expect(shared).toHaveTextContent("Inbox, alex@example.com");
  expect(shared).toHaveTextContent("also in Inbox, blake@example.com");
});
