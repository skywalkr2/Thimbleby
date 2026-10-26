// The people step of the walkthrough (design 7.8): the people in the person's life, each with how they relate ("my
// sister", "our neighbor"; the box starts empty, so nobody is filed under a relation nobody chose), and, once a side of
// work is named, each side's people under its own name with their part (manager or colleague at a job; customer,
// supplier, staff or client in a business). The people the person's mail shows most are suggested, each with an Add,
// and a list can be pasted, one name per line. It adds people through the same records the People screen shows, on
// the side they are listed under; no organizations, teams or ids are asked.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { api, ApiError, type S } from "../lib/api";
import { problemText } from "../lib/problem";
import { useWords } from "../lib/wording";
import { Button } from "../ui/Button";

const RELATIONS = [
  "partner",
  "parent",
  "child",
  "sister",
  "brother",
  "friend",
  "neighbor",
  "landlord",
  "school",
  "tradesperson",
  "doctor",
  "other",
] as const;
/** The parts people have at each kind of side, a list to pick from. */
const ROLES = {
  job: ["manager", "colleague", "client", "other"],
  business: ["customer", "supplier", "staff", "client", "other"],
} as const;
const OTHER = "other";
/** The empty choice of a list that starts with nothing chosen. */
const NONE = "";

/** Whose people a section lists: the person's own life, or one side of their work. */
type Whose = { kind: "personal"; id: string | null } | { kind: "job" | "business"; id: string };

/** Where a person added in a section is placed: on its side by id when the person has sides of work (a side word alone
 * can't say which of several), else on the personal or business side. */
function placement(whose: Whose, sided: boolean) {
  return sided && whose.id ? { sides: [whose.id] } : { side: whose.kind === "personal" ? ("personal" as const) : ("business" as const) };
}

/** How a listed person on the personal side relates to the person, set from a list when it was left empty. */
function RelationSet(props: { person: S["PersonView"] }) {
  const { t } = useWords();
  const client = useQueryClient();
  const [problem, setProblem] = useState("");
  const choose = async (word: string) => {
    if (!word) return;
    setProblem("");
    try {
      await api.editPerson(props.person.id, { relation: t(`walkthrough.people.relation.${word}`) });
      await client.invalidateQueries({ queryKey: ["people"] });
    } catch (err) {
      setProblem(err instanceof ApiError && err.detail ? err.detail : problemText(err, t));
    }
  };
  const id = `walkthrough-people-set-${props.person.id}`;
  return (
    <>
      <label className="sr" htmlFor={id}>
        {t("walkthrough.people.relation.set", { name: props.person.name })}
      </label>
      <select id={id} value={NONE} onChange={(e) => void choose(e.target.value)}>
        <option value={NONE}>{t("walkthrough.people.relation.choose")}</option>
        {RELATIONS.filter((o) => o !== OTHER).map((o) => (
          <option key={o} value={o}>
            {t(`walkthrough.people.relation.${o}`)}
          </option>
        ))}
      </select>
      {problem && (
        <span className="problem-note" role="alert">
          {problem}
        </span>
      )}
    </>
  );
}

/** The people the person's mail shows most, each with an Add. They are added with no relation, which the list above
 * then offers to set. Nothing is shown while the server has none to suggest. */
