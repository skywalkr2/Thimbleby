// The people step of the walkthrough (design 7.8): the people in the person's life, each with how they relate ("my
// sister", "our neighbor"), and, once a side of work is named, each side's people under its own name with their part
// (manager or colleague at a job; customer, supplier, staff or client in a business). It adds people through the same
// records the People screen shows, on the side they are listed under; no organizations, teams or ids are asked.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api, ApiError, type S } from "../lib/api";
import { problemText } from "../lib/problem";
import { useWords } from "../lib/wording";

const RELATIONS = ["partner", "parent", "child", "sibling", "friend", "neighbor", "doctor", "other"] as const;
/** The parts people have at each kind of side, a list to pick from. */
const ROLES = {
  job: ["manager", "colleague", "client", "other"],
  business: ["customer", "supplier", "staff", "client", "other"],
} as const;
const OTHER = "other";

/** Whose people a section lists: the person's own life, or one side of their work. */
type Whose = { kind: "personal"; id: string | null } | { kind: "job" | "business"; id: string };

function Section(props: { whose: Whose; title: string; people: S["PersonView"][]; sided: boolean }) {
  const { t } = useWords();
  const client = useQueryClient();
  const personal = props.whose.kind === "personal";
  const options: readonly string[] = props.whose.kind === "personal" ? RELATIONS : ROLES[props.whose.kind];
  const group = personal ? "relation" : "role";
  const [name, setName] = useState("");
  const [pick, setPick] = useState<string>(options[0]);
  const [other, setOther] = useState("");
  const [problem, setProblem] = useState("");
  const [busy, setBusy] = useState(false);
  const how = pick === OTHER ? other.trim() : t(`walkthrough.people.${group}.${pick}`);
  const id = `walkthrough-people-${props.whose.id ?? "personal"}`;

  const add = async () => {
    setBusy(true);
    setProblem("");
    try {
      await api.addPerson({
        full_name: name.trim(),
        aliases: [],
        // With sides of work, a person is placed on a side by its id; a side word alone can't say which of several.
        ...(props.sided && props.whose.id ? { sides: [props.whose.id] } : { side: personal ? "personal" : "business" }),
        ...(personal ? { relation: how || null } : { role: how || null }),
      });
      setName("");
      setOther("");
      await client.invalidateQueries({ queryKey: ["people"] });
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
            </li>
          ))}
        </ul>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim() && how && !busy) void add();
        }}
      >
        <div className="field">
          <label htmlFor={`${id}-name`}>{t("walkthrough.people.name")}</label>
          <input id={`${id}-name`} type="text" value={name} autoComplete="off" onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor={`${id}-how`}>{t(`walkthrough.people.${group}.label`)}</label>
          <select id={`${id}-how`} value={pick} onChange={(e) => setPick(e.target.value)}>
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
          <button type="submit" className="btn" disabled={busy || !name.trim() || !how}>
            {t("walkthrough.people.add")}
          </button>
        </div>
      </form>
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
