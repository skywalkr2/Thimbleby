// Any record's page: its ordinary fields as a list of labelled values, each long text with its versions and working
// copies, and what the plugins offer on it (design 5.3, 7.2). Nothing here knows what kind of record it is.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useId, useRef, useState } from "react";
import { ApiError, api, type S } from "../lib/api";
import { deliveryLines, type Delivery } from "../lib/deliveries";
import { resolveOffers, usePluginActions, useTaskKinds, type Offer } from "../lib/plugin-actions";
import { usePluginRun } from "../lib/plugin-run";
import { problemText } from "../lib/problem";
import { changedFields, editableFields, initialDraft, type Draft } from "../lib/record-edit";
import { inReadingOrder, readableTail, useDetailLines, useFieldLabel, useValueLines } from "../lib/records";
import { reconcile, type Refreshed } from "../lib/refreshed";
import { time } from "../lib/dates";
import { useToasts } from "../lib/toasts";
import { useWords } from "../lib/wording";
import { AnswerOnToday } from "./AnswerOnToday";
import { useChangeThis, useQuestionMenu, type ChangeKind } from "./ChangeThis";
import { FactSource } from "./FactSource";
import { FiledLine } from "./Filed";
import { LearnedLines } from "./Learned";
import { OriginLink } from "./Origin";
import { PersonDrawer } from "./PersonForm";
import { PersonPicker } from "./PersonPicker";
import { AgendaSection } from "./AgendaList";
import { Attendees } from "./Attendees";
import { MeetingPrep } from "./MeetingPrep";
import { PersonMemory } from "./PersonMemory";
import { useInvitationActs } from "./InvitationActs";
import { useEventActs } from "./EventActs";
import { useMessageActs } from "./MessageActs";
import { useVersionActs } from "./SameDocument";
import { ProjectKnows } from "./ProjectKnows";
import { SideInside } from "./SideInside";
import { useSideOf, useSides } from "../lib/sides";
import { recordView, viewHref } from "../lib/views";
import { PromiseWhy } from "./PromiseWhy";
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
export function RecordPage(props: { kind: string; id: string; onBack: () => void }) {
  const { t, has } = useWords();
  const { kind, id } = props;
  const record = useQuery({ queryKey: ["record", kind, id], queryFn: () => api.record(kind, id) });
  const fields = useQuery({ queryKey: ["kind", kind], queryFn: () => api.kindView(kind) });
  const people = useQuery({ queryKey: ["people"], queryFn: api.people });
  const projects = useQuery({ queryKey: ["projects"], queryFn: api.projects });
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
  // "Change this" sits in a menu beside the record's own actions, for the kinds of record it can be asked for.
  const change = useChangeThis({ kind: kind as ChangeKind, id });
  // A question also has its own menu: reword it, ask someone else, drop it, or say it was already sent.
  const questionFields = record.data?.fields;
  // A question or decision waiting on the person is answered on Today; the page links to its line there.
  const me = useQuery({ queryKey: ["me"], queryFn: api.me });
  // The page of the person themselves reads as theirs: "You", their own details and what waits for them, and none of what
  // describes someone else to them (who they are to you, when you were last in touch, what you asked them).
  const isSelf = kind === "person" && !!me.data?.person && me.data.person === id;
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
  const name = data && settled ? plainTitle(page.data?.name || shown("title", data.fields.title)[0] || shown("name", data.fields.name)[0] || "") : "";
  const ownOrganization = kind === "project" ? sides.find((s) => s.project === id) : undefined;
  const rows = data && settled
    ? inReadingOrder(
        Object.entries(data.fields)
          // The id of the input an item came from is shown as its "Where it came from" link instead.
          .filter(([name]) => !isSide || SIDE_FIELDS.has(name))
          .filter(([name]) => name !== "id" && name !== "filed_by" && !(name === "source" && data.origin) && !(kind === "person" && name === "stance"))
          // The app's own bookkeeping about a person, and how someone relates to you, are not the person's details about themselves.
          .filter(([name]) => !(isSelf && SELF_HIDDEN.has(name)))
          // A calendar entry's people are a list of their own below; its internal key, flags and answer aren't details.
          .filter(([name, value]) => !(kind === "event" && (CALENDAR_LISTED.has(name) || (name === "cancelled" && value !== true))))
          .map(([name, value]) => {
            // A side's own organization is one line, "Your business", linking to the organization's page: its name is the heading's.
            if (ownOrganization?.organization && name === "organization" && value === ownOrganization.organization) {
              const text = t(ownOrganization.kind === "job" ? "orgs.own.job" : "orgs.own.business");
              return { name, lines: [text], link: { text, href: viewHref(recordView("organization", ownOrganization.organization)) } };
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
              link: undefined as { text: string; href: string } | undefined,
            };
          })
          // What the heading already says is not said again under it: the name field, when it is the name.
          .filter((row) => !(NAME_FIELDS.has(row.name) && row.lines.length === 1 && row.lines[0] === name))
          .filter((row) => row.lines.length > 0),
      )
    : [];
  const heading = isSelf && name ? t("record.you_named", { name }) : name;

  return (
    <section className="panel-section record-page" aria-labelledby="record-title">
      <PageHeader
        id="record-title"
        title={heading}
        kind={!isSide && !isSelf ? <Pill tone="neutral">{justMe && kind === "project" ? t("record.kind.area") : sideName ? t("record.kind.project_in", { side: sideName }) : has(`record.kind.${kind}`) ? t(`record.kind.${kind}`) : readableTail(kind)}</Pill> : undefined}
        crumb={
          <Button variant="quiet" size="sm" onClick={props.onBack}>
            {t("record.back")}
          </Button>
        }
        primary={
          data && message.options ? (
            <Button variant="primary" onClick={() => message.ask("reply")}>
              {t("acts.reply")}
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
            </>
          ) : undefined
        }
      />
      {data && kind === "question" && questionMenu.form}
      {data && message.form}
      {data && versions.form}
      {data && invite.form}
      {data && eventActs.form}
      {data && CHANGEABLE.has(kind) && change.form}
      {data && page.data?.filed && <FiledLine kind={kind} id={id} filed={page.data.filed} />}
      {data && ownSide && (
        <p className="hint" data-testid="organization-side">
          {t(ownSide.kind === "job" ? "orgs.page.job" : "orgs.page.business")} <a href={viewHref(recordView("project", ownSide.project))}>{t("orgs.page.projects")}</a>
        </p>
      )}
      {data && kind === "fact" && page.data?.fact_source && <FactSource source={page.data.fact_source} fact={id} version={data.version} />}
      {data && <LearnedLines records={[id]} />}
      {record.isPending && <Skeleton />}
      {record.isError && (
        <EmptyState icon="alert" text={t("record.load_failed")} action={{ label: t("action.try_again"), onClick: () => void record.refetch() }} />
      )}
      {data && (
        <div className="record-grid">
          <div className="record-main">
          {kind === "action" && <PromiseWhy action={id} quiet omitOrigin />}
          {kind === "event" && <AgendaSection items={page.data?.agenda ?? []} id="record-agenda" />}
          {kind === "event" && <Attendees fields={data.fields} names={names} />}
          {kind === "event" && <MeetingPrep entry={id} title={heading} />}
          {kind === "person" && !isSelf && <PersonMemory person={id} />}
          {/* What is open comes first, then the conversation, then what finished and the history. */}
          {page.data && <RecordActivity page={page.data} part="open" self={isSelf} />}
          {CONVERSATION_KINDS.has(kind) && <RecordConversation kind={kind} id={id} />}
          {page.data && <RecordActivity page={page.data} part="rest" />}
          {kind === "project" && justMe && id === personal && <Unfiled />}
          {kind === "project" && <SideInside id={id} />}
          {kind === "project" && <ProjectKnows id={id} plain={justMe} />}
          {data.long_text.map((field) => (
            <TextSection
              key={field}
              kind={kind}
              id={id}
              field={field}
              help={has(`field.${field}.help`) ? t(`field.${field}.help`) : info.get(field)?.description || undefined}
              onReview={open}
            />
          ))}
          </div>
          <aside className="record-side">
          <OriginLink origin={data.origin} />
          <section aria-labelledby="record-details">
            <div className="heading">
              <h3 id="record-details">{t(isSelf ? "record.details_you" : "record.details")}</h3>
              {(drawer || offered.length > 0) && !editing && (
                <Button ref={editButton} onClick={() => setEditing(true)}>
                  {t("record.edit")}
                </Button>
              )}
            </div>
            {editing && drawer && kind === "person" && <PersonDrawer person={drawer as S["PersonView"]} onClose={stopEditing} />}
            {editing && drawer && kind === "project" && <ProjectDrawer project={drawer as S["ProjectView"]} onClose={stopEditing} />}
            {editing && !drawer ? (
              <DetailsForm
                kind={kind}
                record={data}
                fields={offered}
                people={people.data ?? []}
                projects={projects.data ?? []}
                onDone={stopEditing}
              />
            ) : !settled ? (
              <Skeleton />
            ) : rows.length === 0 ? (
              <p className="hint">{t("record.no_details")}</p>
            ) : (
              <DefinitionList>
                {rows.map((row) => (
                  <Definition key={row.name}>
                    <dt>{labelOf(row.name)}</dt>
                    <dd>
                      {row.link ? (
                        <div>
                          <a href={row.link.href}>{row.link.text}</a>
                        </div>
                      ) : (
                        row.lines.map((line, i) => (
                          <div key={i}>{typeof line === "string" ? line : <SafeLink label={line.label || domainOf(line.url) || line.url} url={line.url} />}</div>
                        ))
                      )}
                    </dd>
                  </Definition>
                ))}
              </DefinitionList>
            )}
          </section>
          {/* Who someone is to the person is a question about people at work; a person with only their own life isn't asked. */}
          {kind === "person" && !isSelf && !justMe && (
            <StancePicker person={id} version={data.version} stance={data.fields.stance} trackOnly={data.fields.track_only === true} />
          )}
          </aside>
        </div>
      )}
      {dialog}
    </section>
  );
}