function Suggestions(props: { whose: Whose; sided: boolean }) {
  const { t, tn } = useWords();
  const client = useQueryClient();
  const found = useQuery({ queryKey: ["people-suggestions"], queryFn: api.peopleSuggestions });
  const [problem, setProblem] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const list = found.data?.people ?? [];
  if (list.length === 0) return null;
  const add = async (name: string, address: string) => {
    setBusy(address);
    setProblem("");
    try {
      await api.addSetupPerson({ full_name: name, aliases: [], address, ...placement(props.whose, props.sided) });
      await client.invalidateQueries({ queryKey: ["people"] });
      await client.invalidateQueries({ queryKey: ["people-suggestions"] });
      await client.invalidateQueries({ queryKey: ["setup"] });
    } catch (err) {
      setProblem(err instanceof ApiError && err.detail ? err.detail : problemText(err, t));
    } finally {
      setBusy(null);
    }
  };
  return (
    <section aria-labelledby="walkthrough-people-suggest-title" data-people-suggestions="">
      <h4 id="walkthrough-people-suggest-title">{t("walkthrough.people.suggest.title")}</h4>
      <p className="hint">{t(list[0].from_sent ? "walkthrough.people.suggest.hint_sent" : "walkthrough.people.suggest.hint_received")}</p>
      <ul className="plain-list">
        {list.map((p) => (
          <li key={p.address}>
            <span className="title">{p.name}</span>
            <span className="meta">{tn("walkthrough.people.suggest.mails", p.count)}</span>
            <Button size="sm" loading={busy === p.address} disabled={busy !== null} onClick={() => void add(p.name, p.address)}>
              {t("walkthrough.people.suggest.add", { name: p.name })}
            </Button>
          </li>
        ))}
      </ul>
      {problem && (
        <p className="problem-note" role="alert">
          {problem}
        </p>
      )}
    </section>
  );
}

/** A pasted list, one name per line (or Name <address>); each is added with no relation or part. */
function PasteList(props: { whose: Whose; sided: boolean; id: string }) {
  const { t, tn } = useWords();
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
  const [result, setResult] = useState("");
  const field = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (open) field.current?.focus();
  }, [open]);
  const add = async () => {
    setBusy(true);
    setProblem("");
    setResult("");
    try {
      const done = await api.pastePeople({ text, ...placement(props.whose, props.sided) });
      const added = done.added.length > 0 ? tn("walkthrough.people.paste.added", done.added.length) : t("walkthrough.people.paste.none");
      setResult([added, done.skipped.length > 0 ? t("walkthrough.people.paste.skipped", { names: done.skipped.join(", ") }) : ""].filter(Boolean).join(" "));
      setText("");
      await client.invalidateQueries({ queryKey: ["people"] });
      await client.invalidateQueries({ queryKey: ["people-suggestions"] });
      await client.invalidateQueries({ queryKey: ["setup"] });
    } catch (err) {
      setProblem(err instanceof ApiError && err.detail ? err.detail : problemText(err, t));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="field" data-paste-list="">
      {!open && (
        <div className="row-end">
          <Button onClick={() => setOpen(true)}>{t("walkthrough.people.paste.open")}</Button>
        </div>
      )}
      {open && (
        <>
          <label htmlFor={`${props.id}-paste`}>{t("walkthrough.people.paste.label")}</label>
          <textarea id={`${props.id}-paste`} ref={field} className="msg" value={text} onChange={(e) => setText(e.target.value)} />
          <div className="row-end">
            <Button loading={busy} disabled={!text.trim()} onClick={() => void add()}>
              {t("walkthrough.people.paste.add")}
            </Button>
          </div>
        </>
      )}
      {result && <p role="status">{result}</p>}
      {problem && (
        <p className="problem-note" role="alert">
          {problem}
        </p>
      )}
    </div>
  );
}

