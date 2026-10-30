// The Quality screen: outcome measures, weekly totals, grouped missed items, and the person's own count form.
import { useQuery } from "@tanstack/react-query";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { api, type S } from "../lib/api";
import { useAct } from "../lib/act";
import { todayOn, monthDay } from "../lib/dates";
import { useWords } from "../lib/wording";
import { Button } from "../ui/Button";
import { DateField } from "../ui/DateField";
import { EmptyState } from "../ui/EmptyState";
import { FormField } from "../ui/FormField";
import { LoadFailed } from "../ui/LoadFailed";
import { PageHeader } from "../ui/PageHeader";
import { Panel } from "../ui/Panel";
import { Skeleton } from "../ui/Skeleton";
import styles from "./Quality.module.css";

type View = S["QualityView"];

/** A whole number typed in a field, or null when it isn't one. */
function whole(text: string): number | null {
  return /^\d+$/.test(text.trim()) ? Number(text.trim()) : null;
}

function Section(props: { id: string; title: string; hint?: string; children: React.ReactNode; collapsed?: boolean; empty?: boolean }) {
  const { t } = useWords();
  if (props.collapsed) {
    return (
      <details className={`${styles.section} ${styles.collapsed}`} data-quality-section={props.id}>
        <summary>
          <span>{props.title}</span>
          {props.empty && <span className={styles.emptySummary}>{` · ${t("quality.section.empty")}`}</span>}
        </summary>
        {props.hint && <p className="hint">{props.hint}</p>}
        <div className={styles.detailBody}>{props.children}</div>
      </details>
    );
  }
  return (
    <section className={styles.section} aria-labelledby={`${props.id}-title`} data-quality-section={props.id}>
      <h2 id={`${props.id}-title`}>{props.title}</h2>
      {props.hint && <p className="hint">{props.hint}</p>}
      {props.children}
    </section>
  );
}

function Empty(props: { text: string }) {
  return <EmptyState inline text={props.text} />;
}

/** Seconds as whole minutes, never below one for any time at all. */
function minutesOf(seconds: number): number {
  return seconds <= 0 ? 0 : Math.max(1, Math.round(seconds / 60));
}

function Days(props: { label: string; rows: string[] }) {
  if (props.rows.length === 0) return null;
  return (
    <ul className={styles.list} aria-label={props.label}>
      {props.rows.map((row) => (
        <li key={row}>{row}</li>
      ))}
    </ul>
  );
}

function StatTile(props: { title: string; value: string; change?: string }) {
  const id = useId();
  return (
    <article className={styles.tile} aria-labelledby={id}>
      <h3 id={id}>{props.title}</h3>
      <p className={styles.value}>{props.value}</p>
      {props.change && <p className={styles.change}>{props.change}</p>}
    </article>
  );
}

function outcomeChange(
  t: (key: string) => string,
  tn: (key: string, count: number, values?: Record<string, string | number>) => string,
  change: number,
  time = false,
): string {
  if (change === 0) return t("quality.stat.no_change");
  const amount = Math.abs(change);
  if (time) {
    const minutes = minutesOf(amount);
    return tn(`quality.stat.time.${change > 0 ? "more" : "fewer"}`, minutes, { minutes });
  }
  return tn(`quality.stat.count.${change > 0 ? "more" : "fewer"}`, amount, { n: amount });
}

