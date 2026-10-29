// Any record's page: its ordinary fields as a list of labelled values, each long text with its versions and working
// copies, and what the plugins offer on it (design 5.3, 7.2). Nothing here knows what kind of record it is.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useId, useRef, useState } from "react";
import { ApiError, api, type S } from "../lib/api";
import { deliveryLines, type Delivery } from "../lib/deliveries";
import { resolveOffers, usePluginActions, useTaskKinds, type Offer } from "../lib/plugin-actions";
import { usePluginRun } from "../lib/plugin-run";
import { problemText } from "../lib/problem";
import { changedFields, editableFields, initialDraft, type Draft } from "../lib/record-edit";
import { inReadingOrder, readableTail, useDetailLines, useFieldLabel, useValueLines } from "../lib/records";
import { reconcile, type Refreshed } from "../lib/refreshed";
import { day, time } from "../lib/dates";
import { useAct } from "../lib/act";
import { useToasts } from "../lib/toasts";
import { useWords } from "../lib/wording";
import { AnswerOnToday } from "./AnswerOnToday";
import { useChangeThis, useQuestionMenu, type ChangeKind } from "./ChangeThis";
import { FactSource } from "./FactSource";
import { FiledLine } from "./Filed";
import { LearnedLines } from "./Learned";
import { OriginLink } from "./Origin";
import { PersonDrawer, kindLabel, useContactKinds } from "./PersonForm";
import { onWorkSide, usePersonMenu } from "./PersonMenu";
import { PersonPicker } from "./PersonPicker";
import { AgendaSection } from "./AgendaList";
import { Attendees } from "./Attendees";
import { MeetingPrep } from "./MeetingPrep";
import { useInvitationActs } from "./InvitationActs";
import { useEventActs } from "./EventActs";
import { useMessageActs } from "./MessageActs";
import { useVersionActs } from "./SameDocument";
import { ProjectKnows } from "./ProjectKnows";
import { SideInside } from "./SideInside";
import { useSideOf, useSides } from "../lib/sides";
import { recordView, viewHref } from "../lib/views";
import { PromiseWhy } from "./PromiseWhy";
import { useNoted } from "./NoteBox";
import { ProjectDrawer } from "./ProjectForm";
import { ProjectPicker } from "./ProjectPicker";
import { CONVERSATION_KINDS, RecordConversation } from "./RecordConversation";
import { RecordActivity } from "./RecordActivity";
import { RefreshedLines } from "./RefreshedLines";
import { RowMenu, type MenuAction } from "./RowMenu";
import { SafeLink, domainOf } from "./SafeText";
import { StancePicker } from "./StancePicker";
import { Unfiled } from "./Unfiled";
import { TextSection } from "./TextSection";
import { useTextReview } from "./TextReview";
import { ValueSelect } from "./ValueSelect";
import { Skeleton } from "../ui/Skeleton";
import { plainTitle } from "../lib/title-dates";
import { useFocusAfterRender } from "../lib/focus-after-render";
import { Button } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";
import { PageHeader } from "../ui/PageHeader";
import { Pill } from "../ui/Pill";
import { Select } from "../ui/Select";
import { FormField } from "../ui/FormField";
import { FormBlock } from "../ui/FormBlock";
import { Actions } from "../ui/Actions";
import { DefinitionList, Definition } from "../ui/DefinitionList";
import { TabStrip } from "../ui/TabStrip";
import styles from "./RecordPage.module.css";
import { whoTheyAre } from "../lib/people-who";
export function RecordPage(props: { kind: string; id: string; onBack: () => void }) {
  const { t, has } = useWords();
  const { kind, id } = props;
  const record = useQuery({ queryKey: ["record", kind, id], queryFn: () => api.record(kind, id) });
  const fields = useQuery({ queryKey: ["kind", kind], queryFn: () => api.kindView(kind) });
  const people = useQuery({ queryKey: ["people"], queryFn: api.people });
  const projects = useQuery({ queryKey: ["projects"], queryFn: api.projects });
  const organizations = useQuery({ queryKey: ["organizations"], queryFn: api.organizations });
  // What is open with the record, what was finished and what happened to it; a record the page can't be read for shows none.
  const page = useQuery({ queryKey: ["record-page", kind, id], queryFn: () => api.recordPage(kind, id) });
  const lines = useValueLines();
  const { justMe, personal, sides } = useSides();
  const sideOf = useSideOf();
  // Personal's page and each side's page are the top of a side: they say what is inside and never call themselves a project.
  const isSide = kind === "project" && (personal === id || sides.some((s) => s.project === id));
  // An organization that is one of the person's own businesses or jobs says so, and links to that side.
  // A project says which side it is on, when the person has sides to tell apart.
  const onSide = kind === "project" && !isSide && !justMe && sides.length > 0 ? sideOf(id) : null;
  const sideName = onSide ? (onSide === personal ? t("sides.filter.personal") : sides.find((s) => s.project === onSide)?.name) : undefined;
  const ownSide = kind === "organization" ? sides.find((s) => s.organization === id) : undefined;
  const { open, dialog } = useTextReview();
  // A job or business is one thing with one page: the organization it made opens that page, in place of its own, so the two can
  // never say different things about it.
  const sidePage = ownSide ? viewHref(recordView("project", ownSide.project)) : null;
  useEffect(() => {
    if (sidePage) window.location.replace(sidePage);
  }, [sidePage]);
  // "Change this" sits in a menu beside the record's own actions, for the kinds of record it can be asked for.
  const change = useChangeThis({ kind: kind as ChangeKind, id });
  // A question also has its own menu: reword it, ask someone else, drop it, or say it was already sent.
  const questionFields = record.data?.fields;
  // A question or decision waiting on the person is answered on Today; the page links to its line there.
  const me = useQuery({ queryKey: ["me"], queryFn: api.me });
  // The page of the person themselves reads as theirs: "You", their own details and what waits for them, and none of what
  // describes someone else to them (who they are to you, when you were last in touch, what you asked them).
  const isSelf = kind === "person" && !!me.data?.person && me.data.person === id;
  // A person's page also knows how you were last in touch, their dates and what matters to them, and says how each open item
  // relates to them; the details panel and the open list carry these, so none is said twice.
  const memory = useQuery({ queryKey: ["person-memory", id], queryFn: () => api.personMemory(id), enabled: kind === "person" && !isSelf });
  const kinds = useContactKinds();
  const [tab, setTab] = useState<"overview" | "open" | "activity">("overview");
  const waitingOnYou = kind === "question" && questionFields?.status === "open" && !!me.data?.person && questionFields?.to === me.data.person;
  const questionMenu = useQuestionMenu(
    { id, title: String(questionFields?.title ?? ""), text: String(questionFields?.text ?? "") },
    { canMarkSent: questionFields?.status === "open" },
  );
  const menu = [...(kind === "question" ? questionMenu.entries : []), change.entry];
  // A saved message can be replied to, forwarded or filed: each drafts an act that opens in Waiting to go out.
  const message = useMessageActs(id, String(record.data?.fields.title ?? ""), kind === "source");
  // A saved file from a watched folder can be said to be the same document as another, or not (design 6.2).
  const versions = useVersionActs(kind === "source" ? id : null);
  // An invitation on a calendar entry can be answered the same way.
  const invite = useInvitationActs(id, kind === "event" && record.data?.fields.invitation === true);
  // An event that is the person's own on a connected calendar can be moved or cancelled, each through the same yes.
  const eventActs = useEventActs(id, { start: record.data?.fields.start as string | undefined, end: record.data?.fields.end as string | null | undefined }, kind === "event");
  // A to-do that is open can be marked done from its page, with Undo.
  const act = useAct();
  const noted = useNoted();
  const markDone = () =>
    void act(
      () => api.actionStatus(id, "done"),
      (result) => ({ message: noted(t("toast.action_done"), result.request), undo: () => api.actionStatus(id, "open") }),
    );
  const [editing, setEditing] = useState(false);
  // A person and a project are edited in the same drawer as on their own screens.
  const drawer = kind === "person" ? (people.data ?? []).find((p) => p.id === id) : kind === "project" ? (projects.data ?? []).find((p) => p.id === id) : undefined;
  const editButton = useRef<HTMLButtonElement>(null);
  const focusAfterRender = useFocusAfterRender();
  const stopEditing = () => {
    setEditing(false);
    focusAfterRender(() => editButton.current);
  };

  const info = new Map((fields.data?.fields ?? []).map((f) => [f.name, f]));
  // Every id the page can name: the people and projects on file, and whatever the server resolved for this record (an
  // organization, a team, anything a field refers to). An id is never shown.
  const names = new Map<string, string>([
    ...(people.data ?? []).map((p) => [p.id, p.name] as [string, string]),
    ...(projects.data ?? []).map((p) => [p.id, p.name] as [string, string]),
    ...(page.data?.details ?? []).flatMap((d) => (d.refs ?? []).filter((r) => r.name).map((r) => [r.id, r.name] as [string, string])),
    // A record a reference still names after it was deleted is said to be removed, never shown as its id.
    ...(page.data?.details ?? []).flatMap((d) => (d.refs ?? []).filter((r) => r.removed).map((r) => [r.id, t("record.removed")] as [string, string])),
  ]);
  const shown = (name: string, value: unknown): string[] =>
    lines(value).map((line) => (info.get(name)?.refers_to && names.has(line) ? names.get(line)! : line));
  const detailLines = useDetailLines();
  const labelOf = useFieldLabel();

  const data = record.data;
  const offered = editableFields(fields.data?.fields ?? []);
  // The record's name, never its id: the page says it (a person is named by their full name).
  // While what resolves the names is still on its way the page has no name yet, and no detail: an id is never shown.
  const settled = !page.isPending && !people.isPending && !projects.isPending;
  const due = kind === "action" && typeof data?.fields.due === "string" ? data.fields.due : null;
  const name = data && settled ? plainTitle(page.data?.name || shown("title", data.fields.title)[0] || shown("name", data.fields.name)[0] || "", due) : "";
  const ownOrganization = kind === "project" ? sides.find((s) => s.project === id) : undefined;
  type Row = { name: string; label?: string; lines: Array<string | { label: string; url: string }>; link?: { text: string; href: string }; muted?: boolean; onAdd?: () => void };
  const person = kind === "person" ? (people.data ?? []).find((p) => p.id === id) : undefined;
  const generic: Row[] = data && settled && kind !== "person"
    ? inReadingOrder(
        Object.entries(data.fields)
          // The id of the input an item came from is shown as its "Where it came from" link instead.
          .filter(([name]) => !isSide || SIDE_FIELDS.has(name))
          // A to-do's page says its owner and day once, in words, and keeps what only the app uses out of sight.
          .filter(([name]) => !(kind === "action" && TODO_HIDDEN.has(name)))
          .filter(([name]) => name !== "id" && name !== "filed_by" && !(name === "source" && data.origin))
          // A calendar entry's people are a list of their own below; its internal key, flags and answer aren't details.
          .filter(([name, value]) => !(kind === "event" && (CALENDAR_LISTED.has(name) || (name === "cancelled" && value !== true))))
          .map(([name, value]): Row => {
            // A side is its organization too, and has one page: the organization's details are rows of this one (below), and
            // its name is the heading's.
            if (ownOrganization?.organization && name === "organization" && value === ownOrganization.organization) {
              return { name, lines: [] };
            }
            return {
              name,
              // A yes or no says only what is so: a flag that is off is left out, and one that is on is said in words.
              // A delivery is said in words (its status, carrier and numbers), never as the stored object.
              lines:
                info.get(name)?.type === "yes_no" || typeof value === "boolean"
                  ? flagLines(value, name, t, has)
                  : kind === "event" && name === "delivery"
                    ? deliveryLines(value as Delivery | null, t)
                    : detailLines(name, value, info.get(name), names),
            };
          })
          // What the heading already says is not said again under it: the name field, or a to-do's wording, when it is the name.
          .filter((row) => !(NAME_FIELDS.has(row.name) && row.lines.length === 1 && row.lines[0] === name))
          .filter((row) => row.lines.length > 0),
      )
    : [];
  // A to-do's owner and day are said once, in words, at the head of its details.
  if (data && settled && kind === "action") {
    const owners = (Array.isArray(data.fields.owners) ? data.fields.owners : []) as Array<{ person?: string }>;
    const named = owners.map((o) => (o.person ? names.get(o.person) : undefined)).filter((n): n is string => !!n);
    const dueText = typeof data.fields.due === "string" && data.fields.due ? day(data.fields.due) : t("promise.no_date");
    // Someone with only their own life is not told who does their own to-do.
    const mine = justMe && owners.length > 0 && owners.every((o) => o.person === me.data?.person);
    generic.unshift(...(mine ? [] : [{ name: "todo_owner", lines: [named.length > 0 ? named.join(", ") : t("open.nobody")] }]), { name: "todo_due", lines: [dueText] });
  }
  // The organization a side is, as part of the side's own page: what is known about it and who works for it.
  if (ownOrganization?.organization) {
    const org = (organizations.data ?? []).find((o) => o.id === ownOrganization.organization);
    const staff = (people.data ?? []).filter((p) => p.org === ownOrganization.organization).map((p) => p.name);
    if (org?.notes) generic.push({ name: "org-notes", label: t("orgs.row.notes"), lines: [org.notes] });
    if (staff.length > 0) generic.push({ name: "org-people", label: t("orgs.row.people"), lines: staff });
  }
  // A person's details are read from the person as the lists read them, so a fact is said once: how to reach them, who they are
  // to you and on which sides, when you were last in touch, their dates and what matters to them.
  const personRows: Row[] = [];
  if (data && settled && kind === "person") {
    const held = (data.fields.how_to_reach ?? {}) as Record<string, string>;
    kinds.forEach((ck, i) => {
      const found = Object.entries(held).find(([k]) => k.trim().toLocaleLowerCase() === ck.trim().toLocaleLowerCase());
      if (found) personRows.push({ name: `reach-${ck}`, label: kindLabel(ck), lines: [found[1]] });
      else if (i < 2) personRows.push({ name: `reach-${ck}`, label: kindLabel(ck), lines: [t("person.add_kind", { kind: ck.toLocaleLowerCase() })], muted: true, onAdd: () => setEditing(true) });
    });
    const role = String(data.fields.role ?? "").trim();
    const who = person && !isSelf ? whoTheyAre(person, personal, sides, t) : role;
    // Who they are says how they relate and their part on each side; a role it doesn't say is a row of its own.
    if (who && who !== role) personRows.push({ name: "who", label: t("person.row.who"), lines: who.split(", ") });
    if (role && !who.includes(role)) personRows.push({ name: "role", label: labelOf("role"), lines: [role] });
    else if (who === role && role) personRows.push({ name: "role", label: labelOf("role"), lines: [role] });
    const org = names.get(String(data.fields.org ?? "")) ?? person?.org_name ?? "";
    if (isSelf && !justMe && sides.length > 0) {
      // The person's own page lists every job and business they keep, not only the one their record names.
      personRows.push({ name: "org", label: t("person.row.own_orgs"), lines: sides.map((x) => x.name) });
    } else if (org && !sides.some((x) => x.name === org)) personRows.push({ name: "org", label: labelOf("org"), lines: [org] });
    const team = names.get(String(data.fields.team ?? ""));
    if (team) personRows.push({ name: "team", label: labelOf("team"), lines: [team] });
    if (person && !justMe && sides.length > 0) {
      const named = (person.sides ?? []).map((sid) => (sid === personal ? t("sides.filter.personal") : sides.find((x) => x.project === sid)?.name)).filter((n): n is string => !!n);
      if (named.length > 0) personRows.push({ name: "sides", label: labelOf("sides"), lines: named });
    }
    if (!isSelf && memory.data) {
      const touch = memory.data.last_in_touch;
      personRows.push({
        name: "last",
        label: t("people.col.last"),
        lines: [touch ? `${t(`person.touch.${touch.kind}`, { date: day(touch.on) })}${touch.subject ? ` · ${touch.subject}` : ""}` : t("person.no_contact")],
        muted: !touch,
      });
    }
    const aliases = (data.fields.aliases ?? []) as string[];
    if (aliases.length > 0) personRows.push({ name: "aliases", label: labelOf("aliases"), lines: [aliases.join(", ")] });
    if (data.fields.first_name) personRows.push({ name: "first_name", label: labelOf("first_name"), lines: [String(data.fields.first_name)] });
    if (memory.data && memory.data.dates.length > 0) {
      personRows.push({ name: "dates", label: t("memory.dates"), lines: memory.data.dates.map((d) => (d.on ? `${d.text} · ${t(d.yearly ? "memory.dates.next_yearly" : "memory.dates.on", { date: day(d.on) })}` : d.text)) });
    }
    if (memory.data && memory.data.matters.length > 0) personRows.push({ name: "matters", label: t("memory.matters"), lines: memory.data.matters.map((m) => m.text) });
    const why = shown("why_they_matter", data.fields.why_they_matter);
    if (why.length > 0) personRows.push({ name: "why_they_matter", label: labelOf("why_they_matter"), lines: why });
    if (data.fields.status === "left") personRows.push({ name: "status", label: labelOf("status"), lines: [t("setup.left")] });
  }
  // Bookkeeping about where a value came from, and the app's own flags, are one fold below the facts, never among them.
  const rows = kind === "person" ? personRows : generic.filter((row) => !FOLDED.has(row.name));
  const folded = kind === "person" ? [] : generic.filter((row) => FOLDED.has(row.name));
  // How each open item relates to the person whose page this is, in a few words.
  const how = new Map<string, string>();
  if (kind === "person" && memory.data && !isSelf) {
    const first = person?.first_name || (page.data?.name ?? "").split(" ")[0] || "";
    for (const k of ["promised_to", "promised_by", "asked_by", "asked_of"] as const) {
      for (const item of memory.data[k]) how.set(item.id, t(`person.rel.${k}`, { name: first }));
    }
    for (const a of page.data?.open_actions ?? []) {
      if (!how.has(a.id) && (a.owners ?? []).some((o) => o.includes(page.data?.name ?? "\u0000"))) how.set(a.id, t("person.rel.theirs", { name: first }));
    }
  }
  const heading = isSelf && name ? t("record.you_named", { name }) : name;
  const openCount = (page.data?.open_actions.length ?? 0) + (isSelf ? 0 : (page.data?.open_questions.length ?? 0));
  const menuOf = usePersonMenu(() => setEditing(true));

  if (sidePage) return <Skeleton />;
  const isPerson = kind === "person";
  // A person's page has tabs: the overview, everything open with them, and the whole history.
  const tabbed = isPerson && !isSelf;
  const activity = page.data && (
    <RecordActivity page={page.data} show={tabbed ? (tab === "open" ? ["completed", "facts", "repeat"] : ["activity"]) : ["repeat", "completed", "facts", "activity"]} shown={tabbed ? (tab === "overview" ? 3 : 20) : undefined} />
  );
  const detailsPanel = data && (
    <div className="record-side record-sticky">
      <OriginLink origin={data.origin} />
      <section aria-labelledby="record-details">
        <h2 id="record-details" className="sr">
          {t(isSelf ? "record.details_you" : "record.details")}
        </h2>
        {editing && drawer && kind === "person" && <PersonDrawer person={drawer as S["PersonView"]} onClose={stopEditing} />}
        {editing && drawer && kind === "project" && <ProjectDrawer project={drawer as S["ProjectView"]} onClose={stopEditing} />}
        {editing && !drawer ? (
          <DetailsForm kind={kind} record={data} fields={offered} people={people.data ?? []} projects={projects.data ?? []} onDone={stopEditing} />
        ) : !settled ? (
          <Skeleton />
        ) : rows.length === 0 ? (
          <p className="hint">{t("record.no_details")}</p>
        ) : (
          <DefinitionList>
            {rows.map((row) => (
              <Definition key={row.name}>
                <dt>{row.label ?? labelOf(row.name)}</dt>
                <dd>
                  {row.link ? (
                    <div>
                      <a href={row.link.href}>{row.link.text}</a>
                    </div>
                  ) : row.onAdd ? (
                    <Button variant="quiet" size="sm" className={styles.add} onClick={row.onAdd}>
                      {row.lines[0] as string}
                    </Button>
                  ) : (
                    row.lines.map((line, i) => (
                      <div key={i} className={row.muted ? "muted" : undefined}>
                        {typeof line === "string" ? line : <SafeLink label={line.label || domainOf(line.url) || line.url} url={line.url} />}
                      </div>
                    ))
                  )}
                </dd>
              </Definition>
            ))}
          </DefinitionList>
        )}
        {settled && folded.length > 0 && !editing && (
          <details className="more-options" data-record-fold="">
            <summary>{t("record.more_details")}</summary>
            <DefinitionList>
              {folded.map((row) => (
                <Definition key={row.name}>
                  <dt>{row.label ?? labelOf(row.name)}</dt>
                  <dd>
                    {row.lines.map((line, i) => (
                      <div key={i}>{typeof line === "string" ? line : <SafeLink label={line.label || domainOf(line.url) || line.url} url={line.url} />}</div>
                    ))}
                  </dd>
                </Definition>
              ))}
            </DefinitionList>
          </details>
        )}
      </section>
      {/* How the person works with someone is a question about people at work: it is asked only of someone from a side of work. */}
      {isPerson && person && !isSelf && !justMe && onWorkSide(person, personal, sides) && (
        <StancePicker person={id} version={data.version} stance={data.fields.stance} trackOnly={data.fields.track_only === true} />
      )}
    </div>
  );

  return (
    <section className="panel-section record-page" aria-labelledby="record-title">
      <PageHeader
        id="record-title"
        title={heading}
        kind={!isSide && !isSelf ? <Pill tone="neutral">{justMe && kind === "project" ? t("record.kind.area") : sideName ? t("record.kind.project_in", { side: sideName }) : has(`record.kind.${kind}`) ? t(`record.kind.${kind}`) : readableTail(kind)}</Pill> : undefined}
        subtitle={isPerson && person && !isSelf ? whoTheyAre(person, personal, sides, t) || undefined : undefined}
        crumb={
          isPerson ? (
            <>
              <a href={viewHref("records/people")}>{t("setup.people")}</a>
              <span aria-hidden="true">›</span>
              <span>{heading}</span>
            </>
          ) : (
            <Button variant="quiet" size="sm" onClick={props.onBack}>
              {t("record.back")}
            </Button>
          )
        }
        primary={
          data && message.options ? (
            <Button variant="primary" onClick={() => message.ask("reply")}>
              {t("acts.reply")}
            </Button>
          ) : kind === "action" && data && data.fields.status === "open" ? (
            <Button variant="primary" onClick={markDone}>
              {t("followups.mark_done")}
            </Button>
          ) : isPerson && data && (drawer || offered.length > 0) && !editing ? (
            <Button ref={editButton} onClick={() => setEditing(true)}>
              {t("setup.edit")}
            </Button>
          ) : undefined
        }
        actions={
          data ? (
            <>
              <Offers kind={kind} id={id} />
              {message.options && <RowMenu label={heading} actions={message.menu(["reply"])} />}
              {versions.entries.length > 0 && <RowMenu label={heading} actions={versions.entries} />}
              {invite.buttons}
              {eventActs.menu.length > 0 && <RowMenu label={t("acts.event.menu")} actions={eventActs.menu} />}
              {waitingOnYou && <AnswerOnToday question={id} />}
              {CHANGEABLE.has(kind) && <RowMenu label={heading} actions={menu} />}
              {!isPerson && data && (drawer || offered.length > 0) && !editing && (
                <Button ref={editButton} onClick={() => setEditing(true)}>
                  {t("record.edit")}
                </Button>
              )}
              {isPerson && person && !isSelf && <RowMenu label={heading} actions={menuOf(person).filter((entry) => entry.id !== "edit")} />}
            </>
          ) : undefined
        }
      />
      {data && kind === "question" && questionMenu.form}
      {data && message.form}
      {data && versions.form}
      {data && invite.form}
      {data && eventActs.form}
      {data && eventActs.note}
      {data && CHANGEABLE.has(kind) && change.form}
      {data && page.data?.filed && <FiledLine kind={kind} id={id} filed={page.data.filed} />}
      {data && kind === "fact" && page.data?.fact_source && <FactSource source={page.data.fact_source} fact={id} version={data.version} />}
      {data && <LearnedLines records={[id]} />}
      {record.isPending && <Skeleton />}
      {record.isError && (
        <EmptyState icon="alert" text={t("record.load_failed")} action={{ label: t("action.try_again"), onClick: () => void record.refetch() }} />
      )}
      {data && (
        <div className="record-grid">
          <div className="record-main">
            {tabbed && (
              <TabStrip
                label={t("person.tabs")}
                value={tab}
                onChange={setTab}
                options={[
                  { value: "overview", label: t("person.tab.overview") },
                  { value: "open", label: t("person.tab.open", { name: person?.first_name || name.split(" ")[0] || name }), count: openCount },
                  { value: "activity", label: t("person.tab.activity") },
                ]}
              />
            )}
            {kind === "action" && <PromiseWhy action={id} quiet omitOrigin skip={["owner", "due"]} />}
            {kind === "event" && <AgendaSection items={page.data?.agenda ?? []} id="record-agenda" />}
            {kind === "event" && <Attendees fields={data.fields} names={names} />}
            {kind === "event" && <MeetingPrep entry={id} title={heading} />}
            {/* What is open comes first, then what finished and the history, and the box to talk about it last. */}
            {page.data && (!tabbed || tab !== "activity") && (
              <RecordActivity
                page={page.data}
                show={["open"]}
                self={isSelf}
                how={how}
                limit={tabbed && tab === "overview" ? 3 : undefined}
                onSeeAll={() => setTab("open")}
              />
            )}
            {activity}
            {kind === "project" && justMe && id === personal && <Unfiled />}
            {kind === "project" && <SideInside id={id} />}
            {kind === "project" && <ProjectKnows id={id} plain={justMe} />}
            {(!tabbed || tab === "overview") &&
              data.long_text
                .filter((field) => !(kind === "action" && TODO_HIDDEN.has(field)))
                .map((field) => (
                <TextSection
                  key={field}
                  kind={kind}
                  id={id}
                  field={field}
                  help={has(`field.${field}.help`) ? t(`field.${field}.help`) : kind.includes("/") ? info.get(field)?.description || undefined : undefined}
                  onReview={open}
                />
              ))}
            {CONVERSATION_KINDS.has(kind) && (!tabbed || tab === "overview") && <RecordConversation kind={kind} id={id} />}
          </div>
          {detailsPanel}
        </div>
      )}
      {dialog}
    </section>
  );
}

