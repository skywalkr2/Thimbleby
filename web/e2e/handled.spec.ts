// Handled for you is never wider than the window (the project's UI rules): at the phone, laptop and wide desktop widths, with
// long unbroken text from outside (the layout stress strings) as a subject, a sender, a reason and a group's sender name, both
// tabs, all three groupings, the kind filter and every group open, and again with the text set wider. The lists are answered here (the layout server holds no
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

type Tab = "set_aside" | "read";
/** How a row was handled: the Set aside tab holds mail set aside and changes a rule closed. */
type How = "set_aside" | "closed" | "read";
type Grouping = "kind" | "reason" | "sender";
const ITEMS = ["mail", "calendar", "file", "page", "action", "question", "other"] as const;
const row = (how: How, kind: (typeof KINDS)[number], n: number) => ({
  id: `SNAP-${how}-${kind}-${n}`,
  item: how === "closed" ? ITEMS[KINDS.indexOf(kind)] : "mail",
  rule: how === "closed" ? "Spacing" : null,
  change: how === "closed" ? "changed" : null,
  version: 2,
  tab: how,
  kind,
  title: n === 0 ? strings["web-01"] : `A short subject ${n}`,
  sender: n === 0 ? strings["token-01"] : "Sender <sender@example.com>",
  source: "Inbox",
  received: "2026-10-11T08:30:00+00:00",
  reason: how === "read" ? null : n === 0 ? strings["web-02"] : `it is ${kind} mail`,
  link: null,
  saved: `SRC-${n}`,
  address: n === 0 ? "" : "sender@example.com",
  domain: null,
  section: "sales",
  request: how === "set_aside" ? null : `REQ-${n}`,
});

type Row = ReturnType<typeof row>;
const rowsOf = (how: How) => KINDS.flatMap((kind) => [row(how, kind, 0), row(how, kind, 1)]);
/** The rows each tab holds: the Set aside tab holds set-aside mail and what a rule closed, of every kind of item. */
const rowsIn = (tab: Tab): Row[] => (tab === "read" ? rowsOf("read") : [...rowsOf("set_aside"), ...rowsOf("closed")]);

/** The key a row is grouped under, as the app's are: one group for each key, so no two groups of a view share one. */
const keyOf = (r: Row, group: Grouping): { key: string; label: string | null } => {
  if (group === "kind") return { key: r.item === "mail" ? `kind:${r.kind}` : `item:${r.item}`, label: null };
  if (group === "reason") return r.tab === "read" ? { key: `kind:${r.kind}`, label: null } : { key: String(r.reason), label: String(r.reason) };
  return r.title === strings["web-01"] ? { key: "long", label: strings["token-02"] } : { key: "sender@example.com", label: "Sender" };
};

const view = (tab: Tab, group: Grouping) => {
  const rows = rowsIn(tab);
  const found = new Map<string, { key: string; label: string | null; count: number; items: Row[] }>();
  for (const r of rows) {
    const { key, label } = keyOf(r, group);
    const g = found.get(key) ?? { key, label, count: 0, items: [] };
    g.items.push(r);
    g.count += 1;
    found.set(key, g);
  }
  const counts = { set_aside: rowsIn("set_aside").length, read: rowsIn("read").length };
  return {
    tab,
    group,
    query: "",
    item: null,
    kept_days: 30,
    page_rows: 25,
    counts,
    kinds: [...new Set(rows.map((r) => r.item))].map((item) => ({ item, count: rows.filter((r) => r.item === item).length })),
    groups: [...found.values()],
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

test("Handled for you stays inside the window at every width, on both tabs and all three groupings, with every group open", async ({ page }) => {
  test.setTimeout(180_000);
  await page.route(/\/api\/handled\?/, async (route) => {
    const query = new URL(route.request().url()).searchParams;
    const tab: Tab = query.get("tab") === "read" ? "read" : "set_aside";
    const asked = query.get("group");
    const group: Grouping = asked === "sender" || asked === "reason" ? asked : "kind";
    await route.fulfill({ json: view(tab, group) });
  });
  const wide: string[] = [];
  for (const size of SIZES) {
    await page.setViewportSize(size);
    await page.goto("?token=e2e-token#work/handled");
    await expect(page.getByRole("heading", { level: 1, name: "Handled for you", exact: true })).toBeVisible(LOADED);
    // The cursor starts on the heading, not in the search box.
    await expect(page.getByRole("heading", { level: 1, name: "Handled for you", exact: true })).toBeFocused(LOADED);
    for (const tab of [/^Set aside before reading/, /^Read, nothing to do/]) {
      for (const group of ["Kind", "Reason", "Sender"]) {
        await page.getByRole("radio", { name: tab }).click();
        await page.getByRole("radio", { name: group, exact: true }).click();
        const collapsed = page.locator("[data-group] > h2 button[aria-expanded=false]");
        await expect(collapsed.first()).toBeVisible(LOADED);
        // Every group of a view has a key of its own.
        const keys = await page.locator("[data-group]").evaluateAll((els) => els.map((e) => e.getAttribute("data-group")));
        if (new Set(keys).size !== keys.length) wide.push(`${tab} by ${group}: group keys repeat: ${keys.join(", ")}`);
        for (let closed = await collapsed.count(); closed > 0; closed = await collapsed.count()) await collapsed.first().click();
        await expect(page.locator("main [data-row-list] > li").first()).toBeVisible(LOADED);
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
