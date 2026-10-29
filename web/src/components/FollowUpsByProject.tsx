// Follow-ups grouped by side, then by project (design 7.5, 7.13): the same open questions and to-dos as the groups by person,
// one line per project under the side it is on; choosing it shows that project's items in the detail, with who each is with
// and where it stands. An item filed on a side and in no project of it is "<side>: not in a project". With one group
// only, its items show in place. An item's button goes to that person's group, where Copy, Mark sent and Record reply are.
import { useRef } from "react";
import type { S } from "../lib/api";
import { useRowKeys } from "../lib/keys";
import { useListChoice, type ListChoice } from "../lib/list-choice";
import { useSideFilter, type Side } from "../lib/sides";
import { useWords } from "../lib/wording";
import { ListDetail } from "../ui/ListDetail";
import { OriginLink } from "./Origin";
import { plainTitle } from "../lib/title-dates";
import { Button } from "../ui/Button";
import { Actions } from "../ui/Actions";
import { RowList } from "../ui/RowList";
import { ItemList, Item } from "../ui/ItemList";
import { ExpandableRow } from "../ui/Row";
type Section = S["FollowupSection"];

interface Item {
  id: string;
  title: string;
  /** Who it is with: the person's id and name, and whether that is the person themselves. */
  person: string;
  name: string;
  mine: boolean;
  /** Where it stands, from the sheet. */
  state: string;
  kind: "question" | "action";
  origin?: S["FollowupQuestion"]["origin"];
}

/** The side an item is on and where on it: the side's id and name (none for an item on no side), and the project's name
 * (none for an item filed on the side itself, or on nothing). */
interface Place {
  side: Side | null;
  sideName: string;
  project: string;
}

type Words = ReturnType<typeof useWords>;

function waiting(days: number | null, chase: boolean, w: Words): string {
  if (days === null) return w.t("followups.by_project.to_send");
  return w.tn(chase ? "followups.waiting_pill.chase" : "followups.waiting_pill", days);
}

function itemsOf(section: Section, names: Map<Side, string>, w: Words): Array<[Place, Item]> {
  const base = { person: section.person, name: section.name, mine: section.is_pm };
  const out: Array<[Place, Item]> = [];
  const place = (project: string | null | undefined, side: string | null | undefined, sideName: string | null | undefined): Place => ({
    side: side ?? null,
    sideName: (side ? names.get(side) : undefined) ?? sideName ?? "",
    project: project ?? "",
  });
  for (const q of section.questions) {
    const state = section.is_pm ? w.t("followups.by_project.yours") : q.status === "sent" ? waiting(q.waiting_days ?? 0, q.chase_due, w) : waiting(null, false, w);
    out.push([place(q.project_name, q.side, q.side_name), { ...base, id: q.id, title: q.title, state, kind: "question", origin: q.origin }]);
  }
  for (const q of section.later ?? []) {
    out.push([place(q.project_name, q.side, q.side_name), { ...base, id: q.id, title: q.title, state: w.t("followups.by_project.later"), kind: "question", origin: q.origin }]);
  }
  for (const a of section.actions) {
    const state = section.is_pm ? w.t("followups.by_project.yours") : waiting(a.told_days, a.chase_due, w);
    out.push([place(a.project_name, a.side, a.side_name), { ...base, id: a.id, title: a.text, state, kind: "action", origin: a.origin }]);
  }
  return out;
}

/** One project line: its name (or where an item with no project is filed) and the items under it. */
export interface Group {
  key: string;
  title: string;
  items: Item[];
}

/** The items of one side, as project lines. */
export interface SideGroup {
  /** The side's id and name; empty for what is on no side. */
  side: Side | null;
  name: string;
  groups: Group[];
}

/** The sides in the person's order (Personal, then each other side), what is on no side last; within a side the projects by
 * name and what is in none of them last, and within a project the person's own first, then by person. */
