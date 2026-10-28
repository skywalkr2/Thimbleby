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

/** What a person wrote to say what a business is: its words on one line with the spaces tidied, or nothing when it is empty.
 * It is kept as the side's description and never split into lines or made into projects. */
export function sideSummary(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/** The projects a side holds, one line each, as the screens that list a side show them: a group is its name with the jobs
 * inside it in brackets (`group` words that), a job under the side is its name. Only the two levels setup makes. */
export function insideLines(
  projects: Array<{ id: string; name: string; parent?: string | null }>,
  side: string,
  group: (name: string, jobs: string) => string,
): string[] {
  const under = (id: string) => projects.filter((p) => p.parent === id);
  return under(side).map((p) => {
    const jobs = under(p.id).map((j) => j.name);
    return jobs.length > 0 ? group(p.name, jobs.join(", ")) : p.name;
  });
}
