import { expect, test } from "vitest";
import { settingChoices, settingValue, type SettingWordsContext } from "./setting-words";
import { zoneLabel } from "./time-zones";

// A setting's value is said the way its own screen says it, in the line after a save as much as in its field: a city, a
// language, a person, a tier, an amount of money and the sheet's word for a choice, never the code the file holds.

const sheet: Record<string, string> = {
  "settings.option.steward.brief.weekly_day.saturday": "Saturday",
  "settings.empty": "none",
  "settings.yes": "Yes",
  "settings.no": "No",
};
const context: SettingWordsContext = {
  t: (key) => sheet[key] ?? key,
  has: (key) => key in sheet,
  writeAmount: (amount) => `$${amount.toFixed(2)}`,
  tierName: (tier) => (tier === "routine" ? "Everyday" : tier),
  personName: (id) => (id === "PER-3" ? "Sam Okoro" : id),
};

test("a time zone is its city, a language its name, a person their name, a tier its plain name", () => {
  expect(settingValue({ key: "workspace.time_zone", type: "choice", choices: "time_zones", options: ["America/Los_Angeles"] }, "America/Los_Angeles", context)).toBe(zoneLabel("America/Los_Angeles"));
  expect(settingValue({ key: "workspace.language", type: "choice", choices: "languages", options: ["en-GB", "en-US"] }, "en-GB", context)).toMatch(/English.*United Kingdom/);
  expect(settingValue({ key: "workspace.user.person", type: "choice", choices: "people", options: ["PER-3"] }, "PER-3", context)).toBe("Sam Okoro");
  expect(settingValue({ key: "ai.tiers.pick", type: "choice", choices: "tiers", options: ["routine"] }, "routine", context)).toBe("Everyday");
});

test("a choice the sheet words is that word, and an amount of money is written as money", () => {
  expect(settingValue({ key: "steward.brief.weekly_day", type: "choice", options: ["saturday"] }, "saturday", context)).toBe("Saturday");
  expect(settingValue({ key: "ai.budgets.per_day_usd", type: "number", money: true }, 1.5, context)).toBe("$1.50");
});

test("a value with no label of its own is said as the sheet says values", () => {
  expect(settingValue({ key: "x.flag", type: "yes_no" }, true, context)).toBe("Yes");
  expect(settingValue({ key: "x.text", type: "text" }, "", context)).toBe("none");
  expect(settingChoices({ key: "x.pick", options: ["a", "b"] }, context).map((c) => c.label)).toEqual(["a", "b"]);
});
