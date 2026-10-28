import { addMonths, gridHours, hourOf, minutesOf, moveBy, placeOverlaps, rangeOf, rememberView, startOfMonth, startOfWeek, storedView, weekdayIndex } from "./calendar";

const MON = [0, 1, 2, 3, 4];

test("a week starts on the configured day and counts weekdays from Monday", () => {
  // The 28th of that month is a Wednesday.
  expect(weekdayIndex("2026-10-28")).toBe(2);
  expect(startOfWeek("2026-10-28", 0)).toBe("2026-10-26");
  expect(startOfWeek("2026-10-26", 0)).toBe("2026-10-26");
  expect(startOfWeek("2026-10-28", 6)).toBe("2026-10-25");
  expect(startOfWeek("2026-10-25", 6)).toBe("2026-10-25");
  expect(startOfMonth("2026-10-28")).toBe("2026-10-01");
});

test("each view's range: a day, the week's working days, the whole week, and six weeks for a month", () => {
  expect(rangeOf("day", "2026-10-28", 0, MON)).toEqual({ first: "2026-10-28", days: 1, shown: ["2026-10-28"] });
  const work = rangeOf("work_week", "2026-10-28", 0, MON);
  expect([work.first, work.days, work.shown[0], work.shown.length, work.shown.at(-1)]).toEqual(["2026-10-26", 7, "2026-10-26", 5, "2026-10-30"]);
  const week = rangeOf("week", "2026-10-28", 6, MON);
  expect([week.first, week.shown.length, week.shown[0], week.shown.at(-1)]).toEqual(["2026-10-25", 7, "2026-10-25", "2026-10-31"]);
  // Working days that don't start on the week's first day are still the working days.
  expect(rangeOf("work_week", "2026-10-28", 6, MON).shown).toEqual(["2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30"]);
  const month = rangeOf("month", "2026-10-28", 0, MON);
  expect([month.first, month.days, month.shown.length, month.shown.at(-1)]).toEqual(["2026-09-28", 42, 42, "2026-11-08"]);
});

test("the arrows move a day, a week or a month, keeping the day of the month where the month has it", () => {
  expect(moveBy("day", "2026-10-28", 1)).toBe("2026-10-29");
  expect(moveBy("day", "2026-10-28", -7)).toBe("2026-10-21");
  expect(moveBy("week", "2026-10-28", 1)).toBe("2026-11-04");
  expect(moveBy("work_week", "2026-10-28", -1)).toBe("2026-10-21");
  expect(moveBy("month", "2026-10-28", 1)).toBe("2026-11-28");
  expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
  expect(addMonths("2026-03-31", -1)).toBe("2026-02-28");
  expect(addMonths("2026-12-15", 1)).toBe("2027-01-15");
});

test("times on the person's clock and the hours of a setting", () => {
  expect(minutesOf("2026-10-26T09:30:00+00:00")).toBe(570);
  expect(minutesOf("2026-10-26")).toBeNull();
  expect(minutesOf(undefined)).toBeNull();
  expect(hourOf("07:00")).toBe(7);
  expect(hourOf("18:30", true)).toBe(19);
  expect(hourOf("19:00", true)).toBe(19);
});

test("the grid shows the configured hours and grows to hold an entry outside them", () => {
  expect(gridHours([], "07:00", "19:00")).toEqual({ from: 7, to: 19 });
  expect(gridHours([{ start: 9 * 60, end: 10 * 60 }], "07:00", "19:00")).toEqual({ from: 7, to: 19 });
  expect(gridHours([{ start: 5 * 60 + 30, end: 6 * 60 }, { start: 21 * 60, end: 22 * 60 + 15 }], "07:00", "19:00")).toEqual({ from: 5, to: 23 });
});

test("entries that overlap share the width side by side, and ones that don't keep all of it", () => {
  const at = (name: string, start: number, end: number) => ({ item: name, start, end });
  const placed = placeOverlaps([at("c", 9 * 60 + 45, 11 * 60), at("a", 9 * 60, 10 * 60), at("b", 9 * 60 + 15, 9 * 60 + 30), at("alone", 13 * 60, 14 * 60)]);
  const by = Object.fromEntries(placed.map((p) => [p.item, [p.col, p.cols]]));
  // a overlaps b and c; b and c don't overlap each other, so they share a column and the cluster has two.
  expect(by).toEqual({ a: [0, 2], b: [1, 2], c: [1, 2], alone: [0, 1] });
  expect(placeOverlaps([])).toEqual([]);
});

test("the view is remembered, and a browser that won't keep it gives the default", () => {
  window.localStorage.clear();
  expect(storedView()).toBe("work_week");
  rememberView("month");
  expect(storedView()).toBe("month");
  window.localStorage.setItem("cockpit:schedule-view", "fortnight");
  expect(storedView()).toBe("work_week");
  const blocked = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw new Error("blocked");
  });
  const set = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("blocked");
  });
  expect(storedView()).toBe("work_week");
  expect(() => rememberView("day")).not.toThrow();
  blocked.mockRestore();
  set.mockRestore();
});
