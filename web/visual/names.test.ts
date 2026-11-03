// The capture tool's naming and its choice of mockup pictures. Pure functions only; no browser, no servers, no git.
import { describe, expect, it } from "vitest";
import { captureName, choosePages, chooseSizes, matchMockup, mockupName, parseSize, picturesIn, SIZES, sheetOf, slug } from "./names";
import { ENTRIES, PAGES } from "./pages";
import { differencesMarkdown, type Result } from "./compose";

const LISTING = [
  "reviews/ui-ux-2026-10/mockups-46/png/today-day-1440.png",
  "reviews/ui-ux-2026-10/mockups-46/png/today-night-1440.png",
  "reviews/ui-ux-2026-10/mockups-46/png/today-day-390-screen.png",
  "reviews/ui-ux-2026-10/mockups-46/png/today-states-day-1440.png",
  "reviews/ui-ux-2026-10/mockups-46/today.html",
  "reviews/ui-ux-2026-10/mockups-46/m46.css",
].join("\n");

describe("capture names", () => {
  it("names a page, a state and the first screen of a phone the way the reviewer's pictures are named", () => {
    expect(captureName("today", null, { width: 1440, theme: "day" })).toBe("today-day-1440.png");
    expect(captureName("today", null, { width: 390, theme: "night" }, true)).toBe("today-night-390-screen.png");
    expect(captureName("today-states", "offline", { width: 1024, theme: "day" })).toBe("today-states-offline-day-1024.png");
  });

  it("makes a state's title into a plain file name", () => {
    expect(slug("100+ items, long titles, other languages")).toBe("100-items-long-titles-other-languages");
    expect(slug("Studio entries shown while its calendar can’t be read")).toBe("studio-entries-shown-while-its-calendar-can-t-be-read");
    expect(slug("  Offline  ")).toBe("offline");
  });

  it("keeps the five sizes of the hand-back rule, and each has a name", () => {
    expect(SIZES.map((s) => `${s.width}-${s.theme}`)).toEqual(["1440-day", "1440-night", "1024-day", "390-day", "390-night"]);
    expect(parseSize("390-night")).toMatchObject({ width: 390, theme: "night" });
    expect(() => parseSize("390")).toThrow(/like 1440-day/);
    expect(chooseSizes(undefined)).toHaveLength(5);
    expect(chooseSizes("1440-day,390-night").map((s) => s.width)).toEqual([1440, 390]);
  });
});

describe("matching a capture to its mockup", () => {
  const available = picturesIn(LISTING);

  it("lists only the pictures of the png folder", () => {
    expect([...available].sort()).toEqual(["today-day-1440.png", "today-day-390-screen.png", "today-night-1440.png", "today-states-day-1440.png"]);
  });

  it("finds the picture of the same page, theme and width, and the first screen of a phone", () => {
    expect(matchMockup(available, "today", { width: 1440, theme: "night" })).toBe("today-night-1440.png");
    expect(matchMockup(available, "today", { width: 390, theme: "day" }, true)).toBe("today-day-390-screen.png");
    expect(mockupName("today-states", { width: 1440, theme: "day" })).toBe("today-states-day-1440.png");
  });

  it("says there is none where the reviewer drew none (no night picture at 1024, no phone picture here)", () => {
    expect(matchMockup(available, "today", { width: 1024, theme: "night" })).toBeNull();
    expect(matchMockup(available, "today", { width: 390, theme: "day" })).toBeNull();
  });
});

describe("choosing pages", () => {
  it("takes every page when none is named, and refuses a name no page has", () => {
    expect(choosePages(undefined, PAGES, false)).toEqual([...PAGES]);
    expect(() => choosePages("todya", PAGES, false)).toThrow(/No such page: todya/);
  });

  it("keeps the order of the reviewer's list, and brings a page's states sheet with --with-states", () => {
    expect(choosePages("connections,today", PAGES, false)).toEqual(["today", "connections"]);
    expect(choosePages("today,setup-ai", PAGES, true)).toEqual(["today", "today-states", "setup-ai", "setup-states"]);
    expect(sheetOf("today-states")).toBeNull();
    expect(sheetOf("setup-mail")).toBe("setup-states");
  });
});

describe("the capture map", () => {
  it("has an entry for every page, each with a drive or a reason, and each state once", () => {
    for (const page of PAGES) expect(ENTRIES.some((e) => e.page === page), page).toBe(true);
    const seen = new Set<string>();
    for (const entry of ENTRIES) {
      expect(Boolean(entry.open) !== Boolean(entry.undrivable), `${entry.page} ${entry.title ?? ""} has a drive or a reason, not both and not neither`).toBe(true);
      if (entry.page.endsWith("-states")) expect(entry.title, `${entry.page} entries carry the state's title`).toBeTruthy();
      const key = `${entry.page}|${entry.title ?? ""}`;
      expect(seen.has(key), `${key} appears once`).toBe(false);
      seen.add(key);
    }
  });

  it("names the nine states of Today's sheet and of the setup sheet", () => {
    expect(ENTRIES.filter((e) => e.page === "today-states")).toHaveLength(9);
    expect(ENTRIES.filter((e) => e.page === "setup-states")).toHaveLength(9);
  });
});

describe("the difference list", () => {
  const results: Result[] = [
    { page: "today", title: null, file: "today-day-1440.png", sideBySide: "today-day-1440.png", label: "1440 day", firstScreen: false, problem: null, noMockup: false },
    { page: "today-states", title: "Offline", file: null, sideBySide: null, label: "", firstScreen: false, problem: { kind: "undrivable", reason: "no fixture" }, noMockup: false },
  ];

  it("has a section with an empty table for each page and state, and lists what could not be driven with its reason", () => {
    const text = differencesMarkdown(results, PAGES, { ref: "origin/x", build: "commit abc" });
    expect(text).toContain("## today\n");
    expect(text).toContain("[1440 day](side-by-side/today-day-1440.png)");
    expect(text).toContain("## today-states · Offline");
    expect(text).toContain("| Difference | Fixed or why it differs |");
    expect(text).toContain("## States that could not be driven");
    expect(text).toContain("| today-states · Offline | Can't be driven yet | no fixture |");
  });
});