/** The fields that name a record: the page's heading says the name, so a detail that repeats it is left out. A to-do's own
 * words (`text`) are its heading too. */
const NAME_FIELDS = new Set<string>(["name", "full_name", "title", "text"]);

/** Bookkeeping about where a value came from, and the app's own flags: shown under "More details", never beside the facts. */
const FOLDED = new Set<string>(["evidence", "trust", "basis", "name_verified", "track_only", "due_by_person", "due_words", "due_check", "also_said", "reply_reviewed"]);

/** A yes or no in words: nothing for a no, the wording sheet's phrase for a yes (`flag.<field>`), else "Yes". */
function flagLines(value: unknown, field: string, t: (key: string) => string, has: (key: string) => boolean): string[] {
  if (value !== true) return [];
  return [t(has(`flag.${field}`) ? `flag.${field}` : "value.yes")];
}

/** What a side keeps (a side is a group, not a project): the rest of a project's fields are not listed on its page. */
const SIDE_FIELDS = new Set<string>(["name", "aliases", "summary", "links", "tags", "content_levels", "data_level", "organization"]);

/** The fields of a calendar entry the page shows in its own way (its people and its answer), or not at all (its key). */
const CALENDAR_LISTED = new Set<string>(["key", "attendees", "organizer", "invitation", "response", "agenda", "captured_at"]);

