// index.md of an inventory capture: every screen and state with links to its pictures, and the ones that couldn't be captured
// with their reasons. Pure functions, checked by names.test.ts.
import { captureName, inventorySizes, slug, SIZES } from "./names.ts";

export interface Listed {
  page: string;
  title?: string;
  label: string;
  group: string;
  main?: boolean;
  widths?: number[];
  undrivable?: string;
}

export interface Problem {
  page: string;
  title: string | null;
  /** The window, like "1440 day"; empty when the entry has no drive at all. */
  label: string;
  kind: "undrivable" | "failed";
  reason: string;
}

const sizeName = (s: { width: number; theme: string }) => `${s.width} ${s.theme}`;

export function indexMarkdown(entries: readonly Listed[], taken: ReadonlySet<string>, problems: readonly Problem[], meta: { build: string; sizes?: string }): string {
  const columns = SIZES.map(sizeName);
  const reached = entries.filter((e) => SIZES.some((s) => taken.has(captureName(e.page, e.title ? slug(e.title) : null, s))));
  const lines: string[] = [
    "# Screen inventory",
    "",
    `Build: ${meta.build}. ${reached.length} of ${entries.length} screens and states have pictures (${taken.size} pictures); ${problems.length} problems are listed at the end.`,
    "",
    "Each picture is the whole screen in that state (a dialog, drawer, sheet or menu is the window as it shows), named `<screen>[-<state>]-<theme>-<width>.png`. A dash means no picture was made at that size: either the size is not part of the plan for that screen (390 night is for the main screens only) or the capture is listed under \"Not captured\".",
    "",
  ];
  const groups = [...new Set(entries.map((e) => e.group))];
  for (const group of groups) {
    lines.push(`## ${group}`, "", `| Screen | State | ${columns.join(" | ")} |`, `|---|---|${columns.map(() => "---").join("|")}|`);
    for (const e of entries.filter((x) => x.group === group)) {
      const planned = new Set(inventorySizes(e, meta.sizes).map(sizeName));
      const cells = SIZES.map((s) => {
        const file = captureName(e.page, e.title ? slug(e.title) : null, s);
        if (taken.has(file)) return `[view](${file})`;
        return planned.has(sizeName(s)) ? "not captured" : "–";
      });
      lines.push(`| ${e.label} (\`${e.page}\`) | ${e.title ?? ""} | ${cells.join(" | ")} |`);
    }
    lines.push("");
  }
  lines.push("## Not captured", "");
  if (problems.length === 0) lines.push("Every screen and state was captured.", "");
  else {
    lines.push("| Screen | State | Window | Why |", "|---|---|---|---|");
    for (const p of problems) lines.push(`| \`${p.page}\` | ${p.title ?? ""} | ${p.label || "all"} | ${p.kind === "undrivable" ? "can't be reached: " : "the drive stopped: "}${p.reason.replace(/\|/g, "/").replace(/\n/g, " ")} |`);
    lines.push("");
  }
  return lines.join("\n");
}
