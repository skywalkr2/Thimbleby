// The reviewer's mockups, read straight from git (never copied into the app): the list of pictures, a picture's bytes, and where
// each state of a states sheet starts and ends in its picture. The review folder stays where it is; for measuring, the sheet's
// own page is written to a temporary folder outside the repository, with the app's own copies of the two typefaces the mockups
// name, rendered at the picture's width, and the folder is deleted afterwards.
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import type { Browser } from "playwright-core";
import { picturesIn } from "./names.ts";

export const DEFAULT_REF = "origin/claude/sweet-einstein-s840wp";
export const MOCKUP_FOLDER = "reviews/ui-ux-2026-10/mockups-46";

export interface Section {
  title: string;
  top: number;
  bottom: number;
}

export class Mockups {
  readonly ref: string;
  private readonly root: string;
  private readonly web: string;
  private pictures: Set<string> | null = null;
  private folder: string | null = null;

  constructor(ref: string, root: string, web: string) {
    this.ref = ref;
    this.root = root;
    this.web = web;
  }

  private git(args: string[]): Buffer {
    return execFileSync("git", args, { cwd: this.root, maxBuffer: 256 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] });
  }

  /** The names of the mockup pictures the ref holds. Throws a plain sentence when the ref or the folder isn't there. */
  available(): Set<string> {
    if (this.pictures) return this.pictures;
    let listing: string;
    try {
      listing = this.git(["ls-tree", "-r", "--name-only", this.ref, `${MOCKUP_FOLDER}/png/`]).toString("utf8");
    } catch {
      throw new Error(`Can't read the mockups from ${this.ref}. Fetch the review branch, or name another one with --ref.`);
    }
    this.pictures = picturesIn(listing);
    if (this.pictures.size === 0) throw new Error(`${this.ref} holds no mockup pictures under ${MOCKUP_FOLDER}/png/.`);
    return this.pictures;
  }

  /** One picture's bytes, straight from git. */
  picture(name: string): Buffer {
    return this.git(["show", `${this.ref}:${MOCKUP_FOLDER}/png/${name}`]);
  }

  private text(path: string): Buffer {
    return this.git(["show", `${this.ref}:${MOCKUP_FOLDER}/${path}`]);
  }

  /** A temporary folder with the sheets' pages, styles, marks and the two typefaces (the app's own copies of them). */
  private ensureFolder(): string {
    if (this.folder) return this.folder;
    const folder = mkdtempSync(join(tmpdir(), "cockpit-mockups-"));
    const listing = this.git(["ls-tree", "-r", "--name-only", this.ref, `${MOCKUP_FOLDER}/`]).toString("utf8").split("\n");
    for (const path of listing) {
      const relative = path.slice(MOCKUP_FOLDER.length + 1);
      if (!relative || relative.startsWith("png/")) continue;
      const target = join(folder, relative);
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, this.text(relative));
    }
    mkdirSync(join(folder, "fonts"), { recursive: true });
    for (const [family, file] of [
      ["inter", "inter-latin-wght-normal.woff2"],
      ["fraunces", "fraunces-latin-wght-normal.woff2"],
    ] as const) {
      try {
        copyFileSync(join(this.web, "node_modules", "@fontsource-variable", family, "files", file), join(folder, "fonts", file));
      } catch {
        // Without the typeface the sheet falls back to another and the cut is only approximate; measure() then says so.
      }
    }
    this.folder = folder;
    return folder;
  }

  /**
   * Where each titled state starts in the sheet drawn at this width: from its title to the next title's top (the last, to the
   * bottom of the sheet). Null when a title can't be found, so the whole sheet is shown instead of a wrong cut.
   */
  async sections(browser: Browser, sheet: string, titles: string[], width: number): Promise<Section[] | null> {
    const folder = this.ensureFolder();
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    try {
      await page.goto(`file://${join(folder, `${sheet}.html`)}`);
      await page.evaluate(() => document.fonts.ready);
      const found = await page.evaluate((wanted: string[]) => {
        const squash = (s: string) => s.replace(/\s+/g, " ").trim();
        const candidates = Array.from(document.querySelectorAll<HTMLElement>(".group, h2, h3"));
        const tops: Array<number | null> = wanted.map((title) => {
          const exact = candidates.find((el) => squash(el.textContent ?? "") === squash(title));
          const loose = exact ?? candidates.find((el) => squash(el.textContent ?? "").startsWith(squash(title)));
          return loose ? loose.getBoundingClientRect().top + window.scrollY : null;
        });
        return { tops, end: document.documentElement.scrollHeight };
      }, titles);
      if (found.tops.some((t) => t === null)) return null;
      const tops = found.tops as number[];
      // A state ends where the next one below it starts, whatever order the titles were listed in.
      return titles.map((title, n) => {
        const below = tops.filter((t) => t > tops[n] + 1);
        return { title, top: Math.max(0, Math.floor(tops[n] - 12)), bottom: Math.ceil(below.length ? Math.min(...below) - 12 : found.end) };
      });
    } finally {
      await page.close();
    }
  }

  /** Deletes the temporary folder. */
  close(): void {
    if (this.folder) rmSync(this.folder, { recursive: true, force: true });
    this.folder = null;
  }
}
