// A series of meetings (design 7.14, answer 30): the next meeting with what is open for it, by person with the person last as
// "You", then the meetings that have passed, one line each of what was settled and what moved on, and the details beside.
// It is record display: what rolled forward is shown here so nothing moves out of sight, and building or sending an agenda
// is a pack's to add, as buttons and a section on this page.
import { useQuery } from "@tanstack/react-query";
import { api, type S } from "../lib/api";
import { day, monthDay } from "../lib/dates";
import { recordView, viewHref } from "../lib/views";
import { useWords } from "../lib/wording";
import { AgendaSection } from "./AgendaList";
import { RecordConversation } from "./RecordConversation";
import { Pill } from "../ui/Pill";
import { Row, RowItem } from "../ui/Row";
import { Skeleton } from "../ui/Skeleton";
import { plainTitle } from "../lib/title-dates";
import { Button } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";
import { PageHeader } from "../ui/PageHeader";
import { RowList } from "../ui/RowList";
import { DefinitionList, Definition } from "../ui/DefinitionList";
type Page = S["SeriesPageView"];

export function SeriesPage(props: { id: string; onBack: () => void }) {
  const { t } = useWords();
  const page = useQuery({ queryKey: ["series-page", props.id], queryFn: () => api.seriesPage(props.id) });
  const data = page.data;
  return (
    <section className="panel-section record-page" aria-labelledby="series-title">
      <div>
        <Button variant="quiet" size="sm" onClick={props.onBack}>
          {t("record.back")}
        </Button>
      </div>
      {page.isPending && <Skeleton />}
      {page.isError && (
        <EmptyState icon="alert" text={t("record.load_failed")} action={{ label: t("action.try_again"), onClick: () => void page.refetch() }} />
      )}
      {data && (
        <>
          <PageHeader id="series-title" title={data.title} kind={<Pill tone="neutral">{t("series.kind")}</Pill>} />
          <div className="record-grid">
            <div className="record-main">
              <AgendaSection items={data.agenda ?? []} id="series-agenda" />
              <NextMeeting page={data} />
              <RecordConversation kind="series" id={props.id} />
              <Past page={data} />
            </div>
            <aside className="record-side" aria-label={t("record.details")}>
              <h3>{t("record.details")}</h3>
              <DefinitionList>
                {data.repeats && (
                  <Definition>
                    <dt>{t("series.repeats")}</dt>
                    <dd>
                      {data.repeats} <span className="hint">{t("series.in_your_words")}</span>
                    </dd>
                  </Definition>
                )}
                {data.project_name && data.project && (
                  <Definition>
                    <dt>{t("series.project")}</dt>
                    <dd>
                      <a href={viewHref(recordView("project", data.project))}>{data.project_name}</a>
                    </dd>
                  </Definition>
                )}
                {(data.usually_with ?? []).length > 0 && (
                  <Definition>
                    <dt id="series-usually">{t("series.usually_with")}</dt>
                    <dd>
                      <ul className="plain-list" aria-labelledby="series-usually">
                        {(data.usually_with ?? []).map((p) => (
                          <li key={p.person}>
                            <a href={viewHref(recordView("person", p.person))}>{p.name}</a> · {t("series.usually_count", { n: p.meetings, of: p.of })}
                          </li>
                        ))}
                      </ul>
                    </dd>
                  </Definition>
                )}
                <Definition>
                  <dt>{t("series.rolling")}</dt>
                  <dd>{t("series.rolling_rule")}</dd>
                </Definition>
              </DefinitionList>
            </aside>
          </div>
        </>
      )}
    </section>
  );
}

function ItemRow(props: { item: S["SeriesItem"]; note?: string }) {
  const { t } = useWords();
  const { item } = props;
  return (
    <Row
      pill={<Pill tone="neutral">{t(item.kind === "action" ? "unfiled.kind.action" : "unfiled.kind.question")}</Pill>}
      title={<a href={viewHref(recordView(item.kind, item.id))}>{plainTitle(item.text, item.due)}</a>}
      meta={[item.due && t("op.meta.due", { date: day(item.due) }), item.rolled_from && t("series.rolled_from", { day: monthDay(item.rolled_from.on), title: item.rolled_from.title }), props.note]
        .filter(Boolean)
        .join(" · ")}
    />
  );
}

function NextMeeting(props: { page: Page }) {
  const { t, tn } = useWords();
  const next = props.page.next;
  // An item already listed under Agenda is listed there only: Next leaves it out and says how many it lists.
  const onAgenda = new Set((props.page.agenda ?? []).map((a) => `${a.kind}:${a.id}`));
  const groups = (next?.groups ?? [])
    .map((g) => ({ ...g, items: g.items.filter((i) => !onAgenda.has(`${i.kind}:${i.id}`)) }))
    .filter((g) => g.items.length > 0);
  const listed = groups.reduce((n, g) => n + g.items.length, 0);
  if (!next) {
    return (
      <section aria-labelledby="series-next" className="record-section">
        <div className="heading">
          <h3 id="series-next">{t("series.next_none")}</h3>
        </div>
        {props.page.open_without_next > 0 && <p className="hint">{tn("series.waiting", props.page.open_without_next)}</p>}
      </section>
    );
  }
  return (
    <section aria-labelledby="series-next" className="record-section">
      <div className="heading">
        <h3 id="series-next">{listed > 0 ? t("series.next_open", { day: day(next.on), n: listed }) : t("series.next", { day: day(next.on) })}</h3>
      </div>
      {next.open === 0 && <p className="hint">{t("series.nothing_open")}</p>}
      {groups.map((group) => (
        <div key={group.person ?? "unknown"} className="record-section">
          <h4 className="what">{group.is_pm ? t("series.you") : (group.name ?? t("series.someone"))}</h4>
          <RowList>
            {group.items.map((item) => (
              <ItemRow key={item.id} item={item} />
            ))}
          </RowList>
        </div>
      ))}
    </section>
  );
}

function Past(props: { page: Page }) {
  const { t, tn } = useWords();
  if (props.page.past.length === 0) return null;
  return (
    <section aria-labelledby="series-past" className="record-section">
      <div className="heading">
        <h3 id="series-past">{t("series.past")}</h3>
      </div>
      <RowList>
        {props.page.past.map((m) => {
          const summary = [
            day(m.on),
            m.settled.length ? tn("series.settled", m.settled.length) : "",
            m.moved.length ? t("series.moved_to", { n: m.moved.length, day: monthDay(m.moved[0].to?.on) }) : "",
          ]
            .filter(Boolean)
            .join(" · ");
          return (
            <RowItem key={m.id}>
              <details>
                <summary>{summary}</summary>
                <RowList>
                  {m.settled.map((item) => (
                    <ItemRow key={item.id} item={{ ...item, rolled_from: null }} note={t("series.settled_here")} />
                  ))}
                  {m.moved.map((item) => (
                    <ItemRow key={item.id} item={{ ...item, rolled_from: null }} note={item.to ? t("series.moved_here", { day: monthDay(item.to.on) }) : undefined} />
                  ))}
                </RowList>
              </details>
            </RowItem>
          );
        })}
      </RowList>
    </section>
  );
}
