import type { S } from "./api";
import { entriesOf, isListed, navSections, sectionItems, sectionOfItem, topics } from "./settings-sections";

function item(key: string, page: S["SettingItem"]["page"], extra: Partial<S["SettingItem"]> = {}): S["SettingItem"] {
  return {
    key,
    file: key.split(".")[0],
    group: key.split(".").slice(0, 2).join("."),
    description: `What ${key} does`,
    type: "text",
    options: [],
    value: "",
    default: "",
    source: "default",
    locked: false,
    basic: extra.advanced !== true && page !== "advanced",
    editable: true,
    page,
    ...extra,
  };
}

const ITEMS = [
  item("workspace.name", "you"),
  item("workspace.user.timezone", "you"),
  item("ai.budgets.per_day_usd", "ai"),
  // A topic that has a page of its own sits on that page, in its More settings fold (the setting is `advanced`).
  item("ai.budgets.per_run_usd", "ai", { topic: "ai", advanced: true }),
  item("storage.sync.folder", "backups"),
  item("storage.sync.shared", "backups", { topic: "backups", advanced: true }),
  item("ui.theme", "appearance"),
  item("ui.brand.color", "appearance", { topic: "appearance", advanced: true }),
  item("steward.reminders.quiet_start", "today"),
  item("steward.meetings.prep_hours_before", "advanced", { topic: "meetings" }),
  item("dispatch.knowledge.learn", "advanced", { topic: "learns" }),
  item("workspace.project.side_words.personal", "advanced", { topic: "filing", advanced: true }),
  item("workspace.project.business", "business"),
  // The person's own quick links are a list of records a section of their own edits.
  item("ui.links", null, { type: "other" }),
  // A setting the app keeps only in files is listed to the API for a part of a screen, and has no page.
  item("watch.acting", null, { type: "list" }),
  item("plugins/sample-pack.greeting", null, { plugin: "sample-pack", group: "plugins/sample-pack" }),
];

test("each setting belongs to the one section the app places it on, and an add-on's settings to its own", () => {
  const by = Object.fromEntries(ITEMS.map((i) => [i.key, sectionOfItem(i)]));
  expect(by).toMatchObject({
    "workspace.name": "you",
    "ai.budgets.per_day_usd": "ai",
    "ai.budgets.per_run_usd": "ai",
    "storage.sync.folder": "backups",
    "ui.theme": "appearance",
    "steward.reminders.quiet_start": "today",
    "workspace.project.side_words.personal": "advanced",
    "plugins/sample-pack.greeting": "addon/sample-pack",
  });
});

test("a section lists the settings placed on it, in the order the app sends them, and every listed setting is in exactly one section", () => {
  expect(sectionItems(ITEMS, "you").map((i) => i.key)).toEqual(["workspace.name", "workspace.user.timezone"]);
  expect(sectionItems(ITEMS, "ai").map((i) => i.key)).toEqual(["ai.budgets.per_day_usd", "ai.budgets.per_run_usd"]);
  expect(sectionItems(ITEMS, "ai").filter((i) => i.advanced).map((i) => i.key)).toEqual(["ai.budgets.per_run_usd"]);
  const sections = navSections(ITEMS, { business: true, lists: true, files: true });
  const all = sections.flatMap((s) => sectionItems(ITEMS, s));
  expect(all.length).toBe(ITEMS.filter(isListed).length);
});

test("the section list has the pages of basic settings, Quick links, Your business and Lists where there are some, Connections and Add-ons, Advanced, then each add-on", () => {
  expect(navSections(ITEMS, { business: true, lists: true, files: true })).toEqual([
    "you",
    "ai",
    "today",
    "backups",
    "appearance",
    "links",
    "business",
    "lists",
    "connections",
    "addons",
    "files",
    "advanced",
    "addon/sample-pack",
  ]);
  // Without a business there is no page for one; Lists is listed only where a list is left to show on it.
  expect(navSections(ITEMS, { business: false, lists: false, files: false })).not.toContain("business");
  expect(navSections(ITEMS, { business: false, lists: false, files: false })).not.toContain("lists");
  expect(navSections(ITEMS, { business: false, lists: true, files: false })).toContain("lists");
  // Nothing to show means no entry, except AI accounts, Connections and Add-ons, which always have their lists.
  expect(navSections([item("workspace.name", "you")], { business: false, lists: false, files: false })).toEqual(["you", "ai", "connections", "addons"]);
});