export function groupBySide(sections: Section[], sideOrder: Array<{ id: Side; name: string }>, w: Words, compact = false): SideGroup[] {
  const names = new Map(sideOrder.map((s) => [s.id, s.name] as const));
  const sides = new Map<string, { place: Place; projects: Map<string, Item[]> }>();
  for (const s of sections) {
    if (compact && s.is_pm) continue;
    for (const [place, item] of itemsOf(s, names, w)) {
      const at = sides.get(place.side ?? "") ?? { place, projects: new Map<string, Item[]>() };
      at.projects.set(place.project, [...(at.projects.get(place.project) ?? []), item]);
      sides.set(place.side ?? "", at);
    }
  }
  const order = [...sideOrder.map((s) => s.id as string), ""];
  const rank = (id: string) => (order.includes(id) ? order.indexOf(id) : order.length - 1);
  return [...sides.entries()]
    .sort(([a], [b]) => rank(a) - rank(b))
    .map(([id, { place, projects }]) => ({
      side: place.side,
      name: place.sideName,
      groups: [...projects.entries()]
        .sort(([a], [b]) => (a === "" ? 1 : b === "" ? -1 : a.localeCompare(b)))
        .map(([project, items]) => ({
          key: `${id}|${project}`,
          title: project || (place.sideName ? w.t("side.not_in_project", { side: place.sideName }) : w.t("followups.by_project.unplaced")),
          items: [...items].sort((a, b) => Number(b.mine) - Number(a.mine) || a.name.localeCompare(b.name) || a.title.localeCompare(b.title)),
        })),
    }));
}

/** The width the list needs beside the pane: a project's name and how many are open. */
const BY_PROJECT_FIT = 420;

export function FollowUpsByProject(props: { sections: Section[]; compact: boolean; beside?: boolean; onOpenPerson: (person: string) => void }) {
  const words = useWords();
  const { t } = words;
  const filter = useSideFilter();
  const bySide = groupBySide(props.sections, filter.options, words, props.compact);
  const groups = bySide.flatMap((s) => s.groups);
  const choice = useListChoice({ keys: groups.map((g) => g.key), beside: !!props.beside });
  const selected = groups.find((g) => g.key === choice.chosen) ?? null;
  // With one group there is nothing to choose between: its items are shown where the list would be.
  if (groups.length === 1) {
    const only = groups[0];
    return (
      <div className="in-place" data-in-place="">
        <h2 id="followups-group-title">{only.title}</h2>
        <ProjectItems group={only} onOpenPerson={props.onOpenPerson} />
      </div>
    );
  }
  return (
    <ListDetail
      title={selected ? selected.title : ""}
      onClose={choice.close}
      fit={BY_PROJECT_FIT}
      detail={selected ? <ProjectItems group={selected} onOpenPerson={props.onOpenPerson} /> : null}
    >
      {bySide.map((s) => (
        <section key={s.side ?? "none"} className="by-side" aria-labelledby={bySide.length > 1 && s.name ? `by-side-${s.side}` : undefined}>
          {bySide.length > 1 && s.name && <h2 id={`by-side-${s.side}`}>{s.name}</h2>}
          <RowList as="ol" aria-label={bySide.length > 1 && s.name ? undefined : t("followups.by_project.list")} aria-labelledby={bySide.length > 1 && s.name ? `by-side-${s.side}` : undefined}>
            {s.groups.map((g) => (
              <ProjectLine key={g.key} group={g} choice={choice} />
            ))}
          </RowList>
        </section>
      ))}
    </ListDetail>
  );
}

function ProjectLine(props: { group: Group; choice: ListChoice }) {
  const { tn } = useWords();
  const { choice, group } = props;
  const ref = useRef<HTMLLIElement>(null);
  useRowKeys(ref, { toggle: () => choice.enter(group.key) });
  return (
    <ExpandableRow
      ref={ref}
      aria-label={group.title}
      data-project-group={group.key}
      {...choice.rowProps(group.key)}
      title={group.title}
      meta={tn("followups.by_project.count", group.items.length)}
      expand={{ expanded: choice.chosen === group.key, inert: choice.chosen === group.key, onToggle: () => choice.choose(group.key) }}
    />
  );
}

/** A project's items, each with who it is with and the button that goes to that person's group. */
function ProjectItems(props: { group: Group; onOpenPerson: (person: string) => void }) {
  const { t } = useWords();
  return (
    <ItemList>
      {props.group.items.map((item) => (
        <Item row key={item.id}>
          <div>
            <div className="what">{t(item.kind === "question" ? "followups.question" : "followups.by_project.to_do")}</div>
            <div className="title">{plainTitle(item.title)}</div>
            <div className="meta">{[item.mine ? t("followups.you") : item.name, item.state].filter(Boolean).join(" · ")}</div>
            <OriginLink origin={item.origin} />
          </div>
          <Actions>
            <Button aria-label={t("followups.by_project.open_named", { name: item.mine ? t("followups.you") : item.name })} onClick={() => props.onOpenPerson(item.person)}>
              {t("followups.by_project.open")}
            </Button>
          </Actions>
        </Item>
      ))}
    </ItemList>
  );
}
