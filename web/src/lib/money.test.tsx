import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { formatNumber, parseAmount, useAmount, useEstimate, useMoney, usePrice, useSmallMoney, useSpent, useTotal, useWriteAmount } from "./money";
import { WordingProvider } from "./wording";

const wrap = (locale?: string, overrides: Record<string, string> = {}) =>
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <WordingProvider locale={locale} overrides={overrides}>
        {children}
      </WordingProvider>
    );
  };

test("an amount is written to two decimals in the number format of the workspace's language", () => {
  const us = renderHook(() => useWriteAmount(), { wrapper: wrap("en-US") }).result.current;
  expect(us(1.5)).toBe("$1.50");
  expect(us(1234.5)).toBe("$1,234.50");
  // A language that writes a comma before the cents gets one; the sign is still the sheet's.
  const de = renderHook(() => useWriteAmount(), { wrapper: wrap("de-DE") }).result.current;
  expect(de(1234.5)).toBe("$1.234,50");
});

test("one writer serves every formatter: totals, estimates, small prices, amounts the person sets and what was spent", () => {
  const { result } = renderHook(() => ({ money: useMoney(), total: useTotal(), estimate: useEstimate(), small: useSmallMoney(), amount: useAmount(), spent: useSpent() }), {
    wrapper: wrap("en-US"),
  });
  const r = result.current;
  expect(r.money(0.8)).toBe("$0.80");
  expect(r.money(0.001)).toBe("less than a cent");
  expect(r.total(0)).toBe("$0.00");
  expect(r.total(0.001)).toBe("$0.00");
  expect(r.estimate(0.8)).toBe("About $0.80");
  expect(r.estimate(null)).toBeNull();
  expect(r.small(0.004)).toBe("$0.004");
  expect(r.small(0.25)).toBe("$0.25");
  expect(r.small(3)).toBe("$3.00");
  expect(r.amount(2)).toBe("$2");
  expect(r.amount(0.1)).toBe("$0.10");
  expect(r.spent(0.5, [0.4, 0.6])).toBe("Cost $0.50, estimated at $0.40 to $0.60");
});

test("the sign and the words around an amount are the sheet's, so a workspace can word them its own way", () => {
  const write = renderHook(() => useWriteAmount(), { wrapper: wrap("en-US", { "money.usd": "USD {amount}" }) }).result.current;
  expect(write(2)).toBe("USD 2.00");
});

test("a price in another currency names it from the sheet; US dollars are written like any amount", () => {
  const price = renderHook(() => usePrice(), { wrapper: wrap("en-US") }).result.current;
  expect(price(5, "USD")).toBe("$5.00");
  expect(price(5, "")).toBe("$5.00");
  expect(price(5, "eur")).toBe("5.00 eur");
});

test("an unknown language tag is written plainly, never an error", () => {
  expect(formatNumber(1.5, "not a tag")).toBe("1.50");
});

test.each([
  ["1.5", undefined, 1.5],
  ["$1.50", undefined, 1.5],
  [" $ 1.50 ", "en-US", 1.5],
  ["US$1,234.50", "en-US", 1234.5],
  ["1,234", "en-US", 1234],
  ["0.10", "en-US", 0.1],
  [".5", "en-US", 0.5],
  ["2", "en-US", 2],
  ["1,50", "de-DE", 1.5],
  ["1.234,50", "de-DE", 1234.5],
  ["$1,50", "de-DE", 1.5],
  // A plain number with a point is read as it is, in any language.
  ["1.5", "de-DE", 1.5],
  ["-2", "en-US", -2],
])("%s typed in %s is the amount %d", (text, locale, amount) => {
  expect(parseAmount(text, locale)).toBe(amount);
});

// A comma that does not group thousands in threes is not part of an amount where a point is the decimal mark.
test.each(["", "abc", "$", "1.2.3,4,5x", "--", "1,50", "1,5", "$1,000,00"])("%j is not an amount", (text) => {
  expect(parseAmount(text, "en-US")).toBeNull();
});

test("'1.5' and '$1.50' are the same amount, in any language", () => {
  for (const locale of ["en-US", "en-GB", "de-DE", "fr-FR", undefined]) {
    expect(parseAmount("1.5", locale)).toBe(parseAmount("$1.50", locale));
  }
});
