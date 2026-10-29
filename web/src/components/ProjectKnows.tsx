// What the assistant knows about a project (design 7.18), on the project's page: where its inputs come from and the last
// one from each, its facts with who they rest on and when (answer 29: the source label, "Inferred" and Confirm it), the
// glossary terms used there, who answers what, and what is still unknown with the question asked for it. It reads, and the
// one thing it changes is a fact the person confirms. Every row is one thing; a part with nothing in it is not shown, and a
// page with nothing in any part says so in one line. Who reads it is one plain line, never a part of its own.
import { useQuery } from "@tanstack/react-query";
import { useAct } from "../lib/act";
import type { ReactNode } from "react";
import { api, type S } from "../lib/api";
import { monthDay } from "../lib/dates";
import { recordView, viewHref } from "../lib/views";
import { useWords } from "../lib/wording";
import { LoadFailed } from "../ui/LoadFailed";
import { Pill } from "../ui/Pill";
import { Row } from "../ui/Row";
import { Skeleton } from "../ui/Skeleton";
import { FactSource } from "./FactSource";
import { useFactLine } from "../lib/fact-line";
import { OriginLink } from "./Origin";

import { EmptyState } from "../ui/EmptyState";
import { CheckboxGroup } from "../ui/CheckboxGroup";
import { RowList } from "../ui/RowList";
/** The ways an input arrives that the sheet has a word for; any other is "another input". */
const KINDS = ["pasted", "email", "calendar", "change", "note", "task"];
const FIELDS = ["status", "phase", "target", "owner", "summary"] as const;

function Part(props: { id: string; title: string; count: number; children: ReactNode }) {
  if (props.count === 0) return null;
  return (
    <section aria-labelledby={props.id} className="record-section">
      <div className="heading">
        <h3 id={props.id}>{props.title}</h3>
        <span className="hint">{props.count}</span>
      </div>
      <RowList>{props.children}</RowList>
    </section>
  );
}

/** Which accounts may read the project's material, and whether reading it sends anything away from this computer (design
 * 6.32): one plain line in words, with the accounts named in it, so nothing rests on a color. */
function Reading(props: { reading: S["ProjectReading"]; area: boolean }) {
  const { t } = useWords();
  const { reading } = props;
  const names = reading.readers.map((r) => r.name).join(", ");
  const summary = reading.state === "none" ? t("knows.reading.none") : t(reading.state === "local" ? "knows.reading.local" : "knows.reading.away", { names });
  return (
    <>
      {props.area && <p className="hint">{t("knows.area")}</p>}
      <p data-reading={reading.state}>
        <strong>{t("knows.reading")}:</strong> {summary}
        {reading.levels.length > 0 && ` ${t("knows.reading.levels", { levels: reading.levels.join(", ") })}`}
      </p>
    </>
  );
}

/** The accounts that may read an area, one box each, saved as the person ticks them with Undo (design 6.32). Each says in words
 * whether reading sends the area's material away from this computer; one the project above keeps out can't be ticked, and says so. */
function Readers(props: { project: string; name: string; choices: S["ReaderChoice"][] }) {
  const { t } = useWords();
  const act = useAct();
  const reading = props.choices.filter((c) => c.reads).map((c) => c.account);
  const change = (account: string, on: boolean) => {
    const next = on ? [...reading, account] : reading.filter((a) => a !== account);
    void act(
      () => api.setAreaReaders(props.project, next),
      () => ({ message: t("knows.readers.changed", { area: props.name }), undo: () => api.setAreaReaders(props.project, reading) }),
    );
  };
  return (
    <CheckboxGroup legend={t("knows.readers.title")} data-area-readers="">
      <p className="hint">{t("knows.readers.hint")}</p>
      {props.choices.map((c) => (
        <div key={c.account}>
          <label className="check-line">
            <input type="checkbox" checked={c.reads} disabled={!!c.locked} onChange={(e) => change(c.account, e.target.checked)} />
            <span>{t("knows.readers.row", { name: c.name, where: t(c.leaves ? "knows.readers.away" : "knows.readers.local") })}</span>
          </label>
          {c.locked && <p className="hint">{t("knows.readers.locked")}</p>}
        </div>
      ))}
    </CheckboxGroup>
  );
}

function Sources(props: { rows: S["KnowsSource"][] }) {
  const { t, tn } = useWords();
  return (
    <Part id="knows-sources" title={t("knows.sources")} count={props.rows.length}>
      {props.rows.map((s) => (
        <Row
          key={s.key}
          title={s.label ?? t(`knows.kind.${s.kind && KINDS.includes(s.kind) ? s.kind : "other"}`)}
          meta={t("knows.source.meta", { inputs: tn("knows.source.inputs", s.inputs), day: monthDay(s.last.received_at) })}
        >
          <OriginLink origin={{ kind: "source", source: s.last.id }} label={s.last.title} />
        </Row>
      ))}
    </Part>
  );
}

