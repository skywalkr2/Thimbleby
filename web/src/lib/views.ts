// Which screen is showing (design 7.1). Every view has a real link in the address's #fragment, so one build works at any
// base path with no server routes, and a view can be bookmarked and opened in a new tab:
//   #today  #schedule  #work/changed  #work/since  #work/handled  #work/followups  #work/open  #work/stages  #work/panel/<name>
//   #records/projects  #records/people  #records/files  #records/notes  #records/knowledge  #records/rules-review
//   #records/panel/<name>  #records/<kind>/<id>
//   #settings  #settings/<section> (you, ai, connections, addons, backups, today, appearance, lists, files, advanced, addon/<name>)
// Three fragments earlier versions used are redirected: #work/outgoing (Follow-ups, where what waits to go out is the To send
// tab), #sources and #addons (the Connections and Add-ons sections of Settings).
//   #settings/ai-compare (what each AI account can do)  #setup (the guide)  #handover (which copy to keep)  #quality  #styleguide
// A `View` is that fragment, written without the "#" and with each name or id encoded, so two views compare with ===.
export type CoreView =
  | "today"
  | "schedule"
  | "work/changed"
  | "work/since"
  | "work/handled"
  | "work/followups"
  | "work/open"
  | "work/stages"
  | "records/projects"
  | "records/people"
  | "records/files"
  | "records/notes"
  | "records/knowledge"
  | "records/rules-review"
  | "settings"
  | "settings/ai-compare"
  | "setup"
  | "handover"
  | "quality"
  | "styleguide";
/** Views that moved: a link to one still works, and opens the view that took its place (`REDIRECTS`). */
export type MovedView = "work/outgoing" | "sources" | "addons";
export type PanelGroup = "work" | "records";
/** The sections of Settings that are always there; an add-on's own is `addon/<name>`. */
export const SETTINGS_SECTIONS = ["you", "ai", "today", "backups", "appearance", "links", "business", "lists", "connections", "addons", "files", "advanced"] as const;
export type SettingsSection = (typeof SETTINGS_SECTIONS)[number] | `addon/${string}`;
export type View = CoreView | MovedView | `${PanelGroup}/panel/${string}` | `records/${string}/${string}` | `settings/${SettingsSection}`;

export const CORE_VIEWS: readonly CoreView[] = [
  "today",
  "schedule",
  "work/changed",
  "work/since",
  "work/handled",
  "work/followups",
  "work/open",
  "work/stages",
  "records/projects",
  "records/people",
  "records/files",
  "records/notes",
  "records/knowledge",
  "records/rules-review",
  "settings",
  "settings/ai-compare",
  "setup",
  "handover",
  "quality",
  "styleguide",
];

/** Where a moved view's fragment goes: Waiting to go out is the To send tab of Follow-ups, and Connections and Add-ons are
 * sections of Settings. */
export const REDIRECTS: Record<MovedView, View> = {
  "work/outgoing": "work/followups",
  sources: "settings/connections",
  addons: "settings/addons",
};

/** The view that opens for a view or fragment name that may have moved; any other is itself. */
export const canonical = (view: View): View => (view in REDIRECTS ? REDIRECTS[view as MovedView] : view);


/** Fragments earlier versions used, and the view each still opens. */
const LEGACY: Record<string, CoreView> = {
  home: "today",
  stages: "work/stages",
  files: "records/files",
  setup: "setup",
  welcome: "setup",
  settings: "settings",
};

const enc = encodeURIComponent;

export const panelView = (name: string, group: PanelGroup = "work"): View => `${group}/panel/${enc(name)}`;
export const recordView = (kind: string, id: string): View => `records/${enc(kind)}/${enc(id)}`;

/** The page of a connected calendar's event the app keeps no entry for: not a record, so it has a kind of its own. The id
 * names the event and the date of it that was opened. */
export const EVENT_PAGE = "calendar-event";
export const eventPageView = (snapshot: string, start: string): View => recordView(EVENT_PAGE, `${snapshot}@${start}`);

