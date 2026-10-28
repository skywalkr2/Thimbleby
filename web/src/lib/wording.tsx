// The wording sheet: every user-facing string comes from here, with overrides from the workspace's config/ui.yaml.
import { createContext, useContext, useMemo, type ReactNode } from "react";
import sheet from "../wording/en.json";
import { plainDates } from "./read";

export type Words = Record<string, string>;
export type Vars = Record<string, string | number>;

const WordsContext = createContext<{ words: Words; base: Vars; overrides: Words; unnamed: boolean; locale: string | undefined }>({
  words: sheet,
  base: {},
  overrides: {},
  unnamed: false,
  locale: undefined,
});

/** The suffix of a variant of an entry used while the assistant still has the default name. */
const UNNAMED = ".unnamed";

/** A value put into a sentence: a text's dates are written as words, so a label made from a title reads as the title does. */
const readable = (value: string | number): string => (typeof value === "string" ? plainDates(value) : String(value));

export function format(words: Words, key: string, vars: Vars = {}): string {
  const template = words[key] ?? key;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => (name in vars ? readable(vars[name]) : match));
}

export function WordingProvider(props: {
  overrides?: Words;
  base?: Vars;
  /** The assistant still has the default name: an entry with an `.unnamed` variant reads that one. */
  unnamed?: boolean;
  /** The language tag whose number format the screens write numbers and amounts of money in; none uses the computer's. */
  locale?: string;
  children: ReactNode;
}) {
  const value = useMemo(
    () => ({
      words: { ...sheet, ...(props.overrides ?? {}) },
      base: props.base ?? {},
      overrides: props.overrides ?? {},
      unnamed: !!props.unnamed,
      locale: props.locale || undefined,
    }),
    [props.overrides, props.base, props.unnamed, props.locale],
  );
  return <WordsContext.Provider value={value}>{props.children}</WordsContext.Provider>;
}

export function useWords() {
  const { words, base, overrides, unnamed, locale } = useContext(WordsContext);
  return useMemo(() => {
    // A workspace's own wording for an entry wins over the sheet's variant for an unnamed assistant.
    const pick = (key: string) => (unnamed && !(key in overrides) && `${key}${UNNAMED}` in words ? `${key}${UNNAMED}` : key);
    const t = (key: string, vars: Vars = {}) => format(words, pick(key), { ...base, ...vars });
    // An entry with a `.zero` form says nothing at all differently for none ("No time between them", never "Only 0 minutes").
    const tn = (key: string, n: number, vars: Vars = {}) =>
      t(`${key}.${n === 0 && `${key}.zero` in words ? "zero" : n === 1 ? "one" : "other"}`, { n, ...vars });
    const has = (key: string) => key in words;
    return { t, tn, has, locale };
  }, [words, base, overrides, unnamed, locale]);
}
