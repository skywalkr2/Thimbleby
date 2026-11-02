// Searching Settings by the words a person has in mind (design 7.9): what is typed, plus the words the shipped list says find
// the same things ("password" also finds keys and sign-ins), looked for in every setting and in every place of Settings that
// is not a row: a section, an AI account, the backup key and an add-on's keys.
import type { SettingsSection } from "./views";

export type SearchWords = Record<string, string[]>;

/** What a search looks for: the typed text and, for each word of the list that the text holds as whole words (or starts, from
 * three letters), the words that find the same things. Lower case; empty for an empty search. */
export function searchTerms(query: string, words: SearchWords = {}): string[] {
  const typed = query.trim().toLowerCase().replace(/\s+/g, " ");
  if (!typed) return [];
  const terms = new Set([typed]);
  const padded = ` ${typed} `;
  for (const [word, related] of Object.entries(words)) {
    const key = word.trim().toLowerCase();
    if (!key) continue;
    if (padded.includes(` ${key} `) || (typed.length >= 3 && key.startsWith(typed))) {
      for (const r of related) terms.add(r.trim().toLowerCase());
    }
  }
  terms.delete("");
  return [...terms];
}

/** Whether any of the texts holds any of the terms, ignoring capitals. */
export const holdsAny = (texts: string[], terms: string[]): boolean =>
  terms.length > 0 && texts.some((text) => terms.some((term) => text.toLowerCase().includes(term)));

/** A place in Settings that is not a setting's row: where it opens, what it is called, and a line about what is there. */
export interface Place {
  id: string;
  section: SettingsSection;
  label: string;
  about: string;
}

/** The places a search finds, in the order given. */
export function placesFound(places: Place[], query: string, words: SearchWords = {}): Place[] {
  const terms = searchTerms(query, words);
  return places.filter((place) => holdsAny([place.label, place.about], terms));
}