function CountForm(props: { view: View }) {
  const { t } = useWords();
  const act = useAct();
  const base = useId();
  const today = props.view.until || todayOn(new Date());
  const [date, setDate] = useState("");
  const [present, setPresent] = useState("");
  const [missed, setMissed] = useState("");
  const [busy, setBusy] = useState(false);
  const day = date || today;
  const entry = props.view.counts.days.find((d) => d.day === day);
  // A day that has a count shows it, so saving again corrects it.
  useEffect(() => {
    setPresent(entry ? String(entry.present) : "");
    setMissed(entry ? String(entry.missed) : "");
  }, [day, entry?.present, entry?.missed]); // eslint-disable-line react-hooks/exhaustive-deps

  const counted = whole(present);
  const gone = whole(missed);
  const tooMany = counted !== null && gone !== null && gone > counted;
  const ready = counted !== null && gone !== null && !tooMany && !busy;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (counted === null || gone === null || !ready) return;
    setBusy(true);
    await act(
      () => api.saveCount(day, { present: counted, missed: gone }),
      (saved) => ({
        message: t(saved.previous ? "quality.counts.corrected" : "quality.counts.saved", { day: monthDay(day), missed: gone, present: counted }),
        undo: () => api.undoCount(day, saved.previous ?? null),
      }),
    );
    setBusy(false);
  };

  return (
    <form className={styles.form} onSubmit={(e) => void submit(e)} aria-label={t("quality.counts.form")}>
      <FormField id={`${base}-date`} label={t("quality.counts.date")}>
        <DateField id={`${base}-date`} value={day} max={today} onChange={(e) => setDate(e.target.value)} required />
      </FormField>
      <FormField id={`${base}-present`} label={t("quality.counts.present")}>
        <input id={`${base}-present`} type="number" inputMode="numeric" min={0} step={1} value={present} onChange={(e) => setPresent(e.target.value)} />
      </FormField>
      <FormField id={`${base}-missed`} label={t("quality.counts.missed")}>
        <input
          id={`${base}-missed`}
          type="number"
          inputMode="numeric"
          min={0}
          step={1}
          value={missed}
          aria-invalid={tooMany || undefined}
          aria-describedby={tooMany ? `${base}-problem` : undefined}
          onChange={(e) => setMissed(e.target.value)}
        />
      </FormField>
      <div className={styles.act}>
        <Button type="submit" variant="primary" disabled={!ready} reason={busy || tooMany ? undefined : t("quality.counts.why_disabled")}>
          {t(busy ? "quality.counts.saving" : "quality.counts.save")}
        </Button>
      </div>
      {tooMany && (
        <p id={`${base}-problem`} className="problem-note" role="alert">
          {t("quality.counts.too_many")}
        </p>
      )}
    </form>
  );
}

function SampleRow(props: { sample: NonNullable<View["sample"]>; item: NonNullable<View["sample"]>["items"][number] }) {
  const { t } = useWords();
  const act = useAct();
  const base = useId();
  const { item, sample } = props;
  const [present, setPresent] = useState(item.present == null ? "" : String(item.present));
  const [missed, setMissed] = useState(item.missed == null ? "" : String(item.missed));
  const [busy, setBusy] = useState(false);
  // What the screen holds after a save or an Undo shows in the fields.
  useEffect(() => {
    setPresent(item.present == null ? "" : String(item.present));
    setMissed(item.missed == null ? "" : String(item.missed));
  }, [item.present, item.missed]);
  const counted = whole(present);
  const gone = whole(missed);
  const tooMany = counted !== null && gone !== null && gone > counted;
  const ready = counted !== null && gone !== null && !tooMany && !busy;
  const subject = item.title;
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (counted === null || gone === null || !ready) return;
    setBusy(true);
    await act(
      () => api.readSampleMessage(sample.id, item.source, { present: counted, missed: gone }),
      (saved) => ({
        message: t("quality.sample.saved", { missed: gone, present: counted, subject }),
        undo: () => api.undoSampleMessage(sample.id, item.source, saved.previous ?? null),
      }),
    );
    setBusy(false);
  };
  return (
    <li data-sample-item={item.source}>
      <form className={styles.form} onSubmit={(e) => void submit(e)}>
        <p>{t("quality.sample.received", { subject, day: monthDay(todayOn(new Date(item.received_at))) })}</p>
        <FormField id={`${base}-present`} label={t("quality.sample.present", { subject })}>
          <input id={`${base}-present`} type="number" inputMode="numeric" min={0} step={1} value={present} onChange={(e) => setPresent(e.target.value)} />
        </FormField>
        <FormField id={`${base}-missed`} label={t("quality.sample.missed", { subject })}>
          <input
            id={`${base}-missed`}
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            value={missed}
            aria-invalid={tooMany || undefined}
            aria-describedby={tooMany ? `${base}-problem` : undefined}
            onChange={(e) => setMissed(e.target.value)}
          />
        </FormField>
        <div className={styles.act}>
          <Button type="submit" aria-label={t("quality.sample.save_named", { subject })} disabled={!ready} reason={busy || tooMany ? undefined : t("quality.counts.why_disabled")}>
            {t("quality.sample.save")}
          </Button>
        </div>
        {tooMany && (
          <p id={`${base}-problem`} className="problem-note" role="alert">
            {t("quality.sample.too_many")}
          </p>
        )}
      </form>
    </li>
  );
}

