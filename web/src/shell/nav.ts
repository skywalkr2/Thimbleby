// The navigation (design 7.1): the groups and the bottom entries are fixed, and a plugin's panel adds an entry only under
// Work (its tab is `work`) or Records (`people`). Panels for Settings and Today do not appear here. What waits to go out is
// a tab of Follow-ups, and Connections and Add-ons are sections of Settings, so none of the three has an entry. The counts come from
// the queries the screens already make.
import { useQuery } from "@tanstack/react-query";
import { api, type S } from "../lib/api";
import { panelView, type View } from "../lib/views";
import { useWords } from "../lib/wording";
import { useTodayCount } from "../lib/today";
import { useSides } from "../lib/sides";
import { recordView } from "../lib/views";
import type { IconName } from "../ui/Icon";

export interface NavEntry {
  view: View;
  label: string;
  icon?: IconName;
  /** A plugin's panel has no icon of its own: its first letter stands in. */
  glyph?: string;
  count?: number | null;
  /** Shown a step in from its group's own entries (a plugin's panel, or a view the person reaches less often). */
  sub?: boolean;
}

export interface NavModel {
  today: NavEntry;
  /** Whether there is no side beside Personal: the group below then has no name, and no work words anywhere in it. */
  justMe: boolean;
  /** What the first group is called: the work group, or, with no work, a plain "your things". */
  workTitle: string;
  work: NavEntry[];
  records: NavEntry[];
  bottom: NavEntry[];
}

/** How many things wait: follow-ups still to send. Null until the query has answered. What changed is the history and has
 * no count; what waits for the person is counted on Today. */
export function useCounts(): { followups: number | null } {
  const followups = useQuery({ queryKey: ["followups"], queryFn: api.followups });
  return {
    followups: followups.data ? followups.data.reduce((n, s) => n + s.to_send, 0) : null,
  };
}

const some = (n: number | null): number | null => (n ? n : null);

export function useNav(): NavModel {
  const { t } = useWords();
  const panels = useQuery({ queryKey: ["panels"], queryFn: () => api.panels() });
  const counts = useCounts();
  const needsYou = useTodayCount();
  const { justMe, personal, sides } = useSides();
  const plugin = (tab: string, group: "work" | "records"): NavEntry[] =>
    (panels.data ?? [])
      .filter((p: S["PanelView"]) => p.tab === tab)
      .map((p) => ({ view: panelView(p.name, group), label: p.title, glyph: [...p.title.trim()][0]?.toUpperCase() ?? "", sub: true }));
  // Personal and each side by its own name, each a link to that top project's page; a person with nothing beside Personal
  // has Personal alone, where Projects would be. With a side, the projects live inside each side's page. Anyone else (a
  // workspace with projects and no side) keeps Projects.
  const sideEntries: NavEntry[] = [
    ...(personal ? [{ view: recordView("project", personal), label: t("nav.personal"), icon: "grid" as const }] : []),
    ...sides.map((s) => ({ view: recordView("project", s.project), label: s.name, icon: "grid" as const })),
  ];
  const projects: NavEntry[] = justMe || sides.length > 0 ? sideEntries : [{ view: "records/projects", label: t("nav.projects"), icon: "grid" }];
  const wait: NavEntry[] = justMe
    ? []
    : [
        { view: "work/stages", label: t("nav.stages"), icon: "layers", sub: true },
      ];
  return {
    today: { view: "today", label: t("nav.home"), icon: "home", count: some(needsYou) },
    justMe,
    workTitle: t(justMe ? "nav.work.just_me" : "nav.work"),
    work: [
      { view: "work/changed", label: t("nav.changed"), icon: "inbox" },
      { view: "work/handled", label: t("nav.handled"), icon: "archive" },
      { view: "work/followups", label: t("nav.followups"), icon: "send", count: some(counts.followups) },
      { view: "work/open", label: t("nav.open"), icon: "check" },
      ...wait,
      ...plugin("work", "work"),
    ],
    records: [
      ...projects,
      { view: "records/people", label: t("nav.people"), icon: "users" },
      { view: "records/files", label: t("nav.files"), icon: "folder" },
      { view: "records/knowledge", label: t("nav.knowledge"), icon: "book", sub: true },
      ...plugin("people", "records"),
    ],
    bottom: [
      { view: "settings", label: t("nav.settings"), icon: "gear" },
    ],
  };
}
