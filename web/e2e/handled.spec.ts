// Handled for you is never wider than the window (the project's UI rules): at the phone, laptop and wide desktop widths, with
// long unbroken text from outside (the layout stress strings) as a subject, a sender, a reason and a group's sender name, all
// three lists, both groupings, the kind filter and every group open, and again with the text set wider. The lists are answered here (the layout server holds no
// mail), so the measure is of the screen, not of the data. It runs with the layout project's server.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { expect, test, type Page } from "@playwright/test";

const strings: Record<string, string> = Object.fromEntries(
  (JSON.parse(readFileSync(fileURLToPath(new URL("./fixtures/layout-strings.json", import.meta.url)), "utf8")) as Array<{ id: string; text: string }>).map(
    (s) => [s.id, s.text],
  ),
);

const LOADED = { timeout: 20_000 };
const SIZES = [
  { width: 390, height: 844 },
  { width: 1024, height: 768 },
  { width: 1440, height: 900 },
];
const KINDS = ["bills", "orders", "deliveries", "personal", "sales", "notices", "other"] as const;

type Tab = "set_aside" | "closed" | "read";
const ITEMS = ["mail", "calendar", "file", "page", "action", "question", "other"] as const;
const row = (tab: Tab, kind: (typeof KINDS)[number], n: number) => ({
  id: `SNAP-${tab}-${kind}-${n}`,
  item: tab === "closed" ? ITEMS[KINDS.indexOf(kind)] : "mail",
  rule: tab === "closed" ? "Spacing" : null,
  change: tab === "closed" ? "changed" : null,
  version: 2,
  tab,
  kind,
  title: n === 0 ? strings["web-01"] : `A short subject ${n}`,
  sender: n === 0 ? strings["token-01"] : "Sender <sender@example.com>",
  source: "Inbox",
  received: "2026-10-11T08:30:00+00:00",
  reason: tab === "read" ? null : n === 0 ? strings["web-02"] : `it is ${kind} mail`,
  link: null,
  saved: `SRC-${n}`,
  address: n === 0 ? "" : "sender@example.com",
  domain: null,
  section: "sales",
  request: tab === "set_aside" ? null : `REQ-${n}`,
});

const view = (tab: Tab, group: "reason" | "sender") => {
  const rows = KINDS.flatMap((kind) => [row(tab, kind, 0), row(tab, kind, 1)]);
  const groups =
    group === "reason"
      ? KINDS.map((kind) => {
          const items = rows.filter((r) => r.kind === kind);
          const key = tab === "read" ? `kind:${kind}` : String(items[0].reason);
          return { key, label: tab === "read" ? null : key, count: 2, items };
        })
      : [
          { key: "long", label: strings["token-02"], count: KINDS.length, items: rows.filter((r) => r.title === strings["web-01"]) },
          { key: "sender@example.com", label: "Sender", count: KINDS.length, items: rows.filter((r) => r.title !== strings["web-01"]) },
        ];
  const counts = { set_aside: rows.length, closed: rows.length, read: rows.length };
  return {
    tab,
    group,
    query: "",
    item: null,
    kept_days: 30,
    page_rows: 25,
    counts,
    kinds: [...new Set(rows.map((r) => r.item))].map((item) => ({ item, count: rows.filter((r) => r.item === item).length })),
    groups,
  };
};

/** What sticks out past the window, or makes the page scroll sideways, in the state shown now. */
const overflow = (page: Page) =>
  page.evaluate(() => {
    const limit = window.innerWidth;
    const cut: string[] = [];
    for (const el of Array.from(document.querySelectorAll("main *"))) {
      const box = el.getBoundingClientRect();
      if (box.width > 0 && box.height > 0 && box.right > limit + 1 && getComputedStyle(el).position !== "fixed") {
        cut.push(`${el.tagName.toLowerCase()}.${String(el.className).split(" ")[0]} reaches ${Math.round(box.right)}`);
      }
    }
    return { window: limit, page: document.documentElement.scrollWidth, body: document.body.scrollWidth, cut: cut.slice(0, 5) };
  });
const tooWide = (found: Awaited<ReturnType<typeof overflow>>) => found.page > found.window || found.body > found.window || found.cut.length > 0;

test("Handled for you stays inside the window at every width, on all three lists and both groupings, with every group open", async ({ page }) => {
  test.setTimeout(180_000);
  await page.route(/\/api\/handled\?/, async (route) => {
    const query = new URL(route.request().url()).searchParams;
    const asked = query.get("tab");
    const tab: Tab = asked === "read" || asked === "closed" ? asked : "set_aside";
    const group = query.get("group") === "sender" ? "sender" : "reason";
    await route.fulfill({ json: view(tab, group) });
  });
  const wide: string[] = [];
  for (const size of SIZES) {
    await page.setViewportSize(size);
    await page.goto("?token=e2e-token#work/handled");
    await expect(page.getByRole("heading", { level: 1, name: "Handled for you", exact: true })).toBeVisible(LOADED);
    // The cursor starts in the search box.
    await expect(page.getByRole("searchbox", { name: "Search by sender, subject, kind or reason" })).toBeFocused(LOADED);
    for (const tab of [/^Set aside before reading/, /^Closed by a rule/, /^Read, nothing to do/]) {
      for (const group of ["Reason", "Sender"]) {
        await page.getByRole("button", { name: tab }).click();
        await page.getByRole("button", { name: group, exact: true }).click();
        const collapsed = page.locator("[data-group] > h2 button[aria-expanded=false]");
        await expect(collapsed.first()).toBeVisible(LOADED);
        for (let closed = await collapsed.count(); closed > 0; closed = await collapsed.count()) await collapsed.first().click();
        await expect(page.locator("main li.line").first()).toBeVisible(LOADED);
        const found = await overflow(page);
        if (tooWide(found)) wide.push(`${tab} by ${group} at ${size.width}: ${JSON.stringify(found)}`);
        if (size.width === SIZES[0].width) {
          // Another computer's fonts may run wider than this one's: measure again with the text set a little wider.
          await page.evaluate(() => document.querySelectorAll<HTMLElement>("body *").forEach((e) => (e.style.letterSpacing = "0.08em")));
          const wider = await overflow(page);
          if (tooWide(wider)) wide.push(`${tab} by ${group} at ${size.width} with wider text: ${JSON.stringify(wider)}`);
          await page.evaluate(() => document.querySelectorAll<HTMLElement>("body *").forEach((e) => (e.style.letterSpacing = "")));
        }
      }
    }
  }
  expect(wide).toEqual([]);
});
