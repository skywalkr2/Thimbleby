// People (design 7.13, 7.14): everyone the workspace works with, as a table. A row, Enter on it or its name opens the detail
// pane beside the table (over it when the priority columns would not fit, a drawer on a narrower window); the name's link is
// the person's page for a new tab. Adding and editing happen in a drawer, so the table
// stays in view and the new row appears beside the form. Organizations are kept here too, since a person works for one.
import { useQuery } from "@tanstack/react-query";
import { useRef, useState, type MouseEvent } from "react";
import { api, type S } from "../lib/api";
import { day } from "../lib/dates";
import { whoTheyAre } from "../lib/people-who";
import { onSides, useSideFilter, useSides } from "../lib/sides";
import { viewHref, recordView } from "../lib/views";
import { useWords } from "../lib/wording";
import { Button, ButtonLink } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";
import { FormField } from "../ui/FormField";
import { ListDetail } from "../ui/ListDetail";
import { Pill } from "../ui/Pill";
import { Row } from "../ui/Row";
import { RowList } from "../ui/RowList";
import { PersonAvatar } from "./PersonAvatar";
import { filterBarShown } from "../lib/filterbar";
import { useRowKeys } from "../lib/keys";
import { useSideSlot } from "../lib/marks";
import { FilteredEmpty } from "../ui/FilteredEmpty";
import { ListState } from "../ui/ListState";
import { Organizations } from "./Organizations";
import styles from "./People.module.css";
import { PersonDrawer, heldReach } from "./PersonForm";
import { RecordConversation } from "./RecordConversation";
import { SideFilter } from "./SideFilter";
import { RowMenu } from "./RowMenu";
import { usePersonMenu } from "./PersonMenu";

import { PageHeader } from "../ui/PageHeader";
import { Select } from "../ui/Select";
import { Actions } from "../ui/Actions";
import { DefinitionList, Definition } from "../ui/DefinitionList";
/** The organization filter's choices besides one on file: everyone, and people with none. */
const ALL = "";
const NONE = "\u0001none";

/** The width the priority columns (name, role, organization, open items and the menu) need beside the pane. */
const PEOPLE_FIT = 520;

