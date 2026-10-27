// A fact as one line (design 6.32, "Note titles and facts"): a fact states the world ("The offsite is on a Friday"); when it
// is one person's claim it keeps who said it ("Pat says the offsite is on a Friday"). The first word is lower-cased only
// when it is one of the plain words the wording sheet lists, so a name or an acronym at the start is never changed.
import { plainTitle } from "./title-dates";
import { useWords } from "./wording";

export function useFactLine(): (text: string, saidBy?: string | null) => string {
  const { t } = useWords();
  const plain = new Set(t("fact.says.lowercase_words").split(/\s+/).filter(Boolean));
  return (text, saidBy) => {
    const body = plainTitle(text);
    if (!saidBy) return body;
    const first = body.split(/\s+/, 1)[0] ?? "";
    const lowered = plain.has(first.toLowerCase()) ? body.charAt(0).toLowerCase() + body.slice(1) : body;
    return t("fact.says", { name: saidBy, text: lowered.replace(/[.!?]+$/, "") });
  };
}