function Facts(props: { rows: S["KnowsFact"][] }) {
  const { t } = useWords();
  const line = useFactLine();
  return (
    <Part id="knows-facts" title={t("knows.facts")} count={props.rows.length}>
      {props.rows.map((f) => (
        <Row
          key={f.id}
          pill={f.key ? <Pill tone="neutral">{t("knows.key")}</Pill> : undefined}
          title={<a href={viewHref(recordView("fact", f.id))}>{line(f.text, f.source.basis === "said" ? f.source.by : null)}</a>}
          meta={<FactSource inline short source={f.source} fact={f.id} version={f.version} />}
        />
      ))}
    </Part>
  );
}

function Terms(props: { rows: S["KnowsTerm"][] }) {
  const { t } = useWords();
  return (
    <Part id="knows-terms" title={t("knows.terms")} count={props.rows.length}>
      {props.rows.map((x) => (
        <Row
          key={x.id}
          pill={<Pill tone={x.confidence === "unknown" ? "warn" : "neutral"}>{t(`knows.confidence.${x.confidence}`)}</Pill>}
          title={x.term}
          meta={x.confidence === "unknown" ? undefined : x.meaning}
        />
      ))}
    </Part>
  );
}

function Routing(props: { rows: S["KnowsRouting"][] }) {
  const { t } = useWords();
  return (
    <Part id="knows-routing" title={t("knows.routing")} count={props.rows.length}>
      {props.rows.map((r) => (
        <Row
          key={r.id}
          title={r.topic}
          meta={[t(r.negative ? "knows.routing.not" : "knows.routing.answers", { who: r.who }), r.look_up && t("knows.routing.look_up", { where: r.look_up })]
            .filter(Boolean)
            .join(" · ")}
        />
      ))}
    </Part>
  );
}

function Unknown(props: { rows: S["KnowsUnknown"][] }) {
  const { t } = useWords();
  return (
    <Part id="knows-unknown" title={t("knows.unknown")} count={props.rows.length}>
      {props.rows.map((u) => {
        const q = u.question;
        const field = u.field && FIELDS.includes(u.field) ? u.field : null;
        return (
          <Row
            key={u.entry ?? u.field ?? u.term}
            title={u.kind === "term" ? t("knows.unknown.term", { term: u.term ?? "" }) : field ? t(`knows.unknown.${field}`) : ""}
            meta={
              q ? (
                <>
                  {t("knows.unknown.asked", { name: q.to_name, day: monthDay(q.asked_on) })}:{" "}
                  <a href={viewHref(recordView("question", q.id))}>{q.title}</a>
                </>
              ) : undefined
            }
          />
        );
      })}
    </Part>
  );
}

/** `plain` is for Personal when the person has no side beside it: the parts about who answers what, the terms used and what
 * is still unknown are left out. A part with nothing in it is never shown. */
export function ProjectKnows(props: { id: string; plain?: boolean }) {
  const { t } = useWords();
  const knows = useQuery({ queryKey: ["project-knows", props.id], queryFn: () => api.projectKnows(props.id) });
  const data = knows.data;
  // Nothing in any part: one line instead of a row of empty ones.
  const nothing = !!data && data.sources.length + data.facts.length + (props.plain ? 0 : data.terms.length + data.routing.length + data.unknown.length) === 0;
  return (
    <section aria-labelledby="knows-title" className="record-section" data-project-knows="">
      <div className="heading">
        <h2 id="knows-title">{t("knows.title")}</h2>
      </div>
      {knows.isPending && <Skeleton />}
      {knows.isError && <LoadFailed message={t(props.plain ? "knows.load_failed.plain" : "knows.load_failed")} onRetry={() => void knows.refetch()} />}
      {data && (
        <>
          <Reading reading={data.reading} area={data.area} />
          {data.area && (data.reading.choices ?? []).length > 0 && <Readers project={props.id} name={data.name} choices={data.reading.choices ?? []} />}
          {nothing && <EmptyState text={t("knows.nothing_yet")} />}
          <Sources rows={data.sources} />
          <Facts rows={data.facts} />
          {!props.plain && (
            <>
              <Terms rows={data.terms} />
              <Routing rows={data.routing} />
              <Unknown rows={data.unknown} />
            </>
          )}
        </>
      )}
    </section>
  );
}
