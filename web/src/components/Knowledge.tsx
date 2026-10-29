// Knowledge (design 7.18): what the assistant has learned about how the person works, and where they control it. One page,
// top to bottom: what waits for their OK, what is followed (in plain groups, with how often it was used and Stop using), their
// own words with what each means, and behind a link what has not been used in a while and what was retired. One primary
// action per row; the rest is in the row's menu. Every act is at once, with an undo toast.
import { useQuery } from "@tanstack/react-query";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { api, type S } from "../lib/api";
import { useReviewTime } from "../lib/review-time";
import { useKnowledgeActs } from "../lib/knowledge-acts";
import { changesOf, itemsOf, reachWords, sectionsOf, usedWords, type Item } from "../lib/knowledge";
import { useReachNames } from "../lib/reach";
import { useSettingEdits } from "../lib/use-setting-edits";
import { useWords } from "../lib/wording";
import { Button } from "../ui/Button";
import { Drawer } from "../ui/Drawer";
import { LoadFailed } from "../ui/LoadFailed";
import { Row } from "../ui/Row";
import { Skeleton } from "../ui/Skeleton";
import { Glossary } from "./Glossary";
import { NarrowForm } from "./NarrowForm";
import { OriginLink } from "./Origin";
import { RowMenu, type MenuAction } from "./RowMenu";
import styles from "./Knowledge.module.css";

import { EmptyState } from "../ui/EmptyState";
import { PageHeader } from "../ui/PageHeader";
export function Knowledge(props: { onOpenReview: () => void }) {
  const words = useWords();
  const { t, tn } = words;
  useReviewTime("knowledge");
  const entries = useQuery({ queryKey: ["knowledge"], queryFn: api.knowledge });
  const rules = useQuery({ queryKey: ["knowledge", "rules"], queryFn: api.knowledgeRules });
  const review = useQuery({ queryKey: ["knowledge", "rules", "review"], queryFn: api.ruleReview });
  const reach = useReachNames();
  const settings = useSettingEdits();
  const page = useRef<HTMLElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const [acted, setActed] = useState(0);
  // After an act the row it was on usually leaves the list; keyboard focus moves to what is now first.
  useEffect(() => {
    if (acted === 0) return;
    (page.current?.querySelector<HTMLElement>("[data-row]") ?? heading.current)?.focus();
  }, [acted]);

  const now = new Date();
  const days = review.data?.days;
  const all = useMemo(() => (entries.data && rules.data ? itemsOf(entries.data, rules.data) : []), [entries.data, rules.data]);
  const sections = sectionsOf(all, now, days);
  const flagged = review.data ? review.data.flagged.length : 0;
  const moved = review.data?.moved ?? 0;
  const failed = entries.isError || rules.isError;
  const loading = entries.isPending || rules.isPending;
  const plainWords = settings.item("language.known_terms");
  // Nothing at all: no lesson, rule, word or past entry, and none of the person's plain words.
  const empty =
    all.length === 0 && !(plainWords && Array.isArray(plainWords.value) && plainWords.value.length > 0);
  const shown = (item: Item) => ({ item, now, words, reach: reachWords(item.scope, reach.names, words), projects: reach.projectList, onActed: () => setActed((n) => n + 1) });
  const list = (items: Item[], label: string, as: "waiting" | "follows" | "idle" | "retired") => (
    <ul className={styles.list} aria-label={label}>
      {items.map((item) => (
        <KnowledgeRow key={item.id} {...shown(item)} as={as} />
      ))}
    </ul>
  );

  return (
    <section ref={page} className="panel-section" aria-labelledby="knowledge-title">
      <PageHeader id="knowledge-title" headingRef={heading} focusable title={t("knowledge.title")} />
      <p className={styles.intro}>{t("knowledge.intro")}</p>
      {(flagged > 0 || moved > 0) && (
        <div className={styles.review}>
          <p>{flagged > 0 ? tn("knowledge.review", flagged) : t("knowledge.review.moved")}</p>
          <Button size="sm" onClick={props.onOpenReview}>
            {t("knowledge.review.open")}
          </Button>
        </div>
      )}
      {failed ? (
        <LoadFailed
          message={t("knowledge.load_failed")}
          onRetry={() => {
            void entries.refetch();
            void rules.refetch();
          }}
        />
      ) : loading ? (
        <Skeleton />
      ) : empty ? (
        <EmptyState text={t("knowledge.nothing_yet")} />
      ) : (
        <>
          {sections.waiting.length > 0 && (
            <section className={styles.part} aria-labelledby="knowledge-waiting">
              <h2 id="knowledge-waiting">{t("knowledge.waiting.title")}</h2>
              {list(sections.waiting, t("knowledge.waiting.title"), "waiting")}
            </section>
          )}
          {/* With nothing in use and nothing waiting, the part is left out: its heading would stand over nothing. */}
          {(sections.follows.length > 0 || sections.waiting.length > 0) && (
            <section className={styles.part} aria-labelledby="knowledge-follows">
              <h2 id="knowledge-follows">{t("knowledge.follows.title")}</h2>
              {sections.follows.length === 0 ? (
                <EmptyState text={t("knowledge.follows.none_waiting")} />
              ) : (
                sections.follows.map(({ group, items }) => (
                  <div key={group} className={styles.group}>
                    <h3>{t(`knowledge.group.${group}`)}</h3>
                    {list(items, t(`knowledge.group.${group}`), "follows")}
                  </div>
                ))
              )}
            </section>
          )}
        </>
      )}
      {!failed && !loading && <Glossary entries={sections.words} now={now} onActed={() => setActed((n) => n + 1)} />}
      {!failed && !loading && (sections.idle.length > 0 || sections.retired.length > 0) && (
        <details className="more-options">
          <summary>{t("knowledge.past.title")}</summary>
          {sections.idle.length > 0 && (
            <div className={styles.group}>
              <h3>{t("knowledge.past.idle")}</h3>
              <p className="hint">{t("knowledge.past.idle_hint", { days: days ?? 0 })}</p>
              {list(sections.idle, t("knowledge.past.idle"), "idle")}
            </div>
          )}
          {sections.retired.length > 0 && (
            <div className={styles.group}>
              <h3>{t("knowledge.past.retired")}</h3>
              {list(sections.retired, t("knowledge.past.retired"), "retired")}
            </div>
          )}
        </details>
      )}
    </section>
  );
}

