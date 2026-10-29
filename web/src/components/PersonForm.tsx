// A person's form, in a drawer from the right so the list or screen it was opened from stays in view (design 7.14). It adds a
// person or edits one, after setup as well as in it: their name, other names, the sides of the person's life they belong to
// (ticked from the list of sides), who they are to the person (on Personal) or their part and organization (on a side of work),
// and how to reach them (one box for each kind of contact detail the workspace offers). Both act at once with Undo. A name that is
// already on file is said beside the field while it is typed, and any refusal is shown in the form, where the person is looking.
// `onSaved` hears the new or edited person's id, so a picker can select who was just added without leaving the screen.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api, type S } from "../lib/api";
import { problemText } from "../lib/problem";
import { readable } from "../lib/records";
import { useFirstField } from "../lib/focus";
import { useSideFilter, useSides } from "../lib/sides";
import { useToasts } from "../lib/toasts";
import { useWords } from "../lib/wording";
import { Button } from "../ui/Button";
import { CheckboxGroup } from "../ui/CheckboxGroup";
import { Drawer } from "../ui/Drawer";
import { OrgSelect } from "./OrgSelect";
import { FormField } from "../ui/FormField";
import { DateField } from "../ui/DateField";
import styles from "./PersonForm.module.css";

export const list = (text: string) =>
  text
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

/** A labelled text box (or date); the form fields of the records screens share this. */
export function Field(props: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: React.ReactNode;
  type?: string;
  required?: boolean;
  invalid?: boolean;
}) {
  return (
    <FormField id={props.id} label={props.label} hint={props.hint}>
      {props.type === "date" ? (
        <DateField id={props.id} value={props.value} required={props.required} onChange={(e) => props.onChange(e.target.value)} />
      ) : (
        <input
          id={props.id}
          type={props.type ?? "text"}
          value={props.value}
          required={props.required}
          aria-invalid={props.invalid || undefined}
          aria-describedby={props.hint ? `${props.id}-hint` : undefined}
          autoComplete="off"
          onChange={(e) => props.onChange(e.target.value)}
        />
      )}
    </FormField>
  );
}

/** The kinds of contact detail the workspace offers, in its order; email and phone while the setting can't be read. */
export function useContactKinds(): string[] {
  const settings = useQuery({ queryKey: ["settings"], queryFn: api.settings });
  const kinds = settings.data?.items.find((item) => item.key === "workspace.contact_kinds")?.value;
  return Array.isArray(kinds) && kinds.length > 0 ? kinds.map(String) : ["email", "phone"];
}

/** A contact kind as a label: the first letter a capital ("email" is "Email"). */
export const kindLabel = (kind: string) => readable(kind);

/** The person already on file under this name, other than the one being edited; none for a name not yet used. */
export function sameName(people: S["PersonView"][], name: string, except?: string): S["PersonView"] | undefined {
  const wanted = name.trim().toLocaleLowerCase();
  return wanted ? people.find((p) => p.id !== except && p.name.trim().toLocaleLowerCase() === wanted) : undefined;
}