export function People() {
  const { t, tn } = useWords();
  const people = useQuery({ queryKey: ["people"], queryFn: api.people });
  const orgs = useQuery({ queryKey: ["organizations"], queryFn: api.organizations });
  // With no side beside Personal a person is said by who they are to you: no role, organization or list of organizations.
  const { justMe, personal, sides } = useSides();
  // With a side beside Personal the list can be narrowed to one side; a person on no known side shows under every choice.
  const side = useSideFilter();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<S["PersonView"] | null>(null);
  const [chosen, setChosen] = useState<string | null>(null);
  const [org, setOrg] = useState(ALL);
  const all = [...(people.data ?? [])]
    .filter((p) => p.is_pm || onSides(p.sides, side.choice))
    .sort((a, b) => (a.is_pm === b.is_pm ? a.name.localeCompare(b.name) : a.is_pm ? -1 : 1));
  const rows = all.filter((p) => org === ALL || (org === NONE ? !p.org : p.org === org));
  const selected = all.find((p) => p.id === chosen) ?? null;
  const who = (p: S["PersonView"]) => whoTheyAre(p, personal, sides, t);

  const menu = usePersonMenu(setEditing);

  const tags = (p: S["PersonView"]) => (
    <>
      {p.is_pm && <Pill tone="neutral">{t("setup.you")}</Pill>}
      {p.status === "left" && <Pill tone="neutral">{t("setup.left")}</Pill>}
      {p.track_only && <Pill tone="neutral">{t("people.watching")}</Pill>}
    </>
  );
  const reach = (p: S["PersonView"]) => Object.entries(heldReach(p.how_to_reach)).flatMap(([kind, values]) => values.map((value) => `${kind}: ${value}`));
  const slotOf = useSideSlot();
  // A person is one row: their initials, their name, and one line that says what there is to say (open items, who they are, how to
  // reach them); a person with nothing to say has the name alone.
  const metaOf = (p: S["PersonView"]) =>
    [p.open_items > 0 ? tn("people.open_with", p.open_items) : "", who(p), Object.values(heldReach(p.how_to_reach)).flat()[0] ?? ""].filter(Boolean).join(" \u00b7 ");
  const orgFilterShown = !justMe && (orgs.data ?? []).length > 1 && filterBarShown(all.length, org !== ALL);
  const filter = orgFilterShown ? (
    <FormField id="people-org" label={t("people.filter_org")} labelHidden className={styles.orgFilter} data-size="content">
      <Select id="people-org" value={org} onChange={(e) => setOrg(e.target.value)}>
        <option value={ALL}>{t("people.all_orgs")}</option>
        {(orgs.data ?? []).map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
        <option value={NONE}>{t("people.no_org")}</option>
      </Select>
    </FormField>
  ) : null;
  // What the page holds, said once under the title: how many people and, beside sides, how many organizations.
  const summary = people.data && !people.isError ? [tn("people.count", people.data.length), !justMe && orgs.data && !orgs.isError ? tn("orgs.count", orgs.data.length) : ""].filter(Boolean).join(", ") : undefined;

  return (
    <section className="panel-section" aria-labelledby="people-title">
      <PageHeader
        id="people-title"
        title={t("setup.people")}
        subtitle={summary}
        filters={
          <>
            <SideFilter holds={(people.data ?? []).length} />
            {filter}
          </>
        }
        primary={
          <Button variant="primary" onClick={() => setAdding(true)}>
            {t("setup.add_person")}
          </Button>
        }
      />
      <ListDetail
        title={selected?.name ?? ""}
        onClose={() => setChosen(null)}
        fit={PEOPLE_FIT}
        detail={selected ? <PersonDetail person={selected} justMe={justMe} tags={tags(selected)} reach={reach(selected)} onEdit={() => setEditing(selected)} /> : null}
      >
        <ListState query={people} failed={t("people.load_failed")} rows={6}>
          {() =>
            all.length === 0 ? (
              side.choice !== "all" ? (
                <FilteredEmpty text={t("sides.empty.people", { side: side.named })} onClear={() => side.set("all")} />
              ) : (
                <EmptyState text={t(justMe ? "setup.no_people.just_me" : "setup.no_people")} action={{ label: t("setup.add_person"), onClick: () => setAdding(true) }} />
              )
            ) : (
              <>
                {rows.length === 0 ? (
                  <FilteredEmpty text={t("people.none_here")} onClear={() => setOrg(ALL)} />
                ) : (
                  <RowList aria-label={t("setup.people")}>
                    {rows.map((p) => (
                      <PersonRow
                        key={p.id}
                        person={p}
                        selected={chosen === p.id}
                        slot={slotOf((p.sides ?? [])[0])}
                        meta={metaOf(p)}
                        tags={tags(p)}
                        onSelect={() => setChosen(p.id)}
                        menu={<RowMenu label={p.name} actions={menu(p)} />}
                      />
                    ))}
                  </RowList>
                )}
              </>
            )
          }
        </ListState>
      </ListDetail>
      {!justMe && !people.isError && <Organizations />}
      {adding && <PersonDrawer onClose={() => setAdding(false)} onSaved={(id) => setChosen(id)} />}
      {editing && <PersonDrawer person={editing} onClose={() => setEditing(null)} />}
    </section>
  );
}

/** One person in the list: a click, Enter on the row or the name opens their details beside it; the name is also their page's link. */
function PersonRow(props: { person: S["PersonView"]; selected: boolean; slot: number | null; meta: string; tags: React.ReactNode; onSelect: () => void; menu: React.ReactNode }) {
  const p = props.person;
  const ref = useRef<HTMLElement>(null);
  useRowKeys(ref, { toggle: props.onSelect, primary: props.onSelect });
  const open = (event: MouseEvent) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    props.onSelect();
  };
  return (
    <Row
      ref={ref}
      lead={<PersonAvatar name={p.name} slot={props.slot} size="md" />}
      title={
        <a href={viewHref(recordView("person", p.id))} onClick={open}>
          {p.name}
        </a>
      }
      clamp={p.name}
      pill={props.tags}
      meta={props.meta}
      oneLine
      selected={props.selected}
      menu={props.menu}
      onClick={(event) => {
        if ((event.target as HTMLElement).closest("a, button, input, select, textarea, [role='menuitem']")) return;
        props.onSelect();
      }}
    />
  );
}

function PersonDetail(props: { person: S["PersonView"]; justMe: boolean; tags: React.ReactNode; reach: string[]; onEdit: () => void }) {
  const { t, tn } = useWords();
  const p = props.person;
  const fact = (label: string, value: React.ReactNode) =>
    value ? (
      <Definition>
        <dt>{label}</dt>
        <dd>{value}</dd>
      </Definition>
    ) : null;
  return (
    <>
      <Actions align="end">{props.tags}</Actions>
      <DefinitionList>
        {fact(t("people.col.relation"), p.relation)}
        {!props.justMe && fact(t("people.col.role"), p.role)}
        {!props.justMe && fact(t("people.col.org"), p.org_name)}
        {fact(t("setup.first_name"), p.first_name)}
        {fact(t("setup.aliases"), p.aliases.join(", "))}
        {fact(t("people.col.reach"), props.reach.length ? props.reach.map((line) => <div key={line}>{line}</div>) : null)}
        {fact(t("people.col.open"), p.open_items > 0 ? tn("people.open_with", p.open_items) : null)}
        {fact(t("people.col.last"), p.last_contact ? day(p.last_contact) : null)}
      </DefinitionList>
      <Actions align="end">
        <ButtonLink href={viewHref(recordView("person", p.id))}>
          {t("records.open_page", { name: p.name })}
        </ButtonLink>
        <Button variant="primary" onClick={props.onEdit}>
          {t("setup.edit")}
        </Button>
      </Actions>
      <RecordConversation key={p.id} kind="person" id={p.id} />
    </>
  );
}