test("Advanced is grouped by topic, in the order of the topics, each topic holding its settings in the order sent; a topic with a page of its own is not there", () => {
  const more = [item("dispatch.knowledge.follow_on", "advanced", { topic: "learns" }), item("steward.attention.daily_cap", "today", { topic: "notices", advanced: true })];
  const adv = sectionItems([...ITEMS, ...more], "advanced");
  expect(topics(adv).map((t) => [t.group, t.items.map((i) => i.key)])).toEqual([
    ["learns", ["dispatch.knowledge.learn", "dispatch.knowledge.follow_on"]],
    ["filing", ["workspace.project.side_words.personal"]],
    ["meetings", ["steward.meetings.prep_hours_before"]],
  ]);
  // The ones that have a page sit in its More settings, and no setting is listed in two places.
  expect(sectionItems([...ITEMS, ...more], "today").filter((i) => i.advanced).map((i) => i.key)).toEqual(["steward.attention.daily_cap"]);
  const everywhere = navSections([...ITEMS, ...more], { business: true, lists: true, files: true }).flatMap((s) => sectionItems([...ITEMS, ...more], s).map((i) => i.key));
  expect(new Set(everywhere).size).toBe(everywhere.length);
});

test("the tier of each kind of work, the routing rules and the business are not rows of their own: a part of a screen edits them", () => {
  const own = [
    item("ai.tasks", null, { type: "other" }),
    item("ai.routing", null, { type: "other" }),
    item("workspace.project.business", "business"),
    item("steward.reminders.where", "today", { type: "choice" }),
    item("ui.notifications.webhook", "today", { topic: "notices", advanced: true }),
  ];
  expect(own.map(isListed)).toEqual([false, false, false, false, false]);
  expect(sectionItems([...ITEMS, ...own], "business").map((i) => i.key)).toEqual([]);
});

test("the accounts the assistant may act on are a switch on each account, not a row of their own", () => {
  const acting = item("watch.acting", null, { type: "list" });
  expect(isListed(acting)).toBe(false);
  expect(sectionItems([...ITEMS, acting], "advanced").map((i) => i.key)).not.toContain("watch.acting");
});

test("a setting with no page is no row: it is kept in files", () => {
  expect(isListed(item("storage.export.commit", null))).toBe(false);
  expect(isListed(item("ui.theme", "appearance"))).toBe(true);
});

test("the four settings of the working hours, and the three of the brief's times, are one row each, where the first one sits", () => {
  const hours = [
    item("steward.reminders.working_first_day", "today"),
    item("steward.reminders.working_last_day", "today"),
    item("steward.reminders.working_start", "today"),
    item("steward.reminders.working_end", "today"),
  ];
  const entries = entriesOf([item("ui.notifications.enabled", "today"), ...hours, item("steward.hold_outside_hours", "today")]);
  expect(entries.map((e) => (e.kind === "item" ? e.item.key : `${e.id}:${e.items.length}`))).toEqual([
    "ui.notifications.enabled",
    "working_hours:4",
    "steward.hold_outside_hours",
  ]);
  const brief = ["steward.brief.morning_from", "steward.brief.evening_from", "steward.brief.weekly_day"].map((k) => item(k, "today", { topic: "notices", advanced: true }));
  expect(entriesOf(brief).map((e) => e.kind)).toEqual(["merged"]);
});

test("a page that holds only some of a row's settings shows them as rows of their own", () => {
  const some = [item("steward.reminders.working_first_day", "today"), item("steward.reminders.working_end", "today")];
  expect(entriesOf(some).map((e) => e.kind)).toEqual(["item", "item"]);
});
