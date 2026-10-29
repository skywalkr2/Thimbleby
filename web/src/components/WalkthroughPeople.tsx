// The people step of the walkthrough (design 7.8): the real people the person writes to are suggested from their mail,
// one row each with a tick box for every side (Personal and each business or job) and one "Add these" for the ticked
// rows. One add row serves the whole step: a name, who they are (how they relate to the person, or their part at a
// business or job), the side when there is one, and Add; "Paste a list" is a link under it. The people already added
// are listed under their side with the relation still to set. It adds people through the same records the People screen
// shows; no organizations, teams or ids are asked.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { api, ApiError, type S } from "../lib/api";
import { useAct } from "../lib/act";
import { useDraftState } from "../lib/draft";
import { problemText } from "../lib/problem";
import { useWords } from "../lib/wording";
import { Button } from "../ui/Button";
import { Skeleton } from "../ui/Skeleton";
import styles from "./WalkthroughPeople.module.css";

import { EmptyState } from "../ui/EmptyState";
import { Select } from "../ui/Select";
import { FormField } from "../ui/FormField";
import { FormBlock } from "../ui/FormBlock";
import { CheckboxGroup } from "../ui/CheckboxGroup";
import { Actions } from "../ui/Actions";
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

/** How a listed person relates to the person (on the personal side) or what their part is (at a job or business), set from a
 * list when it was left empty. "Someone else" and "Something else" ask for the person's own words before they are saved. */