/** What a to-do's page does not list as a detail: its words are the heading, owner and day are said once above, and the
 * rest is the app's own bookkeeping. */
const TODO_HIDDEN = new Set<string>(["text", "owners", "due", "due_words", "due_check", "due_event", "due_by_person", "evidence", "told", "status"]);

/** The kinds of record a change can be asked for. */
const CHANGEABLE = new Set<string>(["action", "question", "event", "fact"]);

/** What the plugins offer on this record: the first thing is the primary button and the rest are in its menu. */
function Offers(props: { kind: string; id: string }) {
  const { t } = useWords();
  const actions = usePluginActions(props.kind, props.id);
  const tasks = useTaskKinds(props.kind, props.id);
  const { run, review } = usePluginRun();
  const box = useRef<HTMLDivElement>(null);
  const names = [...(actions.data ?? []).map((a) => a.name), ...(tasks.data ?? []).map((k) => k.name)];
  const offers: Offer[] = resolveOffers(names, actions.data ?? [], tasks.data ?? []);
  if (offers.length === 0) return review;
  const target = { kind: props.kind, id: props.id };
  const [primary, ...rest] = offers;
  const menu: MenuAction[] = rest.map((o) => ({
    id: o.name,
    label: o.label,
    run: () => run(o, target, () => box.current?.querySelector<HTMLElement>("button.more")),
  }));
  return (
    <Actions ref={box} role="group" aria-label={t("record.actions")}>
      <Button variant="primary"
        data-key="primary"
        onClick={(e) => {
          const button = e.currentTarget;
          run(primary, target, () => button);
        }}
      >
        {primary.label}
      </Button>
      <RowMenu label={t("record.actions")} actions={menu} />
      {review}
    </Actions>
  );
}

