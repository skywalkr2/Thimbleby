import { labelWidth, packLane, TOUCH } from "./timeline";

const one = (title: string, start: string) => ({ title, start, end: start });

test("a mark on one day takes room for its title, so a neighbor goes to the next row", () => {
  const { placed, rows } = packLane([one("Send the quote", "2026-11-03"), one("Pay the deposit", "2026-11-04")], "2026-11-02", 14, 40, (i) => i.title);
  expect(placed[0].w).toBe(TOUCH + labelWidth("Send the quote"));
  expect(placed[0].point).toBe(true);
  expect(rows).toBe(2);
});

test("a title that has no room on the right goes on the mark's left", () => {
  const { placed } = packLane([one("Last day of the quarter", "2026-11-15")], "2026-11-02", 14, 40, (i) => i.title);
  expect(placed[0].flip).toBe(true);
  expect(placed[0].x + placed[0].w).toBeLessThanOrEqual(14 * 40);
});

test("with no titles asked for, a one-day mark is only its own day's width", () => {
  const { placed } = packLane([one("Send the quote", "2026-11-03")], "2026-11-02", 14, 10);
  expect(placed[0].w).toBe(TOUCH);
  expect(placed[0].point).toBeUndefined();
});
