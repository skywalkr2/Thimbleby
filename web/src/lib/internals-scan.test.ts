import { expect, test } from "vitest";
import { findInternals } from "../../e2e/internals-scan";

// The scan behind the browser test that no screen shows an internal (e2e/internals.spec.ts) must see each kind it names, and
// leave alone what a person writes in ordinary words.

const SEEN: Array<[string, string]> = [
  ["Made: WEEK-1, an unreviewed draft", "an internal id"],
  ["Told · PER 3: Wed, Oct 28", "an internal id cut apart"],
  ["now 2026-11-02. (none)", "an ISO date"],
  ["Source received 2026-10-28T15:07:36Z", "an ISO time"],
  ["Changed in steward.yaml", "a file name"],
  ["Time zone set to America/Los_Angeles", "a zone id"],
  ["Language en-GB", "a locale code"],
  ['Reginald noted [ "kind": "action", "id": "ACT-6" ]', "JSON"],
  ["Input should be greater than or equal to 0", "a validation phrase"],
  ["String should match pattern", "a validation phrase"],
  ["Due undefined", "a code word"],
];

test.each(SEEN)("%s is found as %s", (text, kind) => {
  expect(findInternals(text).some((found) => found.startsWith(kind))).toBe(true);
});

test("plain words, days in words and a bracketed note are left alone", () => {
  for (const text of [
    "Send the venue list by Mon, Nov 2.",
    "Wed, Oct 28, 8:07 AM",
    "Reply to [the venue] by Friday",
    "Use a number that is 0 or more.",
    "Los Angeles (Pacific time)",
    "English (United Kingdom)",
    "Quarterly review · Thursday",
  ]) {
    expect(findInternals(text)).toEqual([]);
  }
});
