import { expect, test } from "vitest";
import { day } from "./dates";
import { isData, plain, plainDates } from "./read";

test("a date written year-month-day is a day in words, wherever it stands in a text", () => {
  expect(plainDates("Send the venue list by 2026-11-02.")).toBe(`Send the venue list by ${day("2026-11-02")}.`);
  expect(plainDates("From 2026-11-02 to 2026-11-04")).toBe(`From ${day("2026-11-02")} to ${day("2026-11-04")}`);
  expect(plainDates("Nothing to change here")).toBe("Nothing to change here");
});

test("a date with a time is a day and a time, on the person's own clock when it names a zone", () => {
  expect(plainDates("Fabric delivery from Owen, 2026-10-29 10:00")).toMatch(/^Fabric delivery from Owen, .+, 10:00\s?AM$/);
  expect(plainDates("Received 2026-10-28T15:07:36Z")).toMatch(/^Received \w{3}, \w{3} \d{1,2}, \d{1,2}:07\s?[AP]M$/);
  expect(plainDates("Received 2026-10-28T15:07:36Z")).not.toMatch(/2026|T15/);
});

test("something that looks like a date but isn't one is left as written", () => {
  expect(plainDates("Part 2026-13-45 of 12026-11-072")).toBe("Part 2026-13-45 of 12026-11-072");
});

test("a text that is only data is nothing, and a sentence with braces in it is not data", () => {
  expect(isData('[{"kind": "action", "id": "ACT-6", "gone": true}]')).toBe(true);
  expect(isData('{"summary": "The stand-in found nothing"')).toBe(true);
  expect(isData('[ "kind": "action", "id": "ACT-6", "gone": true ]')).toBe(true);
  expect(isData("Reply to [the venue] by Friday")).toBe(false);
  expect(isData("[draft] Hello")).toBe(false);
  expect(plain('{"summary": "x"}')).toBe("");
  expect(plain("By 2026-11-02")).toBe(`By ${day("2026-11-02")}`);
  expect(plain(null)).toBe("");
});

// ---- the assistant's own text as words (sweep X37, X38, X72) ---------------------------------------------------------------

test("a record id in the assistant's text is the record's name, else the kind of thing, and a data dump is left out", async () => {
  const { plainText } = await import("./read");
  const names = new Map([["PER-1", "Robin Sample"]]);
  const name = (id: string) => names.get(id);
  const kind = (prefix: string) => (prefix === "ACT" ? "a to-do" : "an item");
  expect(plainText("Ask PER-1 about ACT-6 and FOO-3.", name, kind)).toBe("Ask Robin Sample about a to-do and an item.");
  expect(plainText('{"id": "ACT-6"}', name, kind)).toBe("");
  expect(plainText(['"ask": "PER-1"', "Moved to 2026-11-09", "(none)"].join("\n"), name, kind)).toBe(plainText("Moved to 2026-11-09", name, kind));
  expect(plainText("Pick [Draft] first", name, kind)).toBe("Pick [Draft] first");
  expect(plainText("", name, kind)).toBe("");
});
