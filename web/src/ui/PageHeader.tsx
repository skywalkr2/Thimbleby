// The header of a screen (design 7.12): a breadcrumb or back link, the title with its kind beside it, one line under it, and the
// one primary action at the right, with the other controls beside it. Under it, an underlined tab strip with counts (TabStrip)
// and the filter chips (FilterChip); nothing else is put on the title's row. The title is the page's one h1, and the place
// the cursor lands when the screen opens, so it can take a ref and be focused.
import type { ReactNode, Ref } from "react";
import { useIsNarrow } from "../lib/media";
import { BackLink } from "./BackLink";
import { FilterSheet } from "./FilterSheet";
import styles from "./PageHeader.module.css";

export interface PageHeaderProps {
  title: ReactNode;
  /** The id of the heading, for the screen's `aria-labelledby`. */
  id?: string;
  /** The heading's level: 1 for a screen, lower when the same screen is shown inside another (compact). */
  level?: 1 | 2 | 3;
  /** Lets the screen put the cursor on the title when it opens. */
  headingRef?: Ref<HTMLHeadingElement>;
  focusable?: boolean;
  /** A way back or up, above the title. */
  crumb?: ReactNode;
  /** The way back to the page this one was opened from: the one shared control (BackLink), shown where a crumb would be. */
  back?: { label: string; onClick: () => void; name?: string };
  /** What kind of page this is, drawn beside the title (a Pill). */
  kind?: ReactNode;
  /** One line under the title. */
  subtitle?: ReactNode;
  /** The one primary action of the screen. */
  primary?: ReactNode;
  /** The other actions and menus, beside the primary. */
  actions?: ReactNode;
  /** A "more" menu for the page itself: it stays at the right end of the title's row, where the actions wrap onto a row of their own on a phone. */
  more?: ReactNode;
  /** Names the group of actions for a screen reader, when there are several. */
  actionsLabel?: string;
  /** A TabStrip. */
  tabs?: ReactNode;
  /** The filter chips, at the right of the tab strip. */
  filters?: ReactNode;
  /** On a phone the filters are one "Filter" button and sheet (FilterSheet) instead of a row: `shown` says whether any filter is
   * on offer now, and `active` how many are on. Left out, the filters stay as they are on every width. */
  filterSheet?: { shown: boolean; active?: number };
  /** Keeps the line under the title's place while what it says is still being read, so the page below does not move when it arrives. */
  reserveSubtitle?: boolean;
  className?: string;
}

export function PageHeader(props: PageHeaderProps) {
  const { title, id, level = 1, headingRef, focusable, crumb, back, kind, subtitle, primary, actions, more, actionsLabel, tabs, filters, filterSheet, reserveSubtitle, className } = props;
  const phone = useIsNarrow();
  const drawn = filterSheet && phone ? (filterSheet.shown ? <FilterSheet active={filterSheet.active}>{filters}</FilterSheet> : null) : filters;
  const Heading = `h${level}` as const;
  return (
    <div className={[styles.header, className ?? ""].filter(Boolean).join(" ")} data-page-header="">
      {back ? <div className={styles.crumb}><BackLink {...back} /></div> : crumb && <div className={styles.crumb}>{crumb}</div>}
      <div className={styles.top}>
        <div className={styles.titles}>
          <div className={styles.titleLine}>
            <Heading id={id} ref={headingRef} tabIndex={focusable ? -1 : undefined} className={styles.title}>
              {title}
            </Heading>
            {kind}
          </div>
          {subtitle ? <p className={styles.sub}>{subtitle}</p> : reserveSubtitle ? <p className={styles.sub} aria-hidden="true" data-sub-reserved="">&nbsp;</p> : null}
        </div>
        {more && <div className={styles.more}>{more}</div>}
        {(actions || primary) && (
          <div className={styles.actions} role={actionsLabel ? "group" : undefined} aria-label={actionsLabel}>
            {actions}
            {primary}
          </div>
        )}
      </div>
      {(tabs || drawn) && (
        <div className={[styles.bar, tabs ? styles.ruled : ""].filter(Boolean).join(" ")}>
          {tabs && <div className={styles.tabs} data-header-tabs="">{tabs}</div>}
          {drawn && <div className={styles.chips} data-header-filters="">{drawn}</div>}
        </div>
      )}
    </div>
  );
}
