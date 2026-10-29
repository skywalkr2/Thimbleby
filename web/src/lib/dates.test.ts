import { afterEach, expect, test } from "vitest";
import { dayAndTime, inputOn, isAfternoon, momentOf, nextMonday, onTheClock, setClockZone, sinceDay, time, todayOn, whenText } from "./dates";

test("the coming Monday is never the day itself: a Monday holds for the Monday a week on", () => {
  // The 19th of October is a Monday in this year.
  expect(nextMonday(new Date(2026, 9, 19, 9))).toBe("2026-10-26");
  expect(nextMonday(new Date(2026, 9, 20))).toBe("2026-10-26");
  expect(nextMonday(new Date(2026, 9, 23, 23, 59))).toBe("2026-10-26");
  expect(nextMonday(new Date(2026, 9, 24))).toBe("2026-10-26");
  expect(nextMonday(new Date(2026, 9, 25))).toBe("2026-10-26");
  // across a month and a year
  expect(nextMonday(new Date(2026, 11, 30))).toBe("2027-01-04");
});

test("ready since is the weekday for the last six days, the month and day before that, and nothing for today", () => {
  const today = new Date(2026, 9, 22, 15); // a Thursday
  expect(sinceDay("2026-10-20", today)).toBe("Tue");
  expect(sinceDay("2026-10-21", today)).toBe("Wed");
  expect(sinceDay("2026-10-16", today)).toBe("Fri");
  expect(sinceDay("2026-10-15", today)).toBe("Oct 15");
  expect(sinceDay("2026-09-30", today)).toBe("Sep 30");
  expect(sinceDay("2026-10-22", today)).toBe("");
  expect(sinceDay("2026-10-25", today)).toBe("");
  expect(sinceDay(null, today)).toBe("");
});

// ---- the person's own clock ---------------------------------------------------------------------------------------------

const REAL_ZONE = process.env.TZ;
afterEach(() => {
  setClockZone(undefined);
  if (REAL_ZONE === undefined) delete process.env.TZ;
  else process.env.TZ = REAL_ZONE;
});

// One moment, 2:37 PM in London's autumn and 7:37 AM on the west coast of the United States.
const MOMENT = "2026-10-28T14:37:00Z";

test("with the person's zone set, every way of writing a moment gives their clock, whatever the computer's clock is", () => {
  for (const computer of ["UTC", "Asia/Tokyo", "America/New_York"]) {
    process.env.TZ = computer;
    setClockZone("America/Los_Angeles");
    expect(time(new Date(MOMENT)), computer).toBe("7:37 AM");
    expect(dayAndTime(MOMENT), computer).toBe("Wed, Oct 28, 7:37 AM");
    expect(whenText(MOMENT.replace("T", " ")), computer).toBe("Wed, Oct 28, 7:37 AM");
    expect(onTheClock(new Date(MOMENT)), computer).toEqual({ date: "2026-10-28", minutes: 7 * 60 + 37 });
    expect(inputOn(new Date(MOMENT)), computer).toBe("2026-10-28T07:37");
  }
});

test("today is the day on the person's clock: the early hours in Tokyo are still yesterday on the west coast", () => {
  process.env.TZ = "Asia/Tokyo";
  setClockZone("America/Los_Angeles");
  expect(todayOn(new Date("2026-10-29T03:00:00Z"))).toBe("2026-10-28");
  setClockZone("Asia/Tokyo");
  expect(todayOn(new Date("2026-10-29T03:00:00Z"))).toBe("2026-10-29");
});

test("a time typed into a date and time box is read on the person's clock, and goes back to the same text", () => {
  for (const computer of ["UTC", "Asia/Tokyo"]) {
    process.env.TZ = computer;
    setClockZone("America/Los_Angeles");
    expect(momentOf("2026-10-28T07:37")?.toISOString(), computer).toBe("2026-10-28T14:37:00.000Z");
    expect(inputOn(momentOf("2026-10-28T07:37")!), computer).toBe("2026-10-28T07:37");
  }
  // Across the change of clocks in the autumn, and a text that is no moment.
  setClockZone("America/Los_Angeles");
  expect(momentOf("2026-11-01T09:00")?.toISOString()).toBe("2026-11-01T17:00:00.000Z");
  expect(momentOf("not a time")).toBeNull();
});

test("with no zone set, or a name the browser doesn't know, moments stay on the computer's clock", () => {
  process.env.TZ = "UTC";
  setClockZone(undefined);
  expect(time(new Date(MOMENT))).toBe("2:37 PM");
  setClockZone("Narnia/Cair_Paravel");
  expect(time(new Date(MOMENT))).toBe("2:37 PM");
});

test("the afternoon starts at the configured hour on the person's clock", () => {
  setClockZone("UTC");
  const at = (hour: number, minute = 0) => new Date(Date.UTC(2026, 9, 20, hour, minute));
  expect(isAfternoon(at(11, 59), 12)).toBe(false);
  expect(isAfternoon(at(12), 12)).toBe(true);
  expect(isAfternoon(at(12), 14)).toBe(false);
  expect(isAfternoon(at(14), 14)).toBe(true);
  setClockZone("Asia/Tokyo");
  expect(isAfternoon(at(2, 59), 12)).toBe(false);
  expect(isAfternoon(at(3), 12)).toBe(true);
  setClockZone(undefined);
});
