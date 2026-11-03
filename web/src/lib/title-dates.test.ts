import { plainTitle, setTitleWords, shortTitle } from "./title-dates";
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

describe("a short title (X86)", () => {
  beforeEach(() => setTitleWords(12));

  test("a title that fits is left as it is", () => {
    expect(shortTitle("Send the venue list")).toBe("Send the venue list");
  });

  test("a pasted note of three sentences is titled by its first sentence", () => {
    const note = `Send the florist order by ${DUE}. We need a table booked at The Old Mill by 2026-11-10. Decided: Mum will bring the cake and the plates for everyone.`;
    expect(shortTitle(note)).toBe(`Send the florist order by ${day(DUE)}.`);
  });

  test("a long single sentence is cut at a word with an ellipsis, never in the middle of one", () => {
    const long = "Print, sign and mail the form to the council office at P.O. Box 1004 in Springfield before the end of the week";
    const out = shortTitle(long);
    expect(out.endsWith("…")).toBe(true);
    expect(out.split(/\s+/).length).toBeLessThanOrEqual(12);
    expect(long.startsWith(out.slice(0, -1))).toBe(true);
    expect(out).not.toMatch(/[.,;:]…$/);
  });

  test("an abbreviation's stop does not end the sentence", () => {
    const out = shortTitle("Send it to P.O. Box 1004 in Springfield and wait for the stamped copy to come back by post");
    expect(out.startsWith("Send it to P.O. Box 1004")).toBe(true);
  });

  test("a date the meta line shows is left out, so the day is said once and no stop stands before a comma", () => {
    expect(shortTitle(`Get a catering quote by ${DUE}.`, DUE)).toBe("Get a catering quote.");
    expect(shortTitle(`Get a catering quote by ${DUE}.`)).toBe(`Get a catering quote by ${day(DUE)}.`);
    expect(shortTitle("Get a quote by Wed, Nov 4., due Wed, Nov 4")).toBe("Get a quote by Wed, Nov 4, due Wed, Nov 4");
  });

  test("the words allowed come from the configuration", () => {
    setTitleWords(4);
    expect(shortTitle("One two three four five six")).toBe("One two three four…");
  });
});

test("a run of letters with no space in it is cut by its length, so no title is thousands of characters (X86)", () => {
  setTitleWords(12);
  const out = shortTitle("a".repeat(3000));
  expect(out.length).toBeLessThanOrEqual(145);
  expect(out.endsWith("…")).toBe(true);
  expect(shortTitle("Cover finish for the hardcover: matte or soft-touch?")).toBe("Cover finish for the hardcover: matte or soft-touch?");
});
