// People (design 7.13, 7.14): everyone the workspace works with, as a table. A row, Enter on it or its name opens the detail
// pane beside the table (over it when the priority columns would not fit, a drawer on a narrower window); the name's link is
// the person's page for a new tab. Adding and editing happen in a drawer, so the table
// stays in view and the new row appears beside the form. Organizations are kept here too, since a person works for one.
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
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
import { RecordsTable, type TableColumn } from "../ui/RecordsTable";
import { Skeleton } from "../ui/Skeleton";
import { Organizations } from "./Organizations";
import styles from "./People.module.css";
import { PersonDrawer } from "./PersonForm";
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
const PEOPLE_FIT = 600;

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
  const reach = (p: S["PersonView"]) => Object.entries(p.how_to_reach ?? {}).map(([kind, value]) => `${kind}: ${value}`);
  const reachColumn: TableColumn<S["PersonView"]> = {
    id: "reach",
    header: t("people.col.reach"),
    rank: justMe ? 2 : 3,
    core: justMe,
    cell: (p) =>
      reach(p).map((line) => (
        <div key={line} title={line} className={styles.clip}>
          {line}
        </div>
      )),
  };
  // One column says who they are: how they relate to you, then their part on each side of your work. The organization and the
  // role are in the details.
  const leading: TableColumn<S["PersonView"]>[] = [{ id: "who", header: t("people.col.who"), rank: 1, core: true, cell: who }];
  const columns: TableColumn<S["PersonView"]>[] = [
    ...leading,
    reachColumn,
    { id: "open", header: t("people.col.open"), rank: 1, core: true, numeric: true, cell: (p) => (p.open_items > 0 ? p.open_items : "") },
    { id: "last", header: t("people.col.last"), rank: 2, cell: (p) => (p.last_contact ? day(p.last_contact) : "") },
  ];
  const filter = (
    <FormField id="people-org" label={t("people.filter_org")} className={styles.orgFilter} data-size="content">
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
  );

  return (
    <section className="panel-section" aria-labelledby="people-title">
      <PageHeader
        id="people-title"
        title={t("setup.people")}
        filters={<SideFilter />}
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
        {people.isPending ? (
          <Skeleton />
        ) : all.length === 0 ? (
          <EmptyState text={side.choice !== "all" ? t("sides.empty.people", { side: side.named }) : t(justMe ? "setup.no_people.just_me" : "setup.no_people")} action={{ label: t("setup.add_person"), onClick: () => setAdding(true) }} />
        ) : (
          <>
            {!justMe && ((orgs.data ?? []).length > 1 || org !== ALL) && filter}
            {rows.length === 0 ? (
              <EmptyState text={t("people.none_here")} />
            ) : (
              <RecordsTable
                label={t("setup.people")}
                name={{
                  header: t("people.col.name"),
                  title: (p) => p.name,
                  cell: (p, open) => (
                    <>
                      <a href={viewHref(recordView("person", p.id))} onClick={open}>
                        {p.name}
                      </a>{" "}
                      {tags(p)}
                      {p.aliases.length > 0 && <div className="hint">{t("setup.also_called", { names: p.aliases.join(", ") })}</div>}
                    </>
                  ),
                }}
                columns={columns}
                groups={[{ id: "all", title: t("setup.people"), rows }]}
                rowKey={(p) => p.id}
                selected={chosen}
                onSelect={(p) => setChosen(p.id)}
                actionsHeader={t("people.col.actions")}
                actions={(p) => <RowMenu label={p.name} actions={menu(p)} />}
              />
            )}
            <p className="hint">{tn("people.count", all.length)}</p>
          </>
        )}
      </ListDetail>
      {!justMe && <Organizations />}
      {adding && <PersonDrawer onClose={() => setAdding(false)} onSaved={(id) => setChosen(id)} />}
      {editing && <PersonDrawer person={editing} onClose={() => setEditing(null)} />}
    </section>
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