function HowSet(props: { person: S["PersonView"]; options: readonly string[]; group: "relation" | "role" }) {
  const { t } = useWords();
  const client = useQueryClient();
  const [problem, setProblem] = useState("");
  const [picked, setPicked] = useState(NONE);
  const [words, setWords] = useState("");
  const save = async (text: string) => {
    setProblem("");
    try {
      await api.editPerson(props.person.id, { [props.group]: text });
      await client.invalidateQueries({ queryKey: ["people"] });
    } catch (err) {
      setProblem(err instanceof ApiError && err.detail ? err.detail : problemText(err, t));
    }
  };
  const choose = (word: string) => {
    setPicked(word);
    if (word && word !== OTHER) void save(t(`walkthrough.people.${props.group}.${word}`));
  };
  const id = `walkthrough-people-set-${props.person.id}`;
  return (
    <>
      <label className="sr" htmlFor={id}>
        {t(props.group === "relation" ? "walkthrough.people.relation.set" : "walkthrough.people.role.set", { name: props.person.name })}
      </label>
      <Select id={id} value={picked} onChange={(e) => choose(e.target.value)}>
        <option value={NONE}>{t("walkthrough.people.relation.choose")}</option>
        {props.options.map((o) => (
          <option key={o} value={o}>
            {t(`walkthrough.people.${props.group}.${o}`)}
          </option>
        ))}
      </Select>
      {picked === OTHER && (
        <span className="inline-field">
          <label className="sr" htmlFor={`${id}-words`}>
            {t(`walkthrough.people.${props.group}.other_label`)}
          </label>
          <input id={`${id}-words`} type="text" value={words} autoComplete="off" onChange={(e) => setWords(e.target.value)} />
          <Button size="sm" disabled={!words.trim()} onClick={() => void save(words.trim())}>
            {t("walkthrough.people.other_save")}
          </Button>
        </span>
      )}
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
  // Everyone found was added in this visit, so an empty list says they were all added instead of there being no one.
  const [allAdded, setAllAdded] = useState(false);
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
    if (failed.length === 0 && chosen.length > 0) setAllAdded(true);
    await client.invalidateQueries({ queryKey: ["people"] });
    await client.invalidateQueries({ queryKey: ["people-suggestions"] });
    await client.invalidateQueries({ queryKey: ["setup"] });
    setBusy(false);
  };
  // With no mail to learn from there is nothing to say: a heading over nothing is left out.
  if (list.length === 0 && !allAdded) return null;
  return (
    <section aria-labelledby="walkthrough-people-suggest-title" data-people-suggestions="">
      <h3 id="walkthrough-people-suggest-title">{t("walkthrough.people.suggest.title")}</h3>
      {list.length === 0 ? (
        <p className="hint">{t("walkthrough.people.suggest.all_added")}</p>
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
                <CheckboxGroup legend={t("walkthrough.people.suggest.add_to_legend", { name: p.name })} className={styles.places}>
                  {props.places.map((place) => (
                    <label key={place.key}>
                      <input type="checkbox" checked={(ticked[p.address] ?? []).includes(place.key)} disabled={busy} onChange={() => toggle(p.address, place.key)} />
                      {place.name}
                    </label>
                  ))}
                </CheckboxGroup>
              </li>
            ))}
          </ul>
          <Actions align="end">
            <Button variant="primary" loading={busy} disabled={chosen.length === 0} reason={t("walkthrough.people.suggest.tick_first")} onClick={() => void addThese()}>
              {t("walkthrough.people.suggest.add_these")}
            </Button>
          </Actions>
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

/** A pasted list, one name per line (or Name <address>, each optionally followed by how they relate), added to the side
 * chosen in the add row. What it will add is shown first, with the lines that don't read as a person left out and said;
 * nothing is added until the person says so. It opens from a link under the add row. */
function PasteList(props: { place: Place; sided: boolean }) {
  const { t, tn } = useWords();
  const client = useQueryClient();
  const [text, setText] = useDraftState("people", "pasted-list", "");
  const [open, setOpen] = useState(text !== "");
  const [preview, setPreview] = useState<S["PeoplePastePreview"] | null>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
  const [result, setResult] = useState("");
  const field = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (open && !preview) field.current?.focus();
  }, [open, preview]);
  const where = placementFor([props.place], props.sided);
  const show = async () => {
    setBusy(true);
    setProblem("");
    setResult("");
    try {
      setPreview(await api.previewPaste({ text, ...where }));
    } catch (err) {
      setProblem(err instanceof ApiError && err.detail ? err.detail : problemText(err, t));
    } finally {
      setBusy(false);
    }
  };
  const add = async () => {
    setBusy(true);
    setProblem("");
    try {
      const done = await api.pastePeople({ text, ...where });
      const added = done.added.length > 0 ? tn("walkthrough.people.paste.added", done.added.length) : t("walkthrough.people.paste.none");
      setResult([added, done.skipped.length > 0 ? t("walkthrough.people.paste.skipped", { names: done.skipped.join(", ") }) : ""].filter(Boolean).join(" "));
      setText("");
      setPreview(null);
      await client.invalidateQueries({ queryKey: ["people"] });
      await client.invalidateQueries({ queryKey: ["people-suggestions"] });
      await client.invalidateQueries({ queryKey: ["setup"] });
    } catch (err) {
      setProblem(err instanceof ApiError && err.detail ? err.detail : problemText(err, t));
    } finally {
      setBusy(false);
    }
  };
  const fresh = preview?.people.filter((p) => !p.on_file) ?? [];
  const known = preview?.people.filter((p) => p.on_file) ?? [];
  return (
    <FormBlock data-paste-list="">
      {!open && (
        <div>
          <button type="button" className="link-button" aria-expanded={false} onClick={() => setOpen(true)}>
            {t("walkthrough.people.paste.open")}
          </button>
        </div>
      )}
      {open && !preview && (
        <>
          <label htmlFor="walkthrough-people-paste">
            {props.sided ? t("walkthrough.people.paste.label_side", { side: props.place.name }) : t("walkthrough.people.paste.label")}
          </label>
          <textarea id="walkthrough-people-paste" ref={field} className="msg" value={text} onChange={(e) => setText(e.target.value)} />
          <Actions align="end">
            <Button loading={busy} disabled={!text.trim()} onClick={() => void show()}>
              {t("walkthrough.people.paste.show")}
            </Button>
          </Actions>
        </>
      )}
      {open && preview && (
        <section aria-labelledby="walkthrough-people-preview-title" data-paste-preview="">
          <h3 id="walkthrough-people-preview-title">{t("walkthrough.people.paste.preview_title")}</h3>
          {fresh.length === 0 ? (
            <p className="hint">{t("walkthrough.people.paste.none")}</p>
          ) : (
            <ul>
              {fresh.map((p) => (
                <li key={p.name}>
                  {p.name}
                  {(p.relation || p.address) && <span className="hint"> · {[p.relation, p.address].filter(Boolean).join(" · ")}</span>}
                </li>
              ))}
            </ul>
          )}
          {known.length > 0 && <p className="hint">{t("walkthrough.people.paste.skipped", { names: known.map((p) => p.name).join(", ") })}</p>}
          {preview.left_out.length > 0 && (
            <p className="hint">{t("walkthrough.people.paste.left_out", { lines: preview.left_out.join(", ") })}</p>
          )}
          <Actions align="end">
            <Button disabled={busy} onClick={() => setPreview(null)}>
              {t("walkthrough.people.paste.change")}
            </Button>
            <Button variant="primary" loading={busy} disabled={fresh.length === 0} onClick={() => void add()}>
              {tn("walkthrough.people.paste.add_n", fresh.length)}
            </Button>
          </Actions>
        </section>
      )}
      {result && <p role="status">{result}</p>}
      {problem && (
        <p className="problem-note" role="alert">
          {problem}
        </p>
      )}
    </FormBlock>
  );
}

