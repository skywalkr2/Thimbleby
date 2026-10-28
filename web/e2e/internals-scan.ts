// What counts as an internal on screen (internals.spec.ts): the shapes of text a person was never meant to read. The scan
// is a function of the text alone.

/** Record id prefixes, which also show with a space where an id was cut apart ("PER 3"). */
const PREFIXES = "ACT|ANS|AUD|COPY|EVT|FACT|FILE|GLOSS|JOBRUN|LES|LIST|LOOK|NOTE|ORG|PCNT|PER|PRJ|REM|REQ|ROUTE|RPT|RULE|RUN|SAMP|SER|SETCHG|SETPROP|SIG|SLOOK|SNAP|SRC|STYLE|TEAM|TOOL|TXT|WEEK|WRUN|XACT|XSY";

export const INTERNALS: Array<{ name: string; pattern: RegExp }> = [
  { name: "an internal id", pattern: /\b[A-Z]+-\d+\b/ },
  { name: "an internal id cut apart", pattern: new RegExp(`\\b(?:${PREFIXES})\\s\\d+\\b`) },
  { name: "an ISO date", pattern: /\b\d{4}-\d{2}-\d{2}\b/ },
  { name: "an ISO time", pattern: /\b\d{2}:\d{2}:\d{2}\b|\d{2}-\d{2}T\d{2}:\d{2}/ },
  { name: "a file name", pattern: /\b[\w-]+\.(?:ya?ml|json)\b/i },
  { name: "a zone id", pattern: /\b(?:America|Europe|Asia|Africa|Australia|Pacific|Atlantic|Indian|Antarctica|Etc)\/[A-Za-z_]+/ },
  { name: "a locale code", pattern: /\b[a-z]{2}-[A-Z]{2}\b/ },
  { name: "JSON", pattern: /[{}]|"\w+"\s*:/ },
  { name: "a validation phrase", pattern: /\b(?:Input should|String should|Field required|value is not a valid|Value error|ensure this value|Extra inputs|Input is not)\b/i },
  { name: "a code word", pattern: /\bundefined\b|\bNaN\b|\[object Object\]|\(empty input\)/ },
];

/** The internals in a text, each as a name and the words around it (every one, once). */
export function findInternals(text: string): string[] {
  const found = new Set<string>();
  for (const { name, pattern } of INTERNALS) {
    const all = new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`);
    for (const match of text.matchAll(all)) {
      const around = text.slice(Math.max(0, match.index - 30), match.index + match[0].length + 30).replace(/\s+/g, " ");
      found.add(`${name}: ${match[0]} (“${around}”)`);
    }
  }
  return [...found];
}
