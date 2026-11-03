// Coverage (design 6.32, 7.7): what the assistant read and when, and which sources it couldn't read, so an empty Today is
// never mistaken for "couldn't check". Read sources are said in the quiet style; a source that couldn't be read is said
// in its own words and style, never as "nothing new".
import type { ReactNode } from "react";
import { useCoverage, whenWords, type Coverage, type Unread } from "../lib/coverage";
import { day, todayOn } from "../lib/dates";
import { useWords } from "../lib/wording";
import { EmptyState } from "../ui/EmptyState";
import styles from "./Today.module.css";

export interface Part {
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
    const today = todayOn(new Date(found.last)) === todayOn(now);
    parts.push({ kind: "read", key: "read", text: today ? tn("coverage.read", found.read.length, { when }) : tn("coverage.read_earlier", found.read.length, { when }) });
  }
  // Said once for each day, however many mailboxes were taken in from it.
  for (const from of new Set(found.read.map((source) => source.looked_back_to).filter(Boolean))) {
    parts.push({ kind: "looked", key: `looked:${from}`, text: t("coverage.not_looked_at", { date: day(from as string) }) });
  }
  // The sources of one account that couldn't be read are one part naming the account, not one part for each of them.
  const byAccount = new Map<string, Unread[]>();
  for (const unread of found.unread) {
    if (unread.source.account && unread.kind !== "offline") byAccount.set(unread.source.account, [...(byAccount.get(unread.source.account) ?? []), unread]);
  }
  const grouped = new Set<string>();
  for (const { source, kind } of found.unread) {
    const label = source.label;
    const mine = source.account ? byAccount.get(source.account) : undefined;
    if (mine) {
      if (grouped.has(source.account!)) continue;
      grouped.add(source.account!);
      // An account that is signed out says so; one that failed says since when its sources were last read (the earliest).
      const reads = mine.flatMap((u) => (u.source.read_at ? [u.source.read_at] : []));
      const since = mine.every((u) => u.source.read_at) ? reads.sort()[0] : null;
      const text = mine.every((u) => u.kind === "signed_out")
        ? t("coverage.account.signed_out", { account: source.account! })
        : since
          ? t("coverage.account.failed_since", { account: source.account!, when: whenWords(since, now, t) })
          : t("coverage.account.failed_never", { account: source.account! });
      parts.push({ kind: "unread", key: `unread:${source.account}`, text });
      continue;
    }
    if (kind === "signed_out") {
      parts.push({ kind: "unread", key: `unread:${source.id}`, text: t("coverage.signed_out", { label }) });
      continue;
    }
    const text = source.read_at
      ? t(`coverage.${kind}.since`, { label, when: whenWords(source.read_at, now, t) })
      : t(`coverage.${kind}.never`, { label });
    parts.push({ kind: "unread", key: `unread:${source.id}`, text });
  }
  for (const source of found.stale) parts.push({ kind: "stale", key: `stale:${source.id}`, text: t("coverage.stale.since", { label: source.label, when: whenWords(source.read_at!, now, t) }) });
  for (const source of found.pending) parts.push({ kind: "pending", key: `pending:${source.id}`, text: t("coverage.pending", { label: source.label }) });
  return parts;
}

export function Parts(props: { found: Coverage; /** Kinds of part left out: the header's popover lists each account that couldn't be read as a row of its own. */ without?: Part["kind"][] }) {
  const parts = useParts(props.found).filter((part) => !props.without?.includes(part.kind));
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
export function CoverageLine(props: { as?: "p" | "span"; without?: Part["kind"][] }) {
  const found = useCoverage();
  if (!found) return null;
  const Tag = props.as ?? "p";
  return (
    <Tag className={styles.coverage} data-coverage-line="">
      <Parts found={found} without={props.without} />
    </Tag>
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
export function NothingNeedsYou(props: { className?: string; children?: ReactNode }) {
  const { t } = useWords();
  const found = useCoverage();
  const none = useNoneText();
  return (
    <EmptyState
      className={props.className}
      icon="check"
      data-queue-empty=""
      text={
        found ? (
          <>
            {none} · <Parts found={found} />
          </>
        ) : (
          t("queue.empty")
        )
      }
    >
      {props.children}
    </EmptyState>
  );
}
