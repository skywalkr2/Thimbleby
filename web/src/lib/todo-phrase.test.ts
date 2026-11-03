import { splitDatePhrase, type PhraseWords } from "./todo-phrase";

// A date at the end of a to-do's title: where it starts is found by rules from the locale's names and the sheet's words; what day
// it means is the server's one reader of due dates (tests/test_add_todo.py holds the table of days).

const words: PhraseWords = {
  today: "today",
  tomorrow: "tomorrow",
  lead: ["by", "on", "before", "until", "due by", "due"],
  next: "next",
  week: "week",
  the: "the",
  ordinals: ["st", "nd", "rd", "th"],
};

const cases: Array<[string, { title: string; phrase: string } | null]> = [
  ["Send the headcount by Friday", { title: "Send the headcount", phrase: "by Friday" }],
  ["Send the headcount Friday", { title: "Send the headcount", phrase: "Friday" }],
  ["Call the printer tomorrow", { title: "Call the printer", phrase: "tomorrow" }],
  ["Call the printer by tomorrow.", { title: "Call the printer", phrase: "by tomorrow" }],
  ["Pay the deposit on the 12th", { title: "Pay the deposit", phrase: "on the 12th" }],
  ["Pay the deposit the 3rd", { title: "Pay the deposit", phrase: "the 3rd" }],
  ["Book the room next week", { title: "Book the room", phrase: "next week" }],
  ["Book the room by next Friday", { title: "Book the room", phrase: "by next Friday" }],
  ["Mail the forms before Nov 12", { title: "Mail the forms", phrase: "before Nov 12" }],
  ["Mail the forms 12 Nov", { title: "Mail the forms", phrase: "12 Nov" }],
  ["Mail the forms by November 12, 2026", { title: "Mail the forms", phrase: "by November 12, 2026" }],
  ["Mail the forms due 2026-11-12", { title: "Mail the forms", phrase: "due 2026-11-12" }],
  ["Review the draft - Friday", { title: "Review the draft", phrase: "Friday" }],
  ["Review the draft by Wed", { title: "Review the draft", phrase: "by Wed" }],
  // No date at the end: the title is left whole.
  ["Call the printer", null],
  ["Friday night plans", null],
  ["Read chapter 12", null],
  ["Meet Wed", null],
  ["Send the 5th report", null],
  ["Plan the week", null],
  // A date alone leaves no title, so nothing is split.
  ["tomorrow", null],
  ["by Friday", null],
  ["", null],
];

test.each(cases)("%s", (input, want) => {
  expect(splitDatePhrase(input, words, "en-US")).toEqual(want);
});