export const settingsView = (section: SettingsSection): View =>
  section.startsWith("addon/") ? `settings/addon/${enc(section.slice("addon/".length))}` : (`settings/${section}` as View);

/** The section of Settings a view names, or null for any other view (Settings itself opens on its first section). */
export function settingsSectionOf(view: string): SettingsSection | null {
  if (!view.startsWith("settings/")) return null;
  const rest = view.slice("settings/".length);
  if ((SETTINGS_SECTIONS as readonly string[]).includes(rest)) return rest as SettingsSection;
  if (rest.startsWith("addon/") && rest.length > "addon/".length) {
    try {
      return `addon/${decodeURIComponent(rest.slice("addon/".length))}`;
    } catch {
      return null;
    }
  }
  return null;
}

export type ParsedView =
  | { type: "core"; view: CoreView; section?: SettingsSection }
  | { type: "panel"; group: PanelGroup; name: string }
  | { type: "record"; kind: string; id: string };

export function parseView(moved: View): ParsedView {
  const view = canonical(moved);
  const section = settingsSectionOf(view);
  if (section) return { type: "core", view: "settings", section };
  if (view.startsWith("work/panel/") || view.startsWith("records/panel/")) {
    const group = view.startsWith("work/") ? "work" : "records";
    return { type: "panel", group, name: decodeURIComponent(view.slice(`${group}/panel/`.length)) };
  }
  if ((CORE_VIEWS as readonly string[]).includes(view)) return { type: "core", view: view as CoreView };
  const [, kind, id] = view.split("/");
  return { type: "record", kind: decodeURIComponent(kind), id: decodeURIComponent(id) };
}

/** The #fragment for a view (without the "#"); a moved view gets the fragment of the view that took its place. */
export const toHash = (view: View): string => canonical(view);

/** Whether an address's #fragment is one that moved: the fragment of the view that took its place, or null. */
export function movedTo(hash: string): string | null {
  const text = hash.replace(/^#/, "");
  return text in REDIRECTS ? toHash(text as MovedView) : null;
}

/** The view an address's #fragment names; anything unknown is Today. */
export function fromHash(hash: string): View {
  const text = hash.replace(/^#/, "");
  if (!text) return "today";
  if ((CORE_VIEWS as readonly string[]).includes(text)) return text as CoreView;
  if (text in REDIRECTS) return canonical(text as MovedView);
  if (text.startsWith("settings/")) return settingsSectionOf(text) ? (text as View) : "settings";
  try {
    // Fragments from earlier versions.
    if (text.startsWith("panel:")) {
      const name = decodeURIComponent(text.slice("panel:".length));
      return name ? panelView(name) : "today";
    }
    if (text.startsWith("record:")) {
      const [kind, ...rest] = text.slice("record:".length).split(":");
      const id = decodeURIComponent(rest.join(":"));
      const decoded = decodeURIComponent(kind);
      return decoded && id ? recordView(decoded, id) : "today";
    }
    if (text in LEGACY) return LEGACY[text];
    const parts = text.split("/");
    if (parts[0] === "work" && parts[1] === "panel" && parts.length > 2) {
      const name = decodeURIComponent(parts.slice(2).join("/"));
      return name ? panelView(name, "work") : "today";
    }
    if (parts[0] === "records" && parts.length > 2) {
      if (parts[1] === "panel") {
        const name = decodeURIComponent(parts.slice(2).join("/"));
        return name ? panelView(name, "records") : "today";
      }
      const kind = decodeURIComponent(parts[1]);
      const id = decodeURIComponent(parts.slice(2).join("/"));
      return kind && id ? recordView(kind, id) : "today";
    }
  } catch {
    return "today";
  }
  return "today";
}

/** An address for a view that works in a new tab and under any base path: this page's path and query, then the fragment. */
export function viewHref(view: View): string {
  return `${window.location.pathname}${window.location.search}#${toHash(view)}`;
}
