// How a capture is named, which mockup picture it sits beside, and how the options choose what to capture. Pure
// functions, no browser and no files, so they are checked by a unit test (names.test.ts).

export type Theme = "day" | "night";

/** One way of looking at a page: a window width, a theme, and whether it is the first screen only (a phone's fold). */
export interface Size {
  width: number;
  height: number;
  theme: Theme;
}

/** The reviewer's widths and themes: 1440 day and night, 1024 day, 390 day and night. */
export const SIZES: readonly Size[] = [
  { width: 1440, height: 900, theme: "day" },
  { width: 1440, height: 900, theme: "night" },
  { width: 1024, height: 768, theme: "day" },
  { width: 390, height: 844, theme: "day" },
  { width: 390, height: 844, theme: "night" },
];

/** The widths at which a first-screen picture (the window only, not the whole page) is also taken. */
export const FIRST_SCREEN_WIDTHS: readonly number[] = [390];

/** A name safe in a file name: lower case, letters and digits, one dash between runs of anything else. */
export function slug(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** `<page>[-<state>]-<theme>-<width>[-screen].png`, the name of a capture. */
export function captureName(page: string, state: string | null, size: Pick<Size, "width" | "theme">, firstScreen = false): string {
  return `${page}${state ? `-${state}` : ""}-${size.theme}-${size.width}${firstScreen ? "-screen" : ""}.png`;
}

/** `<page>-<theme>-<width>[-screen].png`, the name of the mockup picture of a page (a state is a part of its sheet). */
export function mockupName(page: string, size: Pick<Size, "width" | "theme">, firstScreen = false): string {
  return `${page}-${size.theme}-${size.width}${firstScreen ? "-screen" : ""}.png`;
}

/** The mockup picture that goes with a capture, or null when the reviewer drew none at that width and theme. */
export function matchMockup(available: ReadonlySet<string>, page: string, size: Pick<Size, "width" | "theme">, firstScreen = false): string | null {
  const name = mockupName(page, size, firstScreen);
  return available.has(name) ? name : null;
}

/** The picture names in a listing of the mockups' folder (the output of `git ls-tree`), by file name. */
export function picturesIn(listing: string): Set<string> {
  const names = new Set<string>();
  for (const line of listing.split("\n")) {
    const match = /(?:^|\/)png\/([^/]+\.png)$/.exec(line.trim());
    if (match) names.add(match[1]);
  }
  return names;
}

/** `1440-day` to a size; throws on anything else. */
export function parseSize(text: string): Size {
  const match = /^(\d+)-(day|night)$/.exec(text.trim());
  if (!match) throw new Error(`"${text}" is not a size; write it like 1440-day or 390-night`);
  const width = Number(match[1]);
  const known = SIZES.find((s) => s.width === width);
  return { width, height: known?.height ?? 900, theme: match[2] as Theme };
}

/** The sizes the options ask for: all of them when none is given. */
export function chooseSizes(option: string | undefined): Size[] {
  if (!option) return [...SIZES];
  return option.split(",").filter(Boolean).map(parseSize);
}

/** The state sheet of a page: `today` has `today-states`; the setup pages share `setup-states`; a sheet has none. */
export function sheetOf(page: string): string | null {
  if (page.endsWith("-states")) return null;
  return page.startsWith("setup-") ? "setup-states" : `${page}-states`;
}

/** The pages the options ask for. A name may be a page (`today`) or a page's state sheet (`today-states`); with `withStates`
 * a page brings its sheet too. A name that no page has is an error, so a typo never captures nothing quietly. */
export function choosePages(option: string | undefined, all: readonly string[], withStates: boolean): string[] {
  if (!option) return [...all];
  const asked = option.split(",").map((s) => s.trim()).filter(Boolean);
  const unknown = asked.filter((name) => !all.includes(name));
  if (unknown.length) throw new Error(`No such page: ${unknown.join(", ")}. The pages are ${all.join(", ")}.`);
  const chosen = new Set<string>();
  for (const name of asked) {
    chosen.add(name);
    const sheet = sheetOf(name);
    if (withStates && sheet && all.includes(sheet)) chosen.add(sheet);
  }
  return all.filter((name) => chosen.has(name));
}

/** The window sizes of one screen of the inventory: 1440 day and night, 1024 day and 390 day, and 390 night for a main screen. An
 * entry that exists only at some widths keeps those; `option` (like `1440-day`) replaces the default list. */
export function inventorySizes(entry: { main?: boolean; widths?: number[] }, option?: string): Size[] {
  const base = option ? chooseSizes(option) : SIZES.filter((s) => entry.main || !(s.width === 390 && s.theme === "night"));
  return entry.widths ? base.filter((s) => entry.widths!.includes(s.width)) : base;
}

/** The screens the options ask for, by id; a name no screen has is an error. */
export function chooseScreens(option: string | undefined, all: readonly string[]): string[] {
  if (!option) return [...all];
  const asked = option.split(",").map((s) => s.trim()).filter(Boolean);
  const unknown = asked.filter((name) => !all.includes(name));
  if (unknown.length) throw new Error(`No such screen: ${unknown.join(", ")}. The screens are ${all.join(", ")}.`);
  return all.filter((name) => asked.includes(name));
}
