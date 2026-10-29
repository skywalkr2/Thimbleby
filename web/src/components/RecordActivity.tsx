// What is going on with a record (design 7.14): what is open with it, what has been finished and by whom, and what happened to
// it, newest first. It reads the record's page from the server, which resolves every name; nothing here knows what kind of
// record it is. Finished work is credited to the one who did it, with who said it was done, so a nudge is never completion.
import type { ReactNode } from "react";
import { type S } from "../lib/api";
import { day, monthDay } from "../lib/dates";
import { forMeeting } from "../lib/meetings";
import { useFieldLabel } from "../lib/records";
import { usePlaceText } from "../lib/place";
import { useSaid } from "../lib/repeat";
import { recordView, viewHref } from "../lib/views";
import { useWords } from "../lib/wording";
import { ActivityList } from "../ui/ActivityList";
import { Pill } from "../ui/Pill";
import { Row } from "../ui/Row";
import { OriginLink, hasOrigin } from "./Origin";
import { plainTitle } from "../lib/title-dates";
import { useFactLine } from "../lib/fact-line";
import { RowList } from "../ui/RowList";

type Page = S["RecordPageView"];

function Section(props: { id: string; title: string; count?: number; children: ReactNode }) {
  return (
    <section aria-labelledby={props.id} className="record-section">
      <div className="heading">
        <h3 id={props.id}>{props.title}</h3>
        {props.count ? <span className="hint">{props.count}</span> : null}
      </div>
      {props.children}
    </section>
  );
}

/** "for Thursday's print sync", linking to the series' page; nothing for an item that is on no series. */
export function MeetingLabel(props: { series?: string | null; title?: string | null; on?: string | null }) {
  const { t } = useWords();
  if (!props.series || !props.title) return null;
  return <a href={viewHref(recordView("series", props.series))}>{forMeeting(t, props.title, props.on)}</a>;
}

const joined = (parts: ReactNode[]): ReactNode =>
  parts
    .filter(Boolean)
    .flatMap((part, i) => (i === 0 ? [part] : [" · ", part]))
    .map((part, i) => <span key={i}>{part}</span>);

/** `part` shows only what is open with the record ("open") or only the rest ("rest": what finished, the facts, the history), so
 * the page can put its own to-dos first, then the conversation, then the history; left out, all of it. */
