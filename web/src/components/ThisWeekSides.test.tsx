import { expect, test } from "vitest";
import type { S } from "../lib/api";
import { weekOn } from "./ThisWeek";

// The week narrowed to one side (design 6.32, 7.8): what is due, who is waiting and the meetings on that side or on none. A
// person waited on from two sides is one row under All (the counts added) and only that side's count under a side.

type Week = S["ThisWeekView"];

const meeting = (title: string, side: string | null): Week["meetings"][number] => ({ snapshot: title, source: "cal", title, start: "2026-10-29T12:00:00+00:00", all_day: false, cancelled: false, days: ["2026-10-29"], own: false, open_items: 0, side });
const due = (action: string, side: string | null): Week["due"][number] => ({ action, text: action, due: "2026-10-30", owners: [], mine: true, kind: "due", side });

const week: Week = {
  first: "2026-10-28",
  last: "2026-10-30",
  due: [due("Pay the printer", "PRJ-3"), due("Book the dentist", "PRJ-1"), due("Renew the permit", null)],
  waiting: [
    { person: "PER-4", person_name: "Gideon Haverly", count: 2, due: "2026-10-30", side: "PRJ-3" },
    { person: "PER-4", person_name: "Gideon Haverly", count: 1, due: "2026-10-29", side: "PRJ-1" },
    { person: "PER-5", person_name: "Perpetua Corliss", count: 1, due: null, side: "PRJ-2" },
  ],
  meetings: [meeting("Supplier call", "PRJ-3"), meeting("Team planning", "PRJ-2"), meeting("Open day", null)],
};

test("under All everything shows and one person waited on from two sides is one row with the counts added", () => {
  const all = weekOn(week, "all");
  expect(all.due).toHaveLength(3);
  expect(all.meetings).toHaveLength(3);
  expect(all.waiting).toEqual([
    expect.objectContaining({ person: "PER-4", count: 3, due: "2026-10-29" }),
    expect.objectContaining({ person: "PER-5", count: 1 }),
  ]);
});

test("under a side only what is on it shows, and what is on no side shows under every choice", () => {
  const business = weekOn(week, "PRJ-3");
  expect(business.due.map((d) => d.action)).toEqual(["Pay the printer", "Renew the permit"]);
  expect(business.meetings.map((m) => m.title)).toEqual(["Supplier call", "Open day"]);
  expect(business.waiting).toEqual([expect.objectContaining({ person: "PER-4", count: 2 })]);
  const personal = weekOn(week, "PRJ-1");
  expect(personal.waiting).toEqual([expect.objectContaining({ person: "PER-4", count: 1 })]);
  expect(personal.meetings.map((m) => m.title)).toEqual(["Open day"]);
});
