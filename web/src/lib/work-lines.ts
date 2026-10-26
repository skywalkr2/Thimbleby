// The list a person types or pastes into "what does it work on": one thing to a line, each line a name.

/** The names in a typed or pasted list: one per line, with the bullet or number a pasted list carries taken off, blank lines
 * dropped and a name given twice (in any case) kept once. */
export function workLines(text: string): string[] {
  const seen = new Set<string>();
  const names: string[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const name = raw
      .replace(/^\s*(?:[-*•–]\s+|\d+[.)]\s+)/, "")
      .replace(/\s+/g, " ")
      .trim();
    const key = name.toLowerCase();
    if (!name || seen.has(key)) continue;
    seen.add(key);
    names.push(name);
  }
  return names;
}