/** The people already added to one side, each with how they relate (or their part); on Personal, one with no relation yet
 * can be given one from a list. */
function Listed(props: { whose: Whose; title: string; people: S["PersonView"][] }) {
  const { t } = useWords();
  const act = useAct();
  const personal = props.whose.kind === "personal";
  const id = `walkthrough-people-${props.whose.id ?? PERSONAL_KEY}`;
  if (props.people.length === 0) return null;
  // Taking someone back out acts at once, with an Undo that puts them back.
  const remove = (p: S["PersonView"]) =>
    void act(
      () => api.removePerson(p.id),
      () => ({ message: t("toast.removed", { name: p.name }), undo: () => api.restorePerson(p.id) }),
    );
  return (
    <section aria-labelledby={`${id}-title`}>
      <h3 id={`${id}-title`}>{props.title}</h3>
      <ul>
        {props.people.map((p) => (
          <li key={p.id}>
            {p.name}
            {(personal ? p.relation : p.role) && <span className="hint"> · {personal ? p.relation : p.role}</span>}
            {!(personal ? p.relation : p.role) && (
              <HowSet person={p} group={personal ? "relation" : "role"} options={personal ? RELATIONS : ROLES[props.whose.kind as "job" | "business"]} />
            )}{" "}
            <Button size="sm" aria-label={t("walkthrough.people.remove_named", { name: p.name })} onClick={() => remove(p)}>
              {t("setup.remove")}
            </Button>
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
  const [name, setName] = useDraftState("people", "name", "");
  // How people relate to the person, or their part at work, starts empty, so nobody is filed under one nobody chose.
  const [pick, setPick] = useState<string>(NONE);
  const [other, setOther] = useState("");
  const [problem, setProblem] = useState("");
  const [busy, setBusy] = useState(false);
  const how = pick === NONE ? "" : pick === OTHER ? other.trim() : t(`walkthrough.people.${group}.${pick}`);
  const ready = !!name.trim() && (pick !== OTHER || !!how);
  const choosePlace = (key: string) => {
    const next = props.places.find((p) => p.key === key);
    if (!next) return;
    props.onPlace(key);
    setPick(NONE);
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
      setPick(NONE);
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
        <FormField id={`${id}-name`} label={t("walkthrough.people.name")}>
          <input id={`${id}-name`} type="text" value={name} autoComplete="off" onChange={(e) => setName(e.target.value)} />
        </FormField>
        <FormField id={`${id}-how`} label={t("walkthrough.people.who")}>
          <Select id={`${id}-how`} value={pick} onChange={(e) => setPick(e.target.value)}>
            <option value={NONE}>{t("walkthrough.people.relation.choose")}</option>
            {options.map((o) => (
              <option key={o} value={o}>
                {t(`walkthrough.people.${group}.${o}`)}
              </option>
            ))}
          </Select>
        </FormField>
        {pick === OTHER && (
          <FormField id={`${id}-other`} label={t(`walkthrough.people.${group}.other_label`)}>
            <input id={`${id}-other`} type="text" value={other} autoComplete="off" onChange={(e) => setOther(e.target.value)} />
          </FormField>
        )}
        {props.sided && (
          <FormField id={`${id}-side`} label={t("walkthrough.people.side_label")}>
            <Select id={`${id}-side`} value={props.place.key} onChange={(e) => choosePlace(e.target.value)}>
              {props.places.map((place) => (
                <option key={place.key} value={place.key}>
                  {place.name}
                </option>
              ))}
            </Select>
          </FormField>
        )}
        <div className={styles.addButton}>
          <Button type="submit" disabled={busy || !ready}>
            {t("walkthrough.people.add")}
          </Button>
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
  if (!people.data) return people.isError ? <EmptyState text={t("welcome.failed")} /> : <Skeleton rows={2} />;
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
