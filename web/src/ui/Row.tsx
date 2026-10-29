// A list row (design 7.14): an optional leading slot, then the title with one meta line, then the actions at the right edge.
// The leading slot (`lead`: a round check box, a dot) takes no width when it is empty, so titles start at the left edge of a
// list that has none. A mark the group heading does not already say (`pill`) sits in the title's line, never in a column of
// its own, so titles line up whether or not a row has one. A row's actions are never solid: the one
// primary draws as an outline. The row the cursor is on has a soft fill and a bar at its left edge. `clamp` keeps a title to
// two lines for a compact list; `oneLine` keeps the meta to one line, cut with an ellipsis. `data-row` puts it in the keyboard
// loop. Rows are separated by hairlines, never cards.
// A row that opens something under it is an ExpandableRow: its title is a button (`expand`) that says whether the body is open
// (`aria-expanded`) and what it controls, and it covers the whole text of the row, so the meta opens it too; the body is the
// row's `children`, in a RowBody. `meta` is one line, `metaLines` several, each drawn as a
// line of its own. `titleId` names the title text for the row's `aria-labelledby`.
import { Children, type HTMLAttributes, type ReactNode, type Ref } from "react";
import styles from "./Row.module.css";

/** What makes a row's title and meta one button that opens the row's body. */
export interface RowExpand {
  expanded: boolean;
  onToggle: () => void;
  /** The id of the body this button opens, when the body has one. */
  controls?: string;
  /** Pressing it would change nothing (the row is already the chosen one): it neither looks nor feels clickable. */
  inert?: boolean;
}

export interface RowProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  /** A control or marker that leads the row: a round check box, an unread dot. */
  lead?: ReactNode;
  /** A mark that says something the group heading does not; it stands before the title. */
  pill?: ReactNode;
  title: ReactNode;
  /** The id of the title's own text, for the row's `aria-labelledby`. */
  titleId?: string;
  /** The meta line. */
  meta?: ReactNode;
  /** Several meta lines, each drawn as a line of its own (one that is empty is left out). */
  metaLines?: ReactNode[];
  /** Makes the title and the meta one button that opens the row's body. */
  expand?: RowExpand;
  /** Keep the meta to one line, cut with an ellipsis. */
  oneLine?: boolean;
  /** Keep the title to two lines, cut with an ellipsis, for a list that must stay compact (Today's queue). The value is the title's full words, kept in its `title` attribute. */
  clamp?: string;
  primary?: ReactNode;
  menu?: ReactNode;
  /** More actions after the primary and the menu, for a row whose buttons are several. */
  actions?: ReactNode;
  /** The row is a stop of the keyboard loop (the default); a heading row that only opens its list is not (`loop={false}`). */
  loop?: boolean;
  /** The row has the cursor, or is open in the pane. */
  selected?: boolean;
  /** Content under the row, across its full width (an expanded row's items). */
  children?: ReactNode;
  /** Use a list item inside a list (the default), a plain block, or a labelled section. */
  as?: "li" | "div" | "section";
  /** The row's element, whichever tag it is drawn as. */
  ref?: Ref<HTMLElement>;
}

/** The meta lines of a row: none, one, or one for each line that has something in it. */
function linesOf(meta: ReactNode, more: ReactNode[] | undefined): ReactNode[] {
  return [meta, ...(more ?? [])].filter((m) => m !== undefined && m !== null && m !== false && m !== "");
}

export function Row(props: RowProps) {
  const { lead, pill, title, titleId, meta, metaLines, expand, oneLine, clamp, primary, menu, actions, selected, loop = true, children, as = "li", className, ref, ...rest } = props;
  const Tag = as as "div";
  const leads = !!lead;
  // The cursor's row: given by `selected`, or by `aria-current` as a list's row attributes set it.
  const isSelected = selected ?? rest["aria-current"] === "true";
  const lines = linesOf(meta, metaLines);
  const metaClass = oneLine ? `${styles.meta} ${styles.oneLine}` : styles.meta;
  return (
    <Tag
      tabIndex={loop ? -1 : undefined}
      {...(rest as HTMLAttributes<HTMLDivElement>)}
      ref={ref as Ref<HTMLDivElement>}
      data-row={loop ? "" : undefined}
      data-selected={isSelected ? "" : undefined}
      aria-current={isSelected ? "true" : undefined}
      className={[styles.row, leads ? styles.leads : "", isSelected ? styles.selected : "", className ?? ""].filter(Boolean).join(" ")}
    >
      {leads && (
        <div className={styles.lead} data-row-lead="">
          {lead}
        </div>
      )}
      <div className={expand ? `${styles.main} ${styles.expandable}` : styles.main}>
        <div className={clamp ? `${styles.title} ${styles.clamp}` : styles.title} title={clamp}>
          {pill && <span className={styles.mark}>{pill}</span>}
          {expand ? (
            <button
              type="button"
              className={styles.expander}
              data-expander=""
              aria-expanded={expand.expanded}
              aria-controls={expand.controls}
              data-inert={expand.inert ? "" : undefined}
              onClick={expand.onToggle}
            >
              {titleId ? <span id={titleId}>{title}</span> : title}
            </button>
          ) : titleId ? (
            <span id={titleId}>{title}</span>
          ) : (
            title
          )}
        </div>
        {lines.map((line, i) => (
          <p key={i} className={metaClass} title={oneLine && typeof line === "string" ? line : undefined}>
            {line}
          </p>
        ))}
      </div>
      {(primary || menu || actions) && (
        <div className={styles.actions}>
          {primary}
          {actions}
          {menu}
        </div>
      )}
      {Children.toArray(children).length > 0 && <div className={styles.extra} data-row-extra="">
          {children}
        </div>}
    </Tag>
  );
}

/** A row that opens something under it: a Row with `expand` required. */
export function ExpandableRow(props: RowProps & { expand: RowExpand }) {
  return <Row {...props} />;
}

/** A line of a row list that holds content of its own (a disclosure, one button): the row's padding and hairline, no title. */
export function RowItem(props: HTMLAttributes<HTMLLIElement> & { ref?: Ref<HTMLLIElement> }) {
  const { className, ...rest } = props;
  return <li {...rest} className={[styles.item, className ?? ""].filter(Boolean).join(" ")} />;
}