/** The record's ordinary fields as a form. Save sends only what changed, with the version the person was looking at,
 * and offers Undo; a refusal is shown here and the form stays open with what was typed. */
function DetailsForm(props: {
  kind: string;
  record: S["GenericRecordView"];
  fields: S["FieldView"][];
  people: S["PersonView"][];
  projects: S["ProjectView"][];
  onDone: () => void;
}) {
  const { t } = useWords();
  const labelOf = useFieldLabel();
  const client = useQueryClient();
  const { push } = useToasts();
  const base = useId();
  const { record, fields } = props;
  const [draft, setDraft] = useState<Draft>(() => initialDraft(fields, record.fields));
  // What the form showed when it opened, or when a refused save last refreshed it: the untouched fields are the ones
  // still equal to it.
  const [shown, setShown] = useState<Draft>(draft);
  const [refreshed, setRefreshed] = useState<{ lines: Refreshed[]; time: string }>({ lines: [], time: "" });
  const lines = useValueLines();
  const [error, setError] = useState<{ text: string; stale: boolean } | null>(null);
  const [saving, setSaving] = useState(false);
  const changed = changedFields(fields, record.fields, draft);
  const dirty = Object.keys(changed).length > 0;
  const set = (name: string, value: string | boolean) => setDraft((d) => ({ ...d, [name]: value }));

  const save = async () => {
    if (!dirty) return;
    setSaving(true);
    setError(null);
    try {
      const done = await api.editRecord({ kind: props.kind, id: record.id, fields: changed, read_version: record.version });
      await client.invalidateQueries();
      push({
        message: t("record.saved"),
        undo: async () => {
          const report = await api.undo(done.changeset);
          await client.invalidateQueries();
          if (!report.restored.length) throw new Error("not undone");
        },
      });
      props.onDone();
    } catch (err) {
      const stale = err instanceof ApiError && err.status === 409;
      setError({ text: problemText(err, t), stale });
      if (stale) {
        // Fields the person didn't touch take what is saved now and are listed; the ones they changed are kept.
        try {
          const now = await client.fetchQuery({ queryKey: ["record", props.kind, record.id], queryFn: () => api.record(props.kind, record.id), staleTime: 0 });
          const saved = initialDraft(fields, now.fields);
          const out = reconcile(shown, draft, saved);
          setDraft(out.next as Draft);
          setShown(saved);
          const at = now.changed_at ? new Date(now.changed_at) : null;
          setRefreshed({
            lines: out.refreshed.map((name) => ({ label: labelOf(name), value: lines(now.fields[name]).join(", ") || t("settings.empty") })),
            time: at && !Number.isNaN(at.getTime()) ? time(at) : "",
          });
        } catch {
          // Without the current record the form can't be refreshed; the next look at the page finds the cause.
        }
      }
      setSaving(false);
    }
  };

  return (
    <form
      className="panel setup-form"
      aria-label={t("record.edit")}
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") props.onDone();
      }}
    >
      {fields.map((f, i) => (
        <DetailInput
          key={f.name}
          id={`${base}-${f.name}`}
          field={f}
          value={draft[f.name]}
          onChange={(v) => set(f.name, v)}
          people={props.people}
          projects={props.projects}
          autoFocus={i === 0}
          own={props.kind.includes("/")}
        />
      ))}
      {error && (
        <div className="problem-note" role="alert">
          <p>{error.text}</p>
          {error.stale && <p>{t("record.edit_stale")}</p>}
        </div>
      )}
      <RefreshedLines lines={refreshed.lines} time={refreshed.time} />
      <Actions align="end">
        <Button variant="quiet" onClick={props.onDone}>
          {t("action.cancel")}
        </Button>
        <Button variant="primary" type="submit" disabled={!dirty || saving}>
          {t("record.save")}
        </Button>
      </Actions>
    </form>
  );
}

