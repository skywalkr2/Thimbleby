// The people step of the walkthrough (design 7.8): the real people the person writes to are suggested from their mail,
// one row each with a tick box for every side (Personal and each business or job) and one "Add these" for the ticked
// rows. One add row serves the whole step: a name, who they are (how they relate to the person, or their part at a
// business or job), the side when there is one, and Add; "Paste a list" is a link under it. The people already added
// are listed under their side with the relation still to set. It adds people through the same records the People screen
// shows; no organizations, teams or ids are asked.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { api, ApiError, type S } from "../lib/api";
import { problemText } from "../lib/problem";
import { useWords } from "../lib/wording";
import { Button } from "../ui/Button";
import { Skeleton } from "../ui/Skeleton";
import styles from "./WalkthroughPeople.module.css";

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
  job: ["manager", "colleague", "customer", "other"],
  business: ["customer", "supplier", "staff", "other"],
} as const;
const OTHER = "other";
/** The empty choice of a list that starts with nothing chosen. */
const NONE = "";

/** Whose people a section lists: the person's own life, or one side of their work. */
type Whose = { kind: "personal"; id: string | null } | { kind: "job" | "business"; id: string };

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

/** Where a person can be added: Personal and each side of work, each by name. `key` is the side's id (or "personal"). */
type Place = { key: string; name: string; whose: Whose };

const PERSONAL_KEY = "personal";

/** Where a person goes who is ticked on these places: on those sides by id when the person has sides of work, else on
 * the personal or business side by word. */
function placementFor(places: Place[], sided: boolean) {
  const ids = places.map((p) => p.whose.id).filter((id): id is string => !!id);
  return sided && ids.length > 0 ? { sides: ids } : { side: places.some((p) => p.whose.kind !== "personal") ? ("business" as const) : ("personal" as const) };
}

/** The real people the person writes to, one row each: their name and address and a tick box for each place they could go.
 * One "Add these" adds every ticked row, with no relation, which the lists below then offer to set. With no one to
 * suggest the section says so in one line. */
function Suggestions(props: { places: Place[]; sided: boolean }) {
  const { t, tn } = useWords();
  const client = useQueryClient();
  const found = useQuery({ queryKey: ["people-suggestions"], queryFn: api.peopleSuggestions });
  const [ticked, setTicked] = useState<Record<string, string[]>>({});
  const [problem, setProblem] = useState("");
  const [busy, setBusy] = useState(false);
  if (!found.data) return null;
  const list = found.data.people;
  const chosen = list.filter((p) => (ticked[p.address] ?? []).length > 0);
  const toggle = (address: string, key: string) =>
    setTicked((was) => {
      const held = was[address] ?? [];
      return { ...was, [address]: held.includes(key) ? held.filter((k) => k !== key) : [...held, key] };
    });
  const addThese = async () => {
    setBusy(true);
    setProblem("");
    const failed: string[] = [];
    for (const p of chosen) {
      const where = props.places.filter((place) => (ticked[p.address] ?? []).includes(place.key));
      try {
        await api.addSetupPerson({ full_name: p.name, aliases: [], address: p.address, ...placementFor(where, props.sided) });
      } catch (err) {
        failed.push(`${p.name}: ${err instanceof ApiError && err.detail ? err.detail : problemText(err, t)}`);
      }
    }
    setTicked({});
    setProblem(failed.join(" "));
    await client.invalidateQueries({ queryKey: ["people"] });
    await client.invalidateQueries({ queryKey: ["people-suggestions"] });
    await client.invalidateQueries({ queryKey: ["setup"] });
    setBusy(false);
  };
  return (
    <section aria-labelledby="walkthrough-people-suggest-title" data-people-suggestions="">
      <h3 id="walkthrough-people-suggest-title">{t("walkthrough.people.suggest.title")}</h3>
      {list.length === 0 ? (
        <p className="hint">{t("walkthrough.people.suggest.none")}</p>
      ) : (
        <>
          <p className="hint">{t(list[0].from_sent ? "walkthrough.people.suggest.hint_sent" : "walkthrough.people.suggest.hint_received")}</p>
          <ul className={styles.suggested}>
            {list.map((p) => (
              <li key={p.address}>
                <span className={styles.who}>
                  <span className="title">{p.name}</span>
                  <span className="meta">
                    {p.address} · {tn("walkthrough.people.suggest.mails", p.count)}
                  </span>
                </span>
                <fieldset className={styles.places}>
                  <legend className="sr">{t("walkthrough.people.suggest.add_to_legend", { name: p.name })}</legend>
                  {props.places.map((place) => (
                    <label key={place.key}>
                      <input type="checkbox" checked={(ticked[p.address] ?? []).includes(place.key)} disabled={busy} onChange={() => toggle(p.address, place.key)} />
                      {place.name}
                    </label>
                  ))}
                </fieldset>
              </li>
            ))}
          </ul>
          <div className="row-end">
            <Button variant="primary" loading={busy} disabled={chosen.length === 0} reason={t("walkthrough.people.suggest.tick_first")} onClick={() => void addThese()}>
              {t("walkthrough.people.suggest.add_these")}
            </Button>
          </div>
        </>
      )}
      {problem && (
        <p className="problem-note" role="alert">
          {problem}
        </p>
      )}
    </section>
  );
}

/** A pasted list, one name per line (or Name <address>), added to the side chosen in the add row; each is added with no
 * relation or part. It opens from a link under the add row. */
