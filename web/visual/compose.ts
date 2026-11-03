// The side-by-side pictures and the difference list. A side-by-side is made by drawing a small page (the mockup on the left, the
// build on the right, each labelled, both at the width they were taken, so at one scale) and taking a picture of it with the
// same browser. No image library is used.
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import type { Browser } from "playwright-core";
import type { Section } from "./mockups.ts";

export interface SideBySide {
  /** The build's picture, an absolute path. */
  build: string;
  /** The mockup's picture bytes. */
  mockup: Buffer;
  /** Cuts the mockup to one state of its sheet; the whole picture when null. */
  crop: Section | null;
  width: number;
  /** The words above each side, apart from "Mockup" and "Build". */
  caption: string;
  /** The file to write, an absolute path. */
  to: string;
}

const escape = (text: string) => text.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

export function composeHtml(spec: Omit<SideBySide, "to">): string {
  const mockup = `data:image/png;base64,${spec.mockup.toString("base64")}`;
  const crop = spec.crop;
  const left = crop
    ? `<div class="crop" style="height:${crop.bottom - crop.top}px"><img src="${mockup}" alt="" style="margin-top:-${crop.top}px"></div>`
    : `<img src="${mockup}" alt="">`;
  const note = crop ? `${spec.caption} (cut from the states sheet)` : spec.caption;
  return `<!doctype html><html><head><meta charset="utf-8"><title>Side by side</title><style>
  body { margin: 0; padding: 20px; background: #6b6b6b; font: 600 16px/1.3 system-ui, sans-serif; color: #fff; }
  .row { display: flex; gap: 24px; align-items: flex-start; }
  figure { margin: 0; width: ${spec.width}px; flex: none; }
  figcaption { padding: 0 0 8px; }
  figcaption b { display: inline-block; background: #fff; color: #222; border-radius: 999px; padding: 2px 12px; margin-right: 10px; }
  img { display: block; width: ${spec.width}px; }
  .crop { width: ${spec.width}px; overflow: hidden; }
  </style></head><body><div class="row">
  <figure><figcaption><b>Mockup</b>${escape(note)}</figcaption>${left}</figure>
  <figure><figcaption><b>Build</b>${escape(spec.caption)}</figcaption><img src="${pathToFileURL(spec.build).href}" alt=""></figure>
  </div></body></html>`;
}

/** Writes one side-by-side picture. */
export async function writeSideBySide(browser: Browser, work: string, spec: SideBySide): Promise<void> {
  mkdirSync(work, { recursive: true });
  const file = join(work, "side-by-side.html");
  writeFileSync(file, composeHtml(spec), "utf8");
  const page = await browser.newPage({ viewport: { width: spec.width * 2 + 64, height: 800 } });
  try {
    await page.goto(pathToFileURL(file).href);
    await page.waitForFunction(() => Array.from(document.images).every((i) => i.complete && i.naturalWidth > 0), null, { timeout: 30_000 });
    mkdirSync(join(spec.to, ".."), { recursive: true });
    await page.screenshot({ path: spec.to, fullPage: true });
  } finally {
    await page.close();
    rmSync(file, { force: true });
  }
}

// ---------------------------------------------------------------- the difference list

export interface Result {
  page: string;
  title: string | null;
  /** The capture's file name, or null when none was made. */
  file: string | null;
  /** The side-by-side's file name, or null when there was no mockup picture to put it beside. */
  sideBySide: string | null;
  /** `1440 night`, for the list. */
  label: string;
  firstScreen: boolean;
  /** Why no capture was made: the entry can't be driven, or its drive failed. */
  problem: { kind: "undrivable" | "failed"; reason: string } | null;
  /** No mockup picture at this width and theme, so nothing to put it beside. */
  noMockup: boolean;
}

const heading = (page: string, title: string | null) => (title ? `${page} · ${title}` : page);

/** The difference list: a section for each page and state with its side-by-side pictures and an empty table, then every state
 * that could not be driven, with the reason. */
export function differencesMarkdown(results: Result[], order: readonly string[], meta: { ref: string; build: string }): string {
  const lines: string[] = [
    "# Differences between the mockups and the build",
    "",
    `Build: ${meta.build}. Mockups: \`${meta.ref}\`. Each picture has the mockup on the left and the build on the right, at the same width.`,
    "For every difference write it in the table, then fix it or say why it differs (an owner's decision, or the mockup being wrong).",
    "",
  ];
  const keys: string[] = [];
  const by = new Map<string, Result[]>();
  for (const r of results) {
    const key = heading(r.page, r.title);
    if (!by.has(key)) {
      by.set(key, []);
      keys.push(key);
    }
    by.get(key)!.push(r);
  }
  const rank = (key: string) => order.indexOf(key.split(" · ")[0]);
  keys.sort((a, b) => rank(a) - rank(b));
  for (const key of keys) {
    const group = by.get(key)!;
    lines.push(`## ${key}`, "");
    const pictures = group.filter((r) => r.sideBySide);
    if (pictures.length) lines.push("Side by side: " + pictures.map((r) => `[${r.label}${r.firstScreen ? " first screen" : ""}](side-by-side/${r.sideBySide})`).join(" · "), "");
    const without = group.filter((r) => r.file && !r.sideBySide);
    if (without.length) lines.push("Captured with no mockup picture to put it beside: " + without.map((r) => `[${r.label}${r.firstScreen ? " first screen" : ""}](${r.file})`).join(" · "), "");
    const problems = group.filter((r) => r.problem);
    if (problems.length) lines.push(`Not captured: ${[...new Set(problems.map((r) => r.problem!.reason))].join("; ")}`, "");
    lines.push("| Difference | Fixed or why it differs |", "|---|---|", "|  |  |", "");
  }
  const unreached = results.filter((r) => r.problem);
  const seen = new Set<string>();
  lines.push("## States that could not be driven", "");
  const rows: string[] = [];
  for (const r of unreached) {
    const key = `${heading(r.page, r.title)}|${r.problem!.kind}|${r.problem!.reason}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push(`| ${heading(r.page, r.title)} | ${r.problem!.kind === "undrivable" ? "Can't be driven yet" : "Tried, and the drive failed"} | ${r.problem!.reason.replace(/\|/g, "/").replace(/\n/g, " ")} |`);
  }
  if (rows.length) lines.push("| Page and state | Why not | Reason |", "|---|---|---|", ...rows, "");
  else lines.push("Every state asked for was driven.", "");
  return lines.join("\n");
}
