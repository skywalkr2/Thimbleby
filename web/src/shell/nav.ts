// The navigation (design 7.1): the groups and the bottom entries are fixed, and a plugin's panel adds an entry only under
// Work (its tab is `work`) or Records (`people`). Panels for Settings and Today do not appear here. What waits to go out is
// a tab of Follow-ups, and Connections and Add-ons are sections of Settings, so none of the three has an entry. An entry with
// something waiting for the person shows how many, and says in words what the number counts: Today's come from its own
// lines, the others from the one answer of what waits on each screen.
import { useQuery } from "@tanstack/react-query";
import { api, type S } from "../lib/api";
import { panelView, type View } from "../lib/views";
import { useWords } from "../lib/wording";
import { useTodayCount } from "../lib/today";
import { useWaiting } from "../lib/waiting";
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
  /** What the count says in words, for the screen reader: "3 to send". */
  countWords?: string;
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

const some = (n: number | null | undefined): number | null => (n ? n : null);

export function useNav(): NavModel {
  const { t, tn } = useWords();
  const panels = useQuery({ queryKey: ["panels"], queryFn: () => api.panels() });
  const waiting = useWaiting();
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
    today: { view: "today", label: t("nav.home"), icon: "home", count: some(needsYou), countWords: needsYou ? tn("nav.count.today", needsYou) : undefined },
    justMe,
    workTitle: t(justMe ? "nav.work.just_me" : "nav.work"),
    work: [
      { view: "work/changed", label: t("nav.changed"), icon: "inbox", count: some(waiting?.changed.total), countWords: waiting?.changed.total ? tn("nav.count.changed", waiting.changed.total) : undefined },
      { view: "work/handled", label: t("nav.handled"), icon: "archive", count: some(waiting?.handled.total), countWords: waiting?.handled.total ? tn("nav.count.handled", waiting.handled.total) : undefined },
      { view: "work/followups", label: t("nav.followups"), icon: "send", count: some(waiting?.followups.total), countWords: waiting?.followups.total ? tn("nav.count.followups", waiting.followups.total) : undefined },
      { view: "work/open", label: t("nav.open"), icon: "check", count: some(waiting?.open.total), countWords: waiting?.open.total ? tn("nav.count.open", waiting.open.total) : undefined },
      ...wait,
      ...plugin("work", "work"),
    ],
    records: [
      ...projects,
      { view: "records/people", label: t("nav.people"), icon: "users" },
      { view: "records/files", label: t("nav.files"), icon: "folder" },
      { view: "records/notes", label: t("nav.notes"), icon: "book", sub: true },
      { view: "records/knowledge", label: t("nav.knowledge"), icon: "book", sub: true },
      ...plugin("people", "records"),
    ],
    bottom: [
      { view: "settings", label: t("nav.settings"), icon: "gear" },
    ],
  };
}