/** The independent reading: draw the sample once the person has allowed it, then read each message in one's own mail and
 * enter what was found. */
function Sample(props: { view: View }) {
  const { t } = useWords();
  const act = useAct();
  const [busy, setBusy] = useState(false);
  const { sample, sample_allowed: allowed } = props.view;
  const draw = async () => {
    setBusy(true);
    await act(
      () => api.drawSample(),
      (drawn) => ({ message: t("quality.sample.drawn", { n: drawn.items.length }) }),
    );
    setBusy(false);
  };
  if (!sample) {
    return allowed ? (
      <>
        <Empty text={t("quality.sample.empty")} />
        <div className={styles.act}>
          <Button variant="primary" onClick={() => void draw()} disabled={busy}>
            {t(busy ? "quality.sample.drawing" : "quality.sample.draw")}
          </Button>
        </div>
      </>
    ) : (
      <Empty text={t("quality.sample.not_allowed")} />
    );
  }
  return (
    <>
      <p className={styles.sum}>{t("quality.sample.sum", { read: sample.read, size: sample.size, present: sample.present, missed: sample.missed })}</p>
      <ul className={styles.list} aria-label={t("quality.sample.list")}>
        {sample.items.map((item) => (
          <SampleRow key={item.source} sample={sample} item={item} />
        ))}
      </ul>
    </>
  );
}