function DetailInput(props: {
  id: string;
  field: S["FieldView"];
  value: string | boolean;
  onChange: (value: string | boolean) => void;
  people: S["PersonView"][];
  projects: S["ProjectView"][];
  autoFocus: boolean;
  /** A plugin's own kind: its field descriptions were written for the person. The core's are for developers, and say nothing here. */
  own: boolean;
}) {
  const { t, has } = useWords();
  const labelOf = useFieldLabel();
  const { field: f, id, value } = props;
  const description = has(`field.${f.name}.help`) ? t(`field.${f.name}.help`) : props.own ? f.description : "";
  const label = labelOf(f.name);
  const text = String(value);
  const required = f.required === true;
  const help = description ? `${id}-help` : undefined;
  const note = description ? (
    <span id={help} className="hint">
      {description}
    </span>
  ) : null;

  if (f.type === "yes_no") {
    return (
      <FormBlock>
        <label className="check-line" htmlFor={id}>
          <input id={id} type="checkbox" checked={value === true} aria-describedby={help} autoFocus={props.autoFocus} onChange={(e) => props.onChange(e.target.checked)} />
          <span>{label}</span>
        </label>
        {note}
      </FormBlock>
    );
  }
  if (f.type === "reference" && f.refers_to === "person") {
    // The person who is picked stays pickable even after they have left.
    const people = props.people.filter((p) => p.status === "active" || p.id === text);
    return <PersonPicker label={label} value={text} onChange={props.onChange} suggested={[]} people={people} autoFocus={props.autoFocus} />;
  }
  if (f.value_list) {
    return (
      <ValueSelect
        id={id}
        list={f.value_list}
        label={label}
        value={text}
        onChange={props.onChange}
        note={description || undefined}
        required={required}
        autoFocus={props.autoFocus}
      />
    );
  }
  let control;
  if (f.type === "reference" && f.refers_to === "project") {
    // A project can be added from here: the form opens in place and the new project is the one picked.
    return (
      <>
        <ProjectPicker id={id} label={label} value={text} onChange={props.onChange} empty={required ? "" : t("record.none")} required={required} describedBy={help} autoFocus={props.autoFocus} />
        {note}
      </>
    );
  }
  if (f.type === "choice" || (f.type === "number" && (f.options ?? []).length > 0)) {
    const options = (f.options ?? []).map((o) => ({ value: o, label: o }));
    control = (
      <Select id={id} value={text} required={required} aria-describedby={help} autoFocus={props.autoFocus} onChange={(e) => props.onChange(e.target.value)}>
        {!required && <option value="">{t("record.none")}</option>}
        {required && text === "" && <option value="" />}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
    );
  } else if (f.type === "list") {
    control = <textarea id={id} className="short" value={text} aria-describedby={help} autoFocus={props.autoFocus} onChange={(e) => props.onChange(e.target.value)} />;
  } else {
    const type = f.type === "number" ? "number" : f.type === "date" ? "date" : "text";
    control = (
      <input
        id={id}
        type={type}
        step={f.type === "number" ? "any" : undefined}
        value={text}
        required={required}
        aria-describedby={help}
        autoFocus={props.autoFocus}
        onChange={(e) => props.onChange(e.target.value)}
      />
    );
  }
  return (
    <FormField id={id} label={<>{label} {f.type === "list" && <span className="hint">{t("record.list_hint")}</span>}</>}>
      {control}
      {note}
    </FormField>
  );
}