/** The fields that name a record: the page's heading says the name, so a detail that repeats it is left out. */
const NAME_FIELDS = new Set<string>(["name", "full_name", "title"]);

/** A yes or no in words: nothing for a no, the wording sheet's phrase for a yes (`flag.<field>`), else "Yes". */
function flagLines(value: unknown, field: string, t: (key: string) => string, has: (key: string) => boolean): string[] {
  if (value !== true) return [];
  return [t(has(`flag.${field}`) ? `flag.${field}` : "value.yes")];
}

/** What a side keeps (a side is a group, not a project): the rest of a project's fields are not listed on its page. */
const SIDE_FIELDS = new Set<string>(["name", "aliases", "summary", "links", "tags", "content_levels", "data_level", "organization"]);

/** What a person's page leaves out when the person is the one the app is for. */
const SELF_HIDDEN = new Set<string>(["name_verified", "track_only", "status", "relation"]);

/** The fields of a calendar entry the page shows in its own way (its people and its answer), or not at all (its key). */
const CALENDAR_LISTED = new Set<string>(["key", "attendees", "organizer", "invitation", "response", "agenda", "captured_at"]);

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
}) {
  const { t } = useWords();
  const labelOf = useFieldLabel();
  const { field: f, id, value } = props;
  const label = labelOf(f.name);
  const text = String(value);
  const required = f.required === true;
  const help = f.description ? `${id}-help` : undefined;
  const note = f.description ? (
    <span id={help} className="hint">
      {f.description}
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
        note={f.description || undefined}
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
