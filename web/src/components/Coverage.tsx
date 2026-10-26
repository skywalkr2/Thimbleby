// Coverage (design 6.32, 7.7): what the assistant read and when, and which sources it couldn't read, so an empty Today is
// never mistaken for "couldn't check". Read sources are said in the quiet style; a source that couldn't be read is said
// in its own words and style, never as "nothing new".
import { useCoverage, whenWords, type Coverage } from "../lib/coverage";
import { day, localDate } from "../lib/dates";
import { useWords } from "../lib/wording";
import styles from "./Today.module.css";

interface Part {
  kind: "read" | "looked" | "unread" | "stale" | "pending";
  text: string;
  key: string;
}

/** The coverage as the parts of one line: what was read, how far back each new mail source looked, then each source that
 * couldn't be read, then each not read yet. */
function useParts(found: Coverage): Part[] {
  const { t, tn } = useWords();
  const now = new Date();
  const parts: Part[] = [];
  if (found.read.length > 0 && found.last) {
    const when = whenWords(found.last, now, t);
    const today = localDate(new Date(found.last)) === localDate(now);
    parts.push({ kind: "read", key: "read", text: today ? tn("coverage.read", found.read.length, { when }) : tn("coverage.read_earlier", found.read.length, { when }) });
  }
  for (const source of found.read) {
    if (source.looked_back_to) parts.push({ kind: "looked", key: `looked:${source.id}`, text: t("coverage.not_looked_at", { date: day(source.looked_back_to) }) });
  }
  for (const { source, kind } of found.unread) {
    const label = source.label;
    const text = source.read_at
      ? t(`coverage.${kind}.since`, { label, when: whenWords(source.read_at, now, t) })
      : t(`coverage.${kind}.never`, { label });
    parts.push({ kind: "unread", key: `unread:${source.id}`, text });
  }
  for (const source of found.stale) parts.push({ kind: "stale", key: `stale:${source.id}`, text: t("coverage.stale.since", { label: source.label, when: whenWords(source.read_at!, now, t) }) });
  for (const source of found.pending) parts.push({ kind: "pending", key: `pending:${source.id}`, text: t("coverage.pending", { label: source.label }) });
  return parts;
}

export function Parts(props: { found: Coverage }) {
  const parts = useParts(props.found);
  return (
    <>
      {parts.map((part, i) => (
        <span key={part.key}>
          {i > 0 && " · "}
          <span data-coverage={part.kind} className={styles.coverageSource}>
            {part.text}
          </span>
        </span>
      ))}
    </>
  );
}

/** The one line in Today's header: what was read and when, and what couldn't be. Nothing while no source is on. Looking further
 * back is not offered here: it is in the source's own row menu. */
export function CoverageLine() {
  const found = useCoverage();
  if (!found) return null;
  return (
    <p className={styles.coverage} data-coverage-line="">
      <Parts found={found} />
    </p>
  );
}

/** What the heading says when nothing needs the person: "nothing needs you" only when every source was read. */
export function useNoneText(): string {
  const { t } = useWords();
  const found = useCoverage();
  return t(found && !found.complete ? "today.needs.none_unchecked" : "today.needs.none");
}

/** The empty queue: that nothing needs the person, together with what was read; with a source that couldn't be read, or
 * not read yet, it says only that nothing was found. */
export function NothingNeedsYou(props: { className?: string }) {
  const { t } = useWords();
  const found = useCoverage();
  const none = useNoneText();
  return (
    <p className={props.className} data-queue-empty="">
      {found ? (
        <>
          {none} · <Parts found={found} />
        </>
      ) : (
        t("queue.empty")
      )}
    </p>
  );
}
