// The sections of Settings (design 7.9): which section each setting belongs to, which sections are listed down the side,
// and how Advanced is grouped by topic. A setting lives in exactly one section, the page the app places it on.
import type { Item } from "./settings";
import { SETTINGS_SECTIONS, type SettingsSection } from "./views";

/** The topics of Advanced, in the order they are listed. */
export const TOPICS = ["ai", "backups", "appearance", "learns", "followups", "notices", "mail", "meetings"] as const;

/** The section a setting is shown in: the page the app places it on, or an add-on's own section. */
export function sectionOfItem(item: Pick<Item, "plugin" | "page">): SettingsSection {
  if (item.plugin) return `addon/${item.plugin}`;
  return (item.page ?? "advanced") as SettingsSection;
}

/** Settings that a part of their section edits in its own way, so they aren't also listed as rows: the tier each kind of
 * work uses, what a tier tries once more on, the routing rules (Which model does what), the backup key, the keys an
 * add-on needs (password boxes of their own), the notices' address and the list of the person's own pages, and the
 * business, its sides and the words that name them. */
const OWN_PART = [
  "ai.tasks",
  "ai.tiers",
  "ai.routing",
  "storage.backups.encrypt",
  "workspace.plugins.secrets",
  "ui.notifications.webhook",
  "ui.links",
  // Where reminders reach you away from the app is one choice with its own yes, not two rows.
  "steward.reminders.where",
  "steward.reminders.where_account",
  // The accounts the assistant may act on are a switch on each account, not a list to tick.
  "watch.acting",
  // The cloud drives the backup step looks for are a list of records, changed in the file; the step shows what it found.
  "storage.backups.cloud_folders",
  // The business is its name with Rename and Remove, and the words that mean each side are two lists beside it.
  "workspace.project.business",
  "workspace.project.sides",
];

/** Whether a setting is listed as a row of its own: an add-on's, or one the app places on a page or under a topic that no
 * part of a screen edits in its own way. The rest are kept in files. */
export const isListed = (item: Pick<Item, "key" | "plugin" | "page">): boolean =>
  !OWN_PART.includes(item.key) && (item.plugin != null || item.page != null);

/** A section's settings, in the order the app lists them. */
export const sectionItems = (items: Item[], section: SettingsSection): Item[] =>
  items.filter((i) => isListed(i) && sectionOfItem(i) === section);

/** The sections to list down the side, in order: the pages of the basic settings, Your business where there is one,
 * Connections and Add-ons, the add-on files where there are some, Advanced, then one for each add-on that has settings.
 * AI accounts, Connections and Add-ons are always there: they hold lists of their own rather than settings. */
export function navSections(items: Item[], has: { business: boolean; files: boolean; keyed?: string[] }): SettingsSection[] {
  const present = new Set(items.filter(isListed).map(sectionOfItem));
  // An add-on that needs keys has a section for them even when it has no settings of its own.
  for (const plugin of has.keyed ?? []) present.add(`addon/${plugin}`);
  const out: SettingsSection[] = [];
  for (const id of SETTINGS_SECTIONS) {
    const shown = id === "ai" || id === "connections" || id === "addons" || (id === "business" ? has.business : id === "files" ? has.files : present.has(id));
    if (shown) out.push(id);
  }
  const addons = [...present].filter((s) => s.startsWith("addon/"));
  return [...out, ...addons];
}

export interface Topic {
  group: string;
  items: Item[];
}

/** A section's settings by topic: the topics of Advanced in their order, then any other group in the order it first
 * appears. A topic holds its settings in the order the app lists them. */
export function topics(items: Item[]): Topic[] {
  const out = new Map<string, Item[]>();
  for (const item of items) {
    const name = item.topic ?? item.group;
    out.set(name, [...(out.get(name) ?? []), item]);
  }
  const rank = (name: string) => {
    const at = (TOPICS as readonly string[]).indexOf(name);
    return at < 0 ? TOPICS.length : at;
  };
  return [...out].map(([group, list]) => ({ group, items: list })).sort((a, b) => rank(a.group) - rank(b.group));
}