function Section(props: { whose: Whose; title: string; people: S["PersonView"][]; sided: boolean }) {
  const { t } = useWords();
  const client = useQueryClient();
  const personal = props.whose.kind === "personal";
  const options: readonly string[] = props.whose.kind === "personal" ? RELATIONS : ROLES[props.whose.kind];
  const group = personal ? "relation" : "role";
  const [name, setName] = useState("");
  // How people relate to the person starts empty, so nobody is filed under a relation nobody chose; a part at work starts on the first.
  const [pick, setPick] = useState<string>(personal ? NONE : options[0]);
  const [other, setOther] = useState("");
  const [problem, setProblem] = useState("");
  const [busy, setBusy] = useState(false);
  const how = pick === NONE ? "" : pick === OTHER ? other.trim() : t(`walkthrough.people.${group}.${pick}`);
  const id = `walkthrough-people-${props.whose.id ?? "personal"}`;

  const add = async () => {
    setBusy(true);
    setProblem("");
    try {
      await api.addPerson({
        full_name: name.trim(),
        aliases: [],
        ...placement(props.whose, props.sided),
        ...(personal ? { relation: how || null } : { role: how || null }),
      });
      setName("");
      setOther("");
      setPick(personal ? NONE : options[0]);
      await client.invalidateQueries({ queryKey: ["people"] });
      await client.invalidateQueries({ queryKey: ["people-suggestions"] });
      await client.invalidateQueries({ queryKey: ["setup"] });
    } catch (err) {
      setProblem(err instanceof ApiError && err.detail ? err.detail : problemText(err, t));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-labelledby={`${id}-title`}>
      <h3 id={`${id}-title`}>{props.title}</h3>
      {props.people.length > 0 && (
        <ul>
          {props.people.map((p) => (
            <li key={p.id}>
              {p.name}
              {(personal ? p.relation : p.role) && <span className="hint"> · {personal ? p.relation : p.role}</span>}
              {personal && !p.relation && <RelationSet person={p} />}
            </li>
          ))}
        </ul>
      )}
      {personal && <Suggestions whose={props.whose} sided={props.sided} />}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim() && (personal ? pick !== OTHER || how : how) && !busy) void add();
        }}
      >
        <div className="field">
          <label htmlFor={`${id}-name`}>{t("walkthrough.people.name")}</label>
          <input id={`${id}-name`} type="text" value={name} autoComplete="off" onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor={`${id}-how`}>{t(`walkthrough.people.${group}.label`)}</label>
          <select id={`${id}-how`} value={pick} onChange={(e) => setPick(e.target.value)}>
            {personal && <option value={NONE}>{t("walkthrough.people.relation.choose")}</option>}
            {options.map((o) => (
              <option key={o} value={o}>
                {t(`walkthrough.people.${group}.${o}`)}
              </option>
            ))}
          </select>
        </div>
        {pick === OTHER && (
          <div className="field">
            <label htmlFor={`${id}-other`}>{t(`walkthrough.people.${group}.other_label`)}</label>
            <input id={`${id}-other`} type="text" value={other} autoComplete="off" onChange={(e) => setOther(e.target.value)} />
          </div>
        )}
        {problem && (
          <p className="problem-note" role="alert">
            {problem}
          </p>
        )}
        <div className="row-end">
          <button type="submit" className="btn" disabled={busy || !name.trim() || (personal ? pick === OTHER && !how : !how)}>
            {t("walkthrough.people.add")}
          </button>
        </div>
      </form>
      <PasteList whose={props.whose} sided={props.sided} id={id} />
    </section>
  );
}

export function WalkthroughPeople() {
  const { t } = useWords();
  const people = useQuery({ queryKey: ["people"], queryFn: api.people });
  const business = useQuery({ queryKey: ["business"], queryFn: api.business });
  if (!people.data) return <p className="empty">{t(people.isError ? "welcome.failed" : "loading")}</p>;
  const others = people.data.filter((p) => !p.is_pm && p.status === "active");
  const listed = business.data?.sides ?? [];
  const personal = business.data?.personal ?? null;
  const sided = listed.length > 0;
  const onSide = (p: S["PersonView"], side: string) => (p.sides ?? []).includes(side);
  const onAnySide = (p: S["PersonView"]) => listed.some((s) => onSide(p, s.project));
  // A person on a side of work is listed there (and on Personal too when they are on both); the rest are Personal's.
  const mine = sided
    ? others.filter((p) => (personal ? onSide(p, personal) : false) || !onAnySide(p))
    : others.filter((p) => p.side !== "business");
  return (
    <>
      <Section whose={{ kind: "personal", id: personal }} title={t("walkthrough.people.personal")} people={mine} sided={sided} />
      {listed.map((side) => (
        <Section
          key={side.project}
          whose={{ kind: side.kind, id: side.project }}
          title={t("walkthrough.people.side", { side: side.name })}
          people={others.filter((p) => onSide(p, side.project))}
          sided={sided}
        />
      ))}
    </>
  );
}