export function Quality(props: { onBack: () => void }) {
  const { t, tn, has } = useWords();
  const page = useQuery({ queryKey: ["quality"], queryFn: api.quality });
  const view = page.data;
  const work = (kind: string) => (has(`task.${kind}`) ? t(`task.${kind}`) : t("task.other"));
  const weeks = view?.outcome.weeks ?? [];
  const previous = weeks.length > 1 ? weeks[weeks.length - 2] : undefined;
  const latest = weeks[weeks.length - 1];
  const delta = (current: number | undefined, before: number | undefined, time = false) =>
    current === undefined || before === undefined ? undefined : outcomeChange(t, tn, current - before, time);
  const alertCount = view ? view.outcome.dismissed + view.outcome.corrected : 0;
  const latestAlerts = latest ? latest.dismissed + latest.corrected : undefined;
  const previousAlerts = previous ? previous.dismissed + previous.corrected : undefined;
  const missedItems = view?.missed ?? [];
  // The screen opens with the cursor on its heading.
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus({ preventScroll: true }), []);

  return (
    <section className="panel-section" aria-labelledby="quality-title">
      <PageHeader
        id="quality-title"
        headingRef={heading}
        focusable
        title={t("quality.open")}
        crumb={
          <Button size="sm" variant="quiet" onClick={props.onBack}>
            {t("quality.back")}
          </Button>
        }
      />
      {page.isPending ? (
        <Skeleton />
      ) : page.isError || !view ? (
        <LoadFailed message={t("quality.load_failed")} onRetry={() => void page.refetch()} />
      ) : (
        <>
          <p className={styles.window} data-quality-window="">
            {t("quality.window", { from: monthDay(view.since), to: monthDay(view.until) })}
          </p>
          <div className={styles.tiles} role="region" aria-label={t("quality.tiles.title")} data-quality-section="quality-outcome">
            <StatTile title={t("quality.stat.found")} value={String(view.outcome.promises_found)} change={delta(latest?.promises_found, previous?.promises_found)} />
            <StatTile title={t("quality.stat.kept")} value={String(view.outcome.promises_kept)} change={delta(latest?.promises_kept, previous?.promises_kept)} />
            <StatTile title={t("quality.stat.alerts")} value={String(alertCount)} change={delta(latestAlerts, previousAlerts)} />
            <StatTile
              title={t("quality.stat.review")}
              value={view.review.median_seconds == null ? t("quality.stat.no_days") : t("quality.stat.minutes", { minutes: minutesOf(view.review.median_seconds) })}
              change={delta(latest?.review_seconds, previous?.review_seconds, true)}
            />
          </div>
          <div className={styles.sections}>
            <Panel title={t("quality.weeks.title")} className={styles.weekPanel}>
              <div className={styles.tableWrap}>
                <table className={styles.table} aria-label={t("quality.weeks.title")}>
                  <thead>
                    <tr>
                      <th scope="col">{t("quality.weeks.week")}</th>
                      <th scope="col">{t("quality.stat.found")}</th>
                      <th scope="col">{t("quality.stat.kept")}</th>
                      <th scope="col">{t("quality.stat.alerts")}</th>
                      <th scope="col">{t("quality.weeks.review")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {weeks.map((week) => (
                      <tr key={week.week}>
                        <th scope="row">{t("quality.weeks.range", { from: monthDay(week.week), to: monthDay(week.week_end) })}</th>
                        <td>{week.promises_found}</td>
                        <td>{week.promises_kept}</td>
                        <td>{week.dismissed + week.corrected}</td>
                        <td>{t("quality.stat.minutes", { minutes: minutesOf(week.review_seconds) })}</td>
                      </tr>
                    ))}
                    {weeks.length === 0 && (
                      <tr>
                        <td colSpan={5}>{t("quality.weeks.empty")}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Panel>

            <div className={styles.side}>
              <div data-quality-section="quality-missed">
                <Panel title={t("quality.mistakes.title")} count={missedItems.length} className={styles.mistakes}>
                  {missedItems.length === 0 ? (
                    <Empty text={t("quality.missed.empty")} />
                  ) : (
                    <ul className={styles.mistakeList}>
                      {missedItems.map((item) => (
                        <li key={`${item.person}-${item.week}`}>
                          <div className={styles.mistakeTitle}>
                            {item.person ? (
                              <a href={`#records/person/${encodeURIComponent(item.person)}`}>{item.person_name}</a>
                            ) : (
                              <span>{item.person_name}</span>
                            )}
                          </div>
                          <p>{tn("quality.mistakes.week", item.count, { from: monthDay(item.week), to: monthDay(item.week_end) })}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </Panel>
              </div>

              <div data-quality-section="quality-counts">
                <Panel title={t("quality.counts.own_title")} actions={<span className={styles.cardHint}>{t("quality.counts.own_hint")}</span>}>
                  {view.counts.entered === 0 ? (
                    <Empty text={t("quality.counts.empty")} />
                  ) : (
                    <>
                      <p className={styles.sum}>{tn("quality.counts.sum", view.counts.present, { missed: view.counts.missed })}</p>
                      <Days
                        label={t("quality.day_list")}
                        rows={view.counts.days.map((d) => tn("quality.counts.day", d.present, { day: monthDay(d.day), missed: d.missed }))}
                      />
                    </>
                  )}
                  <CountForm view={view} />
                </Panel>
              </div>
            </div>

            <div className={styles.more}>
              <Section id="quality-closes" title={t("quality.closes.title")} hint={t("quality.closes.hint")} collapsed empty={view.closes.total === 0}>
                {view.closes.total === 0 ? (
                  <Empty text={t("quality.closes.empty")} />
                ) : (
                  <>
                    <p className={styles.sum}>{tn("quality.closes.sum", view.closes.total, { silent: view.closes.silent })}</p>
                    <Days
                      label={t("quality.day_list")}
                      rows={view.closes.days.map((d) => tn("quality.closes.day", d.total, { day: monthDay(d.day), silent: d.silent }))}
                    />
                  </>
                )}
              </Section>

              <Section id="quality-endings" title={t("quality.endings.title")} hint={t("quality.endings.hint")} collapsed empty={view.endings.made === 0}>
                {view.endings.made === 0 ? (
                  <Empty text={t("quality.endings.empty")} />
                ) : (
                  <>
                    <p className={styles.sum}>{tn("quality.endings.sum", view.endings.made, { wrong: view.endings.wrong })}</p>
                    <p>{t("quality.endings.how", { declined: view.endings.declined, undone: view.endings.undone, reopened: view.endings.reopened })}</p>
                    <Days
                      label={t("quality.day_list")}
                      rows={view.endings.days.map((d) => tn("quality.endings.day", d.made, { day: monthDay(d.day), wrong: d.wrong }))}
                    />
                  </>
                )}
              </Section>

              <Section id="quality-lost" title={t("quality.lost.title")} hint={t("quality.lost.hint")} collapsed empty={view.lost.existed === 0}>
                {view.lost.existed === 0 ? (
                  <Empty text={t("quality.lost.empty")} />
                ) : (
                  <>
                    <p className={styles.sum}>{tn("quality.lost.sum", view.lost.existed, { lost: view.lost.lost })}</p>
                    <Days label={t("quality.day_list")} rows={view.lost.days.map((d) => tn("quality.lost.day", d.existed, { day: monthDay(d.day), lost: d.lost }))} />
                    <Days label={t("quality.lost.items")} rows={view.lost.items.map((i) => t("quality.lost.item", { day: monthDay(i.day), text: i.text }))} />
                  </>
                )}
              </Section>

            <Section id="quality-sources" title={t("quality.sources.title")} hint={t("quality.sources.hint")} collapsed empty={view.sources.checked === 0}>
              {view.sources.checked === 0 ? (
                <Empty text={t("quality.sources.empty")} />
              ) : (
                <>
                  <p className={styles.sum}>{tn("quality.sources.sum", view.sources.checked, { over: view.sources.over_a_day, silent: view.sources.silent })}</p>
                  <Days
                    label={t("quality.day_list")}
                    rows={view.sources.days.filter((d) => d.over_a_day > 0).map((d) => tn("quality.sources.day", d.checked, { day: monthDay(d.day), over: d.over_a_day, silent: d.silent }))}
                  />
                </>
              )}
            </Section>

            <Section id="quality-review" title={t("quality.review.title")} hint={t("quality.review.hint")} collapsed empty={view.review.days_reviewed === 0 || view.review.median_seconds == null}>
              {view.review.days_reviewed === 0 || view.review.median_seconds == null ? (
                <Empty text={t("quality.review.empty")} />
              ) : (
                <>
                  <p className={styles.sum}>{tn("quality.review.sum", view.review.days_reviewed, { minutes: minutesOf(view.review.median_seconds) })}</p>
                  <Days
                    label={t("quality.day_list")}
                    rows={view.review.days.map((d) => tn("quality.review.day", d.visits, { day: monthDay(d.day), minutes: minutesOf(d.seconds) }))}
                  />
                </>
              )}
            </Section>

            <Section id="quality-sample" title={t("quality.sample.title")} hint={t("quality.sample.hint")} collapsed empty={!view.sample}>
              <Sample view={view} />
            </Section>

            <Section id="quality-total" title={t("quality.total.title")} hint={t("quality.total.hint")} collapsed empty={view.missed_total.present === 0}>
              {view.missed_total.present === 0 ? (
                <Empty text={t("quality.total.empty")} />
              ) : (
                <p className={styles.sum}>
                  {tn("quality.total.sum", view.missed_total.present, { missed: view.missed_total.missed, days: view.missed_total.days, messages: view.missed_total.messages })}
                </p>
              )}
            </Section>

            <Section id="quality-apart" title={t("quality.apart.title")} hint={t("quality.apart.hint")} collapsed empty={view.apart.missed + view.apart.declined + view.apart.dropped === 0}>
              {view.apart.missed + view.apart.declined + view.apart.dropped === 0 ? (
                <Empty text={t("quality.apart.empty")} />
              ) : (
                <>
                  <Days
                    label={t("quality.apart.title")}
                    rows={[
                      tn("quality.apart.missed", view.apart.missed, {}),
                      tn("quality.apart.declined", view.apart.declined, {}),
                      tn("quality.apart.dropped", view.apart.dropped, {}),
                    ]}
                  />
                  <Days
                    label={t("quality.day_list")}
                    rows={view.apart.weeks
                      .filter((w) => w.missed + w.declined + w.dropped > 0)
                      .map((w) => t("quality.apart.week", { from: monthDay(w.week), to: monthDay(w.week_end), missed: w.missed, declined: w.declined, dropped: w.dropped }))}
                  />
                </>
              )}
            </Section>

            <Section id="quality-answers" title={t("quality.answers.title")} hint={t("quality.answers.hint")} collapsed empty={view.answers.helpful + view.answers.not_helpful === 0}>
              {view.answers.helpful + view.answers.not_helpful === 0 ? (
                <Empty text={t("quality.answers.empty")} />
              ) : (
                <>
                  <Days
                    label={t("quality.answers.title")}
                    rows={[tn("quality.answers.helpful", view.answers.helpful, {}), tn("quality.answers.not_helpful", view.answers.not_helpful, {})]}
                  />
                  <Days
                    label={t("quality.day_list")}
                    rows={view.answers.weeks
                      .filter((w) => w.helpful + w.not_helpful > 0)
                      .map((w) => t("quality.answers.week", { from: monthDay(w.week), to: monthDay(w.week_end), helpful: w.helpful, not_helpful: w.not_helpful }))}
                  />
                </>
              )}
            </Section>

            <Section id="quality-replays" title={t("quality.replays.title")} hint={t("quality.replays.hint")} collapsed empty={view.replays.count === 0}>
              {view.replays.count === 0 ? (
                <Empty text={t("quality.replays.empty")} />
              ) : (
                <>
                  <p className={styles.sum}>{tn("quality.replays.count", view.replays.count)}</p>
                  {view.replays.last_run && <p>{t("quality.replays.last", { when: monthDay(view.replays.last_run) })}</p>}
                </>
              )}
            </Section>

            <Section id="quality-knowledge" title={t("quality.knowledge.title")} hint={t("quality.knowledge.hint")} collapsed empty={view.knowledge_used.length === 0}>
              {view.knowledge_used.length === 0 ? (
                <Empty text={t("quality.knowledge.empty")} />
              ) : (
                <Days
                  label={t("quality.knowledge.title")}
                  rows={view.knowledge_used.map((k) => tn("quality.knowledge.row", k.runs_given, { work: work(k.task), applied: k.runs_applied }))}
                />
              )}
            </Section>

            <Section id="quality-repeats" title={t("quality.repeats.title")} hint={t("quality.repeats.hint")} collapsed empty={view.repeat_corrections.length === 0}>
              {view.repeat_corrections.length === 0 ? (
                <Empty text={t("quality.repeats.empty")} />
              ) : (
                <Days
                  label={t("quality.repeats.title")}
                  rows={view.repeat_corrections.map((w) =>
                    w.enough
                      ? tn("quality.repeats.row", w.corrections, { week: monthDay(w.week), work: work(w.task), repeats: w.repeats })
                      : tn("quality.repeats.few", w.corrections, { week: monthDay(w.week), work: work(w.task) }),
                  )}
                />
              )}
            </Section>

            <Section id="quality-lacking" title={t("quality.lacking.title")} hint={t("quality.lacking.hint")} collapsed empty={view.missing.length === 0}>
              {view.missing.length === 0 ? (
                <Empty text={t("quality.lacking.empty")} />
              ) : (
                view.missing.map((w) => (
                  <div key={w.week}>
                    <p className={styles.sum}>{t("quality.lacking.week", { week: monthDay(w.week) })}</p>
                    <Days label={t("quality.lacking.title")} rows={w.groups.map((g) => tn("quality.lacking.row", g.count, { wording: g.wording }))} />
                  </div>
                ))
              )}
            </Section>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