function KnowledgeRow(props: {
  item: Item;
  as: "waiting" | "follows" | "idle" | "retired";
  now: Date;
  words: ReturnType<typeof useWords>;
  reach: string;
  projects: S["ProjectView"][];
  onActed: () => void;
}) {
  const { t } = props.words;
  const { item } = props;
  const acts = useKnowledgeActs();
  const [narrowing, setNarrowing] = useState(false);
  const [editing, setEditing] = useState(false);
  const done = async (run: Promise<unknown>) => {
    await run;
    props.onActed();
  };
  const waiting = props.as === "waiting";
  const inUse = props.as === "follows" || props.as === "idle";
  const meta = [
    // What a proposal would change, in words; what is retired says so, so state is never colour alone.
    waiting ? t(`knowledge.changes.${changesOf(item)}`) : "",
    props.as === "retired" ? t("knowledge.status.retired") : "",
    t(`knowledge.from.${item.learnedFrom}`),
    item.untrusted ? t("knowledge.outside") : "",
    item.enforced ? t("knowledge.enforced") : "",
    props.reach,
    waiting ? "" : usedWords(item, props.now, props.words),
  ].filter(Boolean);
  const menu: MenuAction[] = waiting
    ? [
        { id: "edit", label: t("knowledge.change"), run: () => setEditing(true) },
        { id: "just", label: t("knowledge.just_this_time"), run: () => void done(acts.justThisTime(item)) },
        { id: "discard", danger: true, label: t("knowledge.drop"), run: () => void done(acts.discard(item)) },
      ]
    : inUse
      ? [{ id: "narrow", label: t("knowledge.narrow"), run: () => setNarrowing(true) }]
      : [];
  const primary = waiting ? (
    <Button variant="primary" size="sm" data-key="primary" aria-label={t("knowledge.keep_named", { text: item.text })} onClick={() => void done(acts.keep(item))}>
      {t("knowledge.keep")}
    </Button>
  ) : inUse ? (
    <Button size="sm" data-key="primary" aria-label={t("knowledge.stop_named", { text: item.text })} onClick={() => void done(acts.retire(item))}>
      {t("knowledge.retire")}
    </Button>
  ) : null;
  const extra = narrowing || editing || item.origin;
  return (
    <Row title={item.text} meta={meta.join(" · ")} primary={primary} menu={<RowMenu label={item.text} actions={menu} />}>
      {extra && (
        <>
          {narrowing && (
            <NarrowForm
              scope={item.scope}
              projects={props.projects}
              onCancel={() => setNarrowing(false)}
              onSave={(scope) => {
                setNarrowing(false);
                void done(acts.narrow(item, scope));
              }}
            />
          )}
          <OriginLink origin={item.origin} />
          {editing && (
            <EditDrawer
              item={item}
              words={props.words}
              onClose={() => setEditing(false)}
              onKeep={(text) => {
                setEditing(false);
                void done(acts.keep(item, { text }));
              }}
            />
          )}
        </>
      )}
    </Row>
  );
}

/** Edit the wording of a proposal and keep it in one step; what is kept is the person's own wording. */
function EditDrawer(props: { item: Item; words: ReturnType<typeof useWords>; onClose: () => void; onKeep: (text: string) => void }) {
  const { t } = props.words;
  const [text, setText] = useState(props.item.text);
  const field = useId();
  const clean = text.trim();
  return (
    <Drawer
      open
      title={t("knowledge.edit.title")}
      onClose={props.onClose}
      dirty={text !== props.item.text}
      footer={
        <>
          <Button variant="primary" disabled={!clean} onClick={() => props.onKeep(clean)}>
            {t("knowledge.edit.keep")}
          </Button>
          <Button onClick={props.onClose}>{t("action.cancel")}</Button>
        </>
      }
    >
      <div className={styles.edit}>
        <label htmlFor={field}>{t("knowledge.edit.text")}</label>
        <textarea id={field} className="short" value={text} autoFocus onChange={(e) => setText(e.target.value)} />
        <p className="hint">{t("knowledge.edit.note")}</p>
      </div>
    </Drawer>
  );
}
