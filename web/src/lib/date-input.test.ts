import { addDay, dateOrder, parseDay, parseTime, timesOfDay } from "./date-input";

const words = { today: "today", tomorrow: "tomorrow", yesterday: "yesterday" };
const today = "2026-11-03"; // a Tuesday
const us = (text: string) => parseDay(text, { today, locale: "en-US", words });
const gb = (text: string) => parseDay(text, { today, locale: "en-GB", words });

test("the order of a date follows the locale", () => {
  expect(dateOrder("en-US")).toBe("mdy");
  expect(dateOrder("en-GB")).toBe("dmy");
  expect(dateOrder("sv-SE")).toBe("ymd");
});

test("a date is read as the locale writes it, with the year or without", () => {
  expect(us("10/28/2026")).toBe("2026-10-28");
  expect(us("10/28/26")).toBe("2026-10-28");
  expect(us("10/28")).toBe("2026-10-28");
  expect(us("1.5.2027")).toBe("2027-01-05");
  expect(gb("5/1/2027")).toBe("2027-01-05");
  expect(gb("28/10")).toBe("2026-10-28");
  // The other order is read only where the locale's own makes no day.
  expect(us("28/10/2026")).toBe("2026-10-28");
  expect(us("2026-10-28")).toBe("2026-10-28");
  expect(us("2026/10/28")).toBe("2026-10-28");
});

test("month names, with a weekday, an ordinal or the day first", () => {
  expect(us("Oct 28")).toBe("2026-10-28");
  expect(us("October 28, 2026")).toBe("2026-10-28");
  expect(us("Wed, Oct 28, 2026")).toBe("2026-10-28");
  expect(us("28 Oct 2026")).toBe("2026-10-28");
  expect(us("oct 28th")).toBe("2026-10-28");
  expect(us("sept 3")).toBe("2026-09-03");
});

test("the relative words and the weekdays", () => {
  expect(us("today")).toBe("2026-11-03");
  expect(us("Tomorrow")).toBe("2026-11-04");
  expect(us("yesterday")).toBe("2026-11-02");
  expect(us("friday")).toBe("2026-11-06");
  // A weekday is never today itself: the coming one.
  expect(us("tue")).toBe("2026-11-10");
});

test("what is no day is none", () => {
  for (const text of ["", "   ", "soon", "2/30/2026", "13/13/2026", "Oct", "Oct 99", "1/2/3/4", "Foo 12"]) expect(us(text)).toBeNull();
});

test("a time is read in each form a person writes it", () => {
  const cases: Record<string, string> = { "9": "09:00", "9:30": "09:30", "930": "09:30", "0930": "09:30", "9.30": "09:30", "9 pm": "21:00", "9pm": "21:00", "9:30 pm": "21:30", "9:30 PM": "21:30", "12 am": "00:00", "12:15 am": "00:15", "12 pm": "12:00", "21:30": "21:30", "21": "21:00", "0": "00:00", "23:59": "23:59" };
  for (const [text, want] of Object.entries(cases)) expect(parseTime(text), text).toBe(want);
  for (const text of ["", "25", "9:60", "13 pm", "0 am", "ab", "9:3", "930pm5"]) expect(parseTime(text), text).toBeNull();
});

test("the times of a day at a step", () => {
  expect(timesOfDay(15)).toHaveLength(96);
  expect(timesOfDay(30).slice(0, 3)).toEqual(["00:00", "00:30", "01:00"]);
  expect(timesOfDay(60).at(-1)).toBe("23:00");
});

test("days are added across months and years", () => {
  expect(addDay("2026-12-31", 1)).toBe("2027-01-01");
  expect(addDay("2026-03-01", -1)).toBe("2026-02-28");
});
