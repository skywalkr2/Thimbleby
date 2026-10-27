import { plainTitle } from "./title-dates";
import { day } from "./dates";

const DUE = "2026-11-02";

test("a due date the meta line already shows is left out of the title", () => {
  expect(plainTitle(`Send the venue list by ${DUE}.`, DUE)).toBe("Send the venue list.");
  expect(plainTitle(`Send the headcount by ${DUE}`, `${DUE}T00:00:00`)).toBe("Send the headcount");
});

test("a date the meta line doesn't show is written as a day", () => {
  expect(plainTitle(`Send the venue list by ${DUE}.`)).toBe(`Send the venue list by ${day(DUE)}.`);
  expect(plainTitle(`Send the venue list by ${DUE}.`, "2026-11-09")).toBe(`Send the venue list by ${day(DUE)}.`);
});

test("a date in the middle of a title is written as a day, and a title without one is unchanged", () => {
  expect(plainTitle(`By ${DUE}, send the list`, DUE)).toBe(`By ${day(DUE)}, send the list`);
  expect(plainTitle("Send the venue list", DUE)).toBe("Send the venue list");
  expect(plainTitle(DUE, DUE)).toBe(day(DUE));
});
