// Amounts of money: the one place an amount is written or read. Every amount on screen goes through `useWriteAmount`: the
// number follows the number format of the workspace's language (its decimal mark and its thousands), and the sign and the
// words around it come from the wording sheet (`money.usd`, so a workspace can word them its own way). A money setting is
// marked once in the schema (`money` on its item); a person may type it with or without the sign, in their own number
// format: "1.5" and "$1.50" are the same amount.
import { useWords } from "./wording";

/** A number in a number format with between `least` and `most` decimals. A language tag the computer doesn't know is
 * written plainly, never an error. */
export function formatNumber(value: number, locale: string | undefined, least = 2, most = least): string {
  const top = Math.max(least, most);
  try {
    return new Intl.NumberFormat(locale, { minimumFractionDigits: least, maximumFractionDigits: top }).format(value);
  } catch {
    return value.toFixed(least);
  }
}

/** A plain number, with a point before the cents: "2", "1.5", ".5", and "1." while it is being typed. */
const PLAIN = /^-?(\d+\.?\d*|\.\d+)$/;

/** The mark a number format puts before the cents: a point or a comma. */
function decimalMark(locale: string | undefined): "." | "," {
  try {
    const found = new Intl.NumberFormat(locale).formatToParts(1.5).find((p) => p.type === "decimal")?.value;
    return found === "," ? "," : ".";
  } catch {
    return ".";
  }
}

/** The amount someone typed, or null when it isn't one. The sign, letters and spaces are left out; a plain number with a
 * point ("1.5") is read as it is, whatever the language; otherwise the number format's own decimal mark is the decimal and
 * the other mark is a group mark. A lone other mark before one or two digits is the decimal too ("1,5"). */
export function parseAmount(text: string, locale?: string): number | null {
  const kept = text.replace(/[^0-9.,-]/g, "");
  if (!/\d/.test(kept)) return null;
  if (PLAIN.test(kept)) return Number(kept);
  // Any other group mark (an apostrophe, a narrow space) was left out above, so only a point and a comma remain.
  const mark = decimalMark(locale);
  const other = mark === "." ? "," : ".";
  let normal: string;
  if (kept.includes(mark)) {
    const at = kept.lastIndexOf(mark);
    normal = `${kept.slice(0, at).split(other).join("")}.${kept.slice(at + 1)}`;
  } else if (kept.includes(other)) {
    const at = kept.lastIndexOf(other);
    const tail = kept.slice(at + 1);
    const lone = kept.split(other).length === 2 && tail.length >= 1 && tail.length <= 2;
    normal = lone ? `${kept.slice(0, at)}.${tail}` : kept.split(other).join("");
  } else {
    normal = kept;
  }
  return PLAIN.test(normal) ? Number(normal) : null;
}

/** The one writer of an amount: the number in the person's number format, inside the sheet's words for an amount. Every
 * other formatter here, and every screen, goes through it. */
export function useWriteAmount() {
  const { t, locale } = useWords();
  return (usd: number, least = 2, most = least) => t("money.usd", { amount: formatNumber(usd, locale, least, most) });
}

/** An amount to two decimals, or "less than a cent" when it would round to nothing. */
export function useMoney() {
  const { t } = useWords();
  const write = useWriteAmount();
  return (usd: number) => (usd < 0.005 ? t("money.under_cent") : write(usd));
}

/** A total to two decimals; zero is $0.00 and a sum under a cent is still shown as an amount. */
export function useTotal() {
  return useWriteAmount();
}

/** "About $0.80" for an estimate, or null when there isn't one. */
export function useEstimate() {
  const { t } = useWords();
  const money = useMoney();
  return (usd: number | null | undefined) =>
    usd == null ? null : usd < 0.005 ? t("cost.under_cent") : t("cost.about", { amount: money(usd) });
}

/** What a finished request cost beside what it was estimated to cost, or null when nothing priced ran. */
export function useSpent() {
  const { t } = useWords();
  const money = useMoney();
  return (spent: number | null | undefined, range: number[] | null | undefined) => {
    if (spent == null) return null;
    const [low, high] = range ?? [];
    if (low == null) return t("cost.spent", { spent: money(spent) });
    if (high == null || money(high) === money(low)) return t("cost.spent_estimated", { spent: money(spent), low: money(low) });
    return t("cost.spent_range", { spent: money(spent), low: money(low), high: money(high) });
  };
}

/** An amount with at least two significant digits, so a small price is not lost to rounding: 0.004 stays 0.004. */
export function useSmallMoney() {
  const write = useWriteAmount();
  return (usd: number) => write(usd, 2, usd > 0 ? Math.min(8, Math.max(2, 1 - Math.floor(Math.log10(usd)))) : 2);
}

/** An amount the person sets, as they would write it: 2 stays "$2" and 0.1 reads "$0.10". */
export function useAmount() {
  const write = useWriteAmount();
  return (usd: number) => write(usd, Number.isInteger(usd) ? 0 : 2, 2);
}

/** An amount in the currency a catalog names: US dollars like any other, another currency with its code from the sheet. */
export function usePrice() {
  const { t, locale } = useWords();
  const write = useWriteAmount();
  return (value: number, currency?: string | null) =>
    !currency || currency.toUpperCase() === "USD" ? write(value) : t("money.other", { amount: formatNumber(value, locale), currency });
}

/** Reads what is typed into a money box in the workspace's number format. */
export function useParseAmount() {
  const { locale } = useWords();
  return (text: string) => parseAmount(text, locale);
}