export function PersonDrawer(props: {
  person?: S["PersonView"];
  /** The name typed so far when the form opens from a picker, if any. */
  onClose: () => void;
  onSaved?: (id: string, name: string) => void;
}) {
  const { t } = useWords();
  const client = useQueryClient();
  const { push } = useToasts();
  const p = props.person;
  const key = p?.id ?? "new";
  const people = useQuery({ queryKey: ["people"], queryFn: api.people });
  const kinds = useContactKinds();
  const { justMe, personal, sides } = useSides();
  const filter = useSideFilter();
  const [name, setName] = useState(p?.name ?? "");
  const [firstName, setFirstName] = useState(p?.first_name ?? "");
  const [role, setRole] = useState(p?.role ?? "");
  const [org, setOrg] = useState(p?.org ?? "");
  const [relation, setRelation] = useState(p?.relation ?? "");
  const [aliases, setAliases] = useState(p?.aliases.join(", ") ?? "");
  const [reach, setReach] = useState<Record<string, string>>(p?.how_to_reach ?? {});
  // The places a person can belong to: Personal and each side of work. A new person starts on the side the screen is
  // showing, else Personal; an old one on the sides their record names, none being "not known".
  const places = [...(personal ? [{ id: personal, name: t("sides.filter.personal"), work: false }] : []), ...sides.map((s) => ({ id: s.project, name: s.name, work: true }))];
  const held = (p?.sides ?? []).filter((id) => places.some((pl) => pl.id === id));
  // Until the person ticks something the sides are the ones a new person starts with, which can still be on their way when the
  // form opens; an old one's are the ones their record names.
  const [picked, setPicked] = useState<string[] | null>(null);
  const starting = p ? held : filter.choice !== "all" ? [filter.choice] : personal ? [personal] : [];
  const ticked = picked ?? starting;
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
  const first = useFirstField<HTMLFormElement>();

  const sided = !justMe && sides.length > 0;
  const onPersonal = !sided || (personal !== null && ticked.includes(personal)) || ticked.length === 0;
  const onWork = sided && sides.some((s) => ticked.includes(s.project));
  const twin = sameName(people.data ?? [], name, p?.id);
  const sameSides = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x));
  const reachNow = Object.fromEntries(Object.entries(reach).filter(([, v]) => v.trim()));
  const dirty =
    name !== (p?.name ?? "") ||
    firstName !== (p?.first_name ?? "") ||
    role !== (p?.role ?? "") ||
    org !== (p?.org ?? "") ||
    relation !== (p?.relation ?? "") ||
    aliases !== (p?.aliases.join(", ") ?? "") ||
    JSON.stringify(reachNow) !== JSON.stringify(p?.how_to_reach ?? {}) ||
    (sided && picked !== null && !sameSides(ticked, p ? held : []));
  const formId = `person-form-${key}`;
  const needSide = sided && ticked.length === 0;
  const blocked = !name.trim() || !!twin || needSide;
  const reason = !name.trim() ? t("setup.name_missing") : twin ? t("person.dup_reason") : t("person.side_missing");

  const toggle = (id: string) => setPicked(ticked.includes(id) ? ticked.filter((x) => x !== id) : [...ticked, id]);

  const save = async () => {
    if (blocked || busy) return;
    setBusy(true);
    setProblem("");
    const body: S["PersonIn"] = {
      full_name: name.trim(),
      first_name: firstName.trim() || null,
      aliases: list(aliases),
      how_to_reach: reachNow,
      ...(onPersonal ? { relation: relation.trim() || null } : {}),
      ...(!justMe && (!sided || onWork) ? { role: role.trim() || null, org: org || null } : {}),
      ...(sided ? { sides: ticked } : {}),
    };
    try {
      let id: string;
      if (p) {
        id = p.id;
        await api.editPerson(p.id, body);
        const before = {
          full_name: p.name,
          first_name: p.first_name,
          relation: p.relation,
          role: p.role,
          org: p.org,
          aliases: p.aliases,
          how_to_reach: p.how_to_reach,
          ...(sided ? { sides: p.sides } : {}),
        };
        await client.invalidateQueries();
        push({ message: t("toast.saved", { name: body.full_name }), undo: async () => { await api.editPerson(p.id, before); await client.invalidateQueries(); } });
      } else {
        const created = await api.addPerson(body);
        id = created.id;
        await client.invalidateQueries();
        push({ message: t("toast.added", { name: body.full_name }), undo: async () => { await api.removePerson(created.id); await client.invalidateQueries(); } });
      }
      props.onSaved?.(id, body.full_name);
      props.onClose();
    } catch (err) {
      // The reason stays in the form, beside what was typed, rather than in a message behind it.
      setProblem(problemText(err, t));
      setBusy(false);
    }
  };

  return (
    <Drawer
      open
      title={t(p ? "person.edit_title" : "person.add_title")}
      dirty={dirty}
      onClose={props.onClose}
      footer={
        <>
          <Button onClick={props.onClose}>{t("action.cancel")}</Button>
          <Button variant="primary" type="submit" form={formId} disabled={blocked || busy} reason={reason}>
            {t(p ? "setup.save" : "setup.add_person")}
          </Button>
        </>
      }
    >
      <form
        id={formId}
        ref={first}
        className="setup-form"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <Field
          id={`pn-${key}`}
          label={t("setup.full_name")}
          value={name}
          onChange={setName}
          required
          invalid={!!twin}
          hint={twin ? <span className={styles.problem}>{t("person.dup", { name: twin.name })}</span> : undefined}
        />
        <Field id={`pf-${key}`} label={t("setup.first_name")} value={firstName} onChange={setFirstName} hint={t("setup.first_name_hint")} />
        <Field id={`pa-${key}`} label={t("setup.aliases")} value={aliases} onChange={setAliases} hint={t("setup.aliases_hint")} />
        {sided && (
          <CheckboxGroup legend={t("person.sides")} hint={t("person.sides_hint")}>
            {places.map((pl) => (
              <label key={pl.id} className="check-line">
                <input type="checkbox" checked={ticked.includes(pl.id)} onChange={() => toggle(pl.id)} />
                <span>{pl.name}</span>
              </label>
            ))}
          </CheckboxGroup>
        )}
        {onPersonal && <Field id={`pl-${key}`} label={t("setup.relation")} value={relation} onChange={setRelation} hint={t("setup.relation_hint")} />}
        {(!sided || onWork) && !justMe && (
          <>
            <Field id={`pr-${key}`} label={t("setup.role")} value={role} onChange={setRole} hint={t("setup.role_hint")} />
            <OrgSelect id={`po-${key}`} label={t("setup.org")} value={org} onChange={setOrg} hint={t("setup.org_hint")} />
          </>
        )}
        {kinds.map((kind) => (
          <Field
            key={kind}
            id={`pk-${kind}-${key}`}
            label={kindLabel(kind)}
            type={kind.toLocaleLowerCase() === "email" ? "email" : "text"}
            value={reach[kind] ?? ""}
            onChange={(v) => setReach((now) => ({ ...now, [kind]: v }))}
          />
        ))}
        {problem && (
          <div className="problem-note" role="alert">
            <p>{problem}</p>
          </div>
        )}
      </form>
    </Drawer>
  );
}
