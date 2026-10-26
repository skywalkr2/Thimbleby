// The people step of the walkthrough (design 7.8): the people in the person's life, each with how they relate ("my
// sister", "our neighbor"), and, once a business is named, the business's people with their part (customer, supplier).
// It adds people through the same records the People screen shows; no organizations, teams or ids are asked.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api, ApiError, type S } from "../lib/api";
import { problemText } from "../lib/problem";
import { useWords } from "../lib/wording";

const RELATIONS = ["partner", "parent", "child", "sibling", "friend", "neighbor", "doctor", "other"] as const;
const ROLES = ["customer", "supplier", "staff", "colleague", "manager", "other"] as const;
const OTHER = "other";

function Section(props: { side: "personal" | "business"; title: string; people: S["PersonView"][] }) {
  const { t } = useWords();
  const client = useQueryClient();
  const options = props.side === "personal" ? RELATIONS : ROLES;
  const group = props.side === "personal" ? "relation" : "role";
  const [name, setName] = useState("");
  const [pick, setPick] = useState<string>(options[0]);
  const [other, setOther] = useState("");
  const [problem, setProblem] = useState("");
  const [busy, setBusy] = useState(false);
  const how = pick === OTHER ? other.trim() : t(`walkthrough.people.${group}.${pick}`);
  const id = `walkthrough-people-${props.side}`;

  const add = async () => {
    setBusy(true);
    setProblem("");
    try {
      await api.addPerson({
        full_name: name.trim(),
        aliases: [],
        side: props.side,
        ...(props.side === "personal" ? { relation: how || null } : { role: how || null }),
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
              {(props.side === "personal" ? p.relation : p.role) && <span className="hint"> · {props.side === "personal" ? p.relation : p.role}</span>}
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
  const work = others.filter((p) => p.side === "business");
  const mine = others.filter((p) => p.side !== "business");
  return (
    <>
      <Section side="personal" title={t("walkthrough.people.personal")} people={mine} />
      {business.data?.business && (
        <Section side="business" title={t("walkthrough.people.business", { business: business.data.name ?? "" })} people={work} />
      )}
    </>
  );
}
