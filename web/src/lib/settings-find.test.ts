import { holdsAny, placesFound, searchTerms } from "./settings-find";

const WORDS = { password: ["key", "sign in"], "sign out": ["sign in", "connection"], money: ["spend"] };

test("a search is what was typed plus what the list says finds the same things, for a whole word or phrase or the start of one", () => {
  expect(searchTerms("Password", WORDS)).toEqual(["password", "key", "sign in"]);
  expect(searchTerms("  reset   password  ", WORDS)).toEqual(["reset password", "key", "sign in"]);
  expect(searchTerms("sign out", WORDS)).toEqual(["sign out", "sign in", "connection"]);
  expect(searchTerms("pass", WORDS)).toEqual(["pass", "key", "sign in"]);
  // Two letters are too few to be the start of a word, and a word inside another word is not that word.
  expect(searchTerms("pa", WORDS)).toEqual(["pa"]);
  expect(searchTerms("moneyed", WORDS)).toEqual(["moneyed"]);
  expect(searchTerms("", WORDS)).toEqual([]);
  expect(searchTerms("anything")).toEqual(["anything"]);
});

test("texts are searched ignoring capitals, and an empty search holds nothing", () => {
  expect(holdsAny(["The Backup KEY"], ["key"])).toBe(true);
  expect(holdsAny(["The backup"], ["key"])).toBe(false);
  expect(holdsAny(["anything"], [])).toBe(false);
});

test("places are found by their name or what is said about them", () => {
  const places = [
    { id: "a", section: "backups" as const, label: "Backup key", about: "The password that locks your copies." },
    { id: "b", section: "connections" as const, label: "Connections", about: "The accounts you have signed in to." },
  ];
  expect(placesFound(places, "password", WORDS).map((p) => p.id)).toEqual(["a"]);
  expect(placesFound(places, "sign out", { ...WORDS, "sign out": ["connection"] }).map((p) => p.id)).toEqual(["b"]);
  expect(placesFound(places, "nothing like it", WORDS)).toEqual([]);
});