export function RecordActivity(props: { page: Page; part?: "open" | "rest"; self?: boolean }) {
  const { t, tn, has } = useWords();
  const factLine = useFactLine();
  const place = usePlaceText();
  const { page } = props;
  const showOpen = props.part !== "rest";
  const showRest = props.part !== "open";
  const labelOf = useFieldLabel();
  // What the change was, in a word, from the op that made it; one the sheet has no word for is just a change.
  const verb = (op: string) => (has(`record.op.${op.split("#")[0]}`) ? t(`record.op.${op.split("#")[0]}`) : t("record.op.other"));
  // A change with a word of its own (added, closed, asked) says that word; any other says which field changed, by its label, in
  // a sentence a label of any shape fits ("changed due date on", "changed why they matter on"). The making of a record is "added".
  const did = (e: Page["activity"][number]) => {
    const own = e.op.split("#")[0];
    const plain = own !== "record.edit" && has(`record.op.${own}`);
    if (e.made) return plain ? verb(e.op) : t("record.op.added");
    return !plain && e.field ? t("record.did_field", { field: labelOf(e.field).toLocaleLowerCase() }) : verb(e.op);
  };
  // A second or later move of the same date, in the person's own history: "moved again (second time since Oct 6)".
  const movedAgain = (e: Page["activity"][number]) => {
    if (!e.moved_again || !e.moved_since) return null;
    const time = e.moved_again === 2 ? t("record.activity.time.second") : e.moved_again === 3 ? t("record.activity.time.third") : t("record.activity.time.many", { n: e.moved_again });
    return t("record.activity.moved_again", { time, date: monthDay(e.moved_since) });
  };
  const said = useSaid();
  const earlier = page.earlier_occurrences ?? [];
  const completed = page.completed_actions ?? [];
  const open = page.open_actions.length + page.open_questions.length;
  return (
    <div className="record-activity">
      {showOpen && open > 0 && (!props.self || page.open_actions.length > 0) && (
        <Section id="record-open" title={props.self ? t("record.open_you") : t("record.open_with", { name: page.name })} count={props.self ? page.open_actions.length : open}>
          <RowList>
            {page.open_actions.map((a) => (
              <Row
                key={a.id}
                pill={<Pill tone="neutral">{t("unfiled.kind.action")}</Pill>}
                title={<a href={viewHref(recordView("action", a.id))}>{plainTitle(a.text, a.due)}</a>}
                meta={joined([
                  (a.owners ?? []).join(", "),
                  a.due && t("op.meta.due", { date: day(a.due) }),
                  page.kind !== "project" && place({ name: a.project_name, side: a.side_name }),
                  a.series && a.series_title && <MeetingLabel key="m" series={a.series} title={a.series_title} on={a.meeting_on} />,
                  hasOrigin(a.origin) && <OriginLink key="o" origin={a.origin} inline />,
                ])}
              />
            ))}
            {!props.self && page.open_questions.map((q) => (
              <Row
                key={q.id}
                pill={<Pill tone="neutral">{t("unfiled.kind.question")}</Pill>}
                title={<a href={viewHref(recordView("question", q.id))}>{q.title}</a>}
                meta={joined([
                  q.to_name && t("record.asked_of", { name: q.to_name }),
                  q.series && q.series_title && <MeetingLabel key="m" series={q.series} title={q.series_title} on={q.meeting_on} />,
                  hasOrigin(q.origin) && <OriginLink key="o" origin={q.origin} inline />,
                ])}
              />
            ))}
          </RowList>
        </Section>
      )}
      {showOpen && props.self && page.open_questions.length > 0 && (
        <Section id="record-questions" title={t("record.questions_you")} count={page.open_questions.length}>
          <RowList>
            {page.open_questions.map((q) => (
              <Row
                key={q.id}
                title={<a href={viewHref(recordView("question", q.id))}>{q.title}</a>}
                meta={joined([
                  q.series && q.series_title && <MeetingLabel key="m" series={q.series} title={q.series_title} on={q.meeting_on} />,
                  hasOrigin(q.origin) && <OriginLink key="o" origin={q.origin} inline />,
                ])}
              />
            ))}
          </RowList>
        </Section>
      )}
      {showRest && (page.repeat || earlier.length > 0) && (
        <Section id="record-repeat" title={t("repeat.section")}>
          {page.repeat && <p>{said(page.repeat)}</p>}
          {earlier.length > 0 && (
            <>
              <h4 className="hint">{t("repeat.earlier")}</h4>
              <RowList>
                {earlier.map((e) => (
                  <Row
                    key={e.id}
                    pill={<Pill tone={e.how === "done" ? "ok" : "neutral"}>{t(`repeat.ended.${e.how}`)}</Pill>}
                    title={<a href={viewHref(recordView("action", e.id))}>{e.due ? day(e.due) : page.name}</a>}
                  />
                ))}
              </RowList>
            </>
          )}
        </Section>
      )}
      {showRest && completed.length > 0 && (
        <Section id="record-completed" title={t("record.completed")} count={completed.length}>
          <RowList>
            {completed.map((c) => (
              <Row
                key={c.id}
                pill={<Pill tone="ok">{t("record.done")}</Pill>}
                title={<a href={viewHref(recordView("action", c.id))}>{plainTitle(c.text)}</a>}
                meta={joined([
                  (c.done_by ?? []).length ? t("record.done_by", { names: (c.done_by ?? []).join(", ") }) : t("record.closed"),
                  c.reported_by && t("record.reported_by", { name: c.reported_by }),
                  c.done_on && monthDay(c.done_on),
                  page.kind !== "project" && place({ name: c.project_name, side: c.side_name }),
                ])}
              />
            ))}
          </RowList>
        </Section>
      )}
      {showRest && (page.facts ?? []).length > 0 && (
        <Section id="record-facts" title={t("record.facts")} count={(page.facts ?? []).length}>
          <RowList>
            {(page.facts ?? []).map((f) => (
              <Row
                key={f.id}
                title={<a href={viewHref(recordView("fact", f.id))}>{factLine(f.text, f.said_by)}</a>}
                meta={f.as_of ? t("record.facts_as_of", { date: day(f.as_of) }) : undefined}
              />
            ))}
          </RowList>
        </Section>
      )}
      {showRest && page.activity.length > 0 && (
        <Section id="record-activity" title={t("record.activity")}>
          <ActivityList
            entries={page.activity.map((e, i) => ({
              key: `${e.at}-${e.id}-${e.op}-${i}`,
              at: e.at,
              body: (
                <>
                  {e.made === "setup" ? (
                    <>
                      <strong>{plainTitle(e.name) || t("record.activity.a_note")}</strong> <span>{t("record.activity.setup")}</span>
                    </>
                  ) : (
                    <>
                      <span>{t("record.did", { who: e.by_assistant ? t("record.by_assistant") : t("record.by_you"), what: did(e) })}</span>{" "}
                      <strong>{plainTitle(e.name) || t("record.activity.a_note")}</strong>
                    </>
                  )}
                  {movedAgain(e) && <span> · {movedAgain(e)}</span>}
                </>
              ),
            }))}
          />
        </Section>
      )}
      {showRest && open === 0 && completed.length === 0 && !page.repeat && earlier.length === 0 && page.activity.length === 0 && <p className="hint">{t("record.nothing_yet")}</p>}
      {showOpen && <span className="sr">{tn("record.items_count", open)}</span>}
    </div>
  );
}
