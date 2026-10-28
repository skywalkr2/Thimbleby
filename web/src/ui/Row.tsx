// A list row (design 7.14): an optional leading slot, then the title with one meta line, then the actions at the right edge.
// The leading slot (`lead`: a round check box, a dot) takes no width when it is empty, so titles start at the left edge of a
// list that has none. A mark the group heading does not already say (`pill`) sits in the title's line, never in a column of
// its own, so titles line up whether or not a row has one. A row's actions are never solid: the one
// primary draws as an outline. The row the cursor is on has a soft fill and a bar at its left edge. `clamp` keeps a title to
// two lines for a compact list; `oneLine` keeps the meta to one line, cut with an ellipsis. `data-row` puts it in the keyboard
// loop. Rows are separated by hairlines, never cards.
import { Children, type HTMLAttributes, type ReactNode, type Ref } from "react";
import styles from "./Row.module.css";

export interface RowProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  /** A control or marker that leads the row: a round check box, an unread dot. */
  lead?: ReactNode;
  /** A mark that says something the group heading does not; it stands before the title. */
  pill?: ReactNode;
  title: ReactNode;
  meta?: ReactNode;
  /** Keep the meta to one line, cut with an ellipsis. */
  oneLine?: boolean;
  /** Keep the title to two lines, cut with an ellipsis, for a list that must stay compact (Today's queue). The value is the title's full words, kept in its `title` attribute. */
  clamp?: string;
  primary?: ReactNode;
  menu?: ReactNode;
  /** The row has the cursor, or is open in the pane. */
  selected?: boolean;
  /** Content under the row, across its full width (an expanded row's items). */
  children?: ReactNode;
  /** Use a list item inside a list (the default), a plain block, or a labelled section. */
  as?: "li" | "div" | "section";
  /** The row's element, whichever tag it is drawn as. */
  ref?: Ref<HTMLLIElement & HTMLDivElement & HTMLElement>;
}

export function Row(props: RowProps) {
  const { lead, pill, title, meta, oneLine, clamp, primary, menu, selected, children, as = "li", className, ...rest } = props;
  const Tag = as;
  const leads = !!lead;
  return (
    <Tag
      tabIndex={-1}
      {...rest}
      data-row=""
      data-selected={selected ? "" : undefined}
      aria-current={selected ? "true" : undefined}
      className={[styles.row, leads ? styles.leads : "", selected ? styles.selected : "", className ?? ""].filter(Boolean).join(" ")}
    >
      {leads && (
        <div className={styles.lead} data-row-lead="">
          {lead}
        </div>
      )}
      <div className={styles.main}>
        <div className={clamp ? `${styles.title} ${styles.clamp}` : styles.title} title={clamp}>
          {pill && <span className={styles.mark}>{pill}</span>}
          {title}
        </div>
        {meta && (
          <p className={oneLine ? `${styles.meta} ${styles.oneLine}` : styles.meta} title={oneLine && typeof meta === "string" ? meta : undefined}>
            {meta}
          </p>
        )}
      </div>
      {(primary || menu) && (
        <div className={styles.actions}>
          {primary}
          {menu}
        </div>
      )}
      {Children.toArray(children).length > 0 && <div className={styles.extra}>{children}</div>}
    </Tag>
  );
}
