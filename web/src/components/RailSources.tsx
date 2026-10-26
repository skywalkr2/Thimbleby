// What the rail's cards share (design 7.7): the clock, what a card says about its sources when it has no rows, the sources'
// problems and their names. A card that has nothing is not drawn, so a card asks here whether there is a button to connect
// or a problem to tell.
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { anyReading, failedReads, readProblem } from "../lib/sources";
import { useWords } from "../lib/wording";

/** The current time, refreshed every minute, for the "now" line and for telling today's mail from older mail. */
export function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  return now;
}

/** What a card says about its sources when it has no rows: a button to connect one while none is set up or reading (only when
 * `onAdd` is given), or the problems of the sources that couldn't be read, one line each. A card with neither and no rows has
 * nothing to say and is not drawn. */
export function useSourceState(
  onAdd: (() => void) | undefined,
  label: string,
  kind: "mail" | "calendar",
): { button?: { label: string; run: () => void }; problems: string[] } {
  const { t, has } = useWords();
  const watch = useQuery({ queryKey: ["watch"], queryFn: api.watchSources });
  if (!watch.data) return { problems: [] };
  if (!anyReading(watch.data)) return onAdd ? { button: { label, run: onAdd }, problems: [] } : { problems: [] };
  // A source that couldn't be read is said so, with why and what to do, and never leaves the card looking up to date.
  return { problems: failedReads(watch.data, kind).map((source) => readProblem(source, t, has)) };
}

/** What a source that couldn't be read says, one line each. */
export function SourceProblems(props: { problems: string[] }) {
  if (props.problems.length === 0) return null;
  return (
    <ul className="plain-list" data-source-problems="">
      {props.problems.map((problem) => (
        <li key={problem} className="problem-note" role="alert">
          {problem}
        </li>
      ))}
    </ul>
  );
}

/** Source names are only worth showing when rows come from more than one source. */
export function useSourceNames(sources: string[]): (id: string) => string {
  const watch = useQuery({ queryKey: ["watch"], queryFn: api.watchSources });
  const many = new Set(sources).size > 1;
  const names = new Map((watch.data ?? []).map((s) => [s.id, s.label]));
  return (id) => (many ? (names.get(id) ?? "") : "");
}
