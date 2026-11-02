// The small tags that say which of the person's views a line or row is in (design 6.32): the view's short label, one for each
// view its project is in (both when in two, none when in no view). Drawn only for a person who has views; the word is the
// tag, so it never relies on color.
import { useSideFilter } from "../lib/sides";
import styles from "./ViewTags.module.css";

export function ViewTags(props: { views?: readonly string[] | null; className?: string }) {
  const filter = useSideFilter();
  const held = new Map(filter.views.map((v) => [v.view, v]));
  const shown = (props.views ?? []).map((id) => held.get(id)).filter((v): v is NonNullable<typeof v> => !!v);
  if (shown.length === 0) return null;
  return (
    <>
      {shown.map((v) => (
        <span key={v.view} className={props.className ?? styles.tag} data-tag="view" title={v.name}>
          {v.label}
        </span>
      ))}
    </>
  );
}

/** The labels of the views a row is in, for a line of plain text. */
export function useViewLabels(views?: readonly string[] | null): string[] {
  const filter = useSideFilter();
  const held = new Map(filter.views.map((v) => [v.view, v.label]));
  return (views ?? []).map((id) => held.get(id)).filter((label): label is string => !!label);
}