function PasteList(props: { place: Place; sided: boolean }) {
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
      const done = await api.pastePeople({ text, ...placementFor([props.place], props.sided) });
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
        <div>
          <button type="button" className="link-button" aria-expanded={false} onClick={() => setOpen(true)}>
            {t("walkthrough.people.paste.open")}
          </button>
        </div>
      )}
      {open && (
        <>
          <label htmlFor="walkthrough-people-paste">
            {props.sided ? t("walkthrough.people.paste.label_side", { side: props.place.name }) : t("walkthrough.people.paste.label")}
          </label>
          <textarea id="walkthrough-people-paste" ref={field} className="msg" value={text} onChange={(e) => setText(e.target.value)} />
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

/** The people already added to one side, each with how they relate (or their part); on Personal, one with no relation yet
 * can be given one from a list. */
function Listed(props: { whose: Whose; title: string; people: S["PersonView"][] }) {
  const personal = props.whose.kind === "personal";
  const id = `walkthrough-people-${props.whose.id ?? PERSONAL_KEY}`;
  if (props.people.length === 0) return null;
  return (
    <section aria-labelledby={`${id}-title`}>
      <h3 id={`${id}-title`}>{props.title}</h3>
      <ul>
        {props.people.map((p) => (
          <li key={p.id}>
            {p.name}
            {(personal ? p.relation : p.role) && <span className="hint"> · {personal ? p.relation : p.role}</span>}
            {personal && !p.relation && <RelationSet person={p} />}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** The one row that adds a person for the whole step: a name, who they are, the side (only when there is a business or
 * job) and Add. It sits on one line where it fits and stacks on a narrow window. */
function AddRow(props: { place: Place; places: Place[]; sided: boolean; onPlace: (key: string) => void }) {
  const { t } = useWords();
  const client = useQueryClient();
  const personal = props.place.whose.kind === "personal";
  const options: readonly string[] = personal ? RELATIONS : ROLES[props.place.whose.kind as "job" | "business"];
  const group = personal ? "relation" : "role";
  const [name, setName] = useState("");
  // How people relate to the person starts empty, so nobody is filed under a relation nobody chose; a part at work starts on the first.
  const [pick, setPick] = useState<string>(personal ? NONE : options[0]);
  const [other, setOther] = useState("");
  const [problem, setProblem] = useState("");
  const [busy, setBusy] = useState(false);
  const how = pick === NONE ? "" : pick === OTHER ? other.trim() : t(`walkthrough.people.${group}.${pick}`);
  const ready = !!name.trim() && (personal ? pick !== OTHER || !!how : !!how);
  const choosePlace = (key: string) => {
    const next = props.places.find((p) => p.key === key);
    if (!next) return;
    props.onPlace(key);
    setPick(next.whose.kind === "personal" ? NONE : ROLES[next.whose.kind][0]);
    setOther("");
  };

  const add = async () => {
    setBusy(true);
    setProblem("");
    try {
      await api.addPerson({
        full_name: name.trim(),
        aliases: [],
        ...placementFor([props.place], props.sided),
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

  const id = "walkthrough-people-add";
  return (
    <form
      aria-label={t("walkthrough.people.add_title")}
      onSubmit={(e) => {
        e.preventDefault();
        if (ready && !busy) void add();
      }}
    >
      <div className={styles.addRow}>
        <div className="field">
          <label htmlFor={`${id}-name`}>{t("walkthrough.people.name")}</label>
          <input id={`${id}-name`} type="text" value={name} autoComplete="off" onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor={`${id}-how`}>{t("walkthrough.people.who")}</label>
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
        {props.sided && (
          <div className="field">
            <label htmlFor={`${id}-side`}>{t("walkthrough.people.side_label")}</label>
            <select id={`${id}-side`} value={props.place.key} onChange={(e) => choosePlace(e.target.value)}>
              {props.places.map((place) => (
                <option key={place.key} value={place.key}>
                  {place.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className={styles.addButton}>
          <button type="submit" className="btn" disabled={busy || !ready}>
            {t("walkthrough.people.add")}
          </button>
        </div>
      </div>
      {problem && (
        <p className="problem-note" role="alert">
          {problem}
        </p>
      )}
    </form>
  );
}

export function WalkthroughPeople() {
  const { t } = useWords();
  const people = useQuery({ queryKey: ["people"], queryFn: api.people });
  const business = useQuery({ queryKey: ["business"], queryFn: api.business });
  const [where, setWhere] = useState(PERSONAL_KEY);
  if (!people.data) return people.isError ? <p className="empty">{t("welcome.failed")}</p> : <Skeleton rows={2} />;
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
  const places: Place[] = [
    { key: PERSONAL_KEY, name: t("nav.personal"), whose: { kind: "personal", id: personal } },
    ...listed.map((side): Place => ({ key: side.project, name: side.name, whose: { kind: side.kind, id: side.project } })),
  ];
  const place = places.find((p) => p.key === where) ?? places[0];
  return (
    <>
      <Suggestions places={places} sided={sided} />
      <Listed whose={{ kind: "personal", id: personal }} title={t("walkthrough.people.personal")} people={mine} />
      {listed.map((side) => (
        <Listed
          key={side.project}
          whose={{ kind: side.kind, id: side.project }}
          title={t("walkthrough.people.side", { side: side.name })}
          people={others.filter((p) => onSide(p, side.project))}
        />
      ))}
      <AddRow place={place} places={places} sided={sided} onPlace={setWhere} />
      <PasteList place={place} sided={sided} />
    </>
  );
}
