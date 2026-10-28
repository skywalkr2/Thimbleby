// The header of a screen (design 7.12): a breadcrumb or back link, the title with its kind beside it, one line under it, and the
// one primary action at the right, with the other controls beside it. Under it, an underlined tab strip with counts (TabStrip)
// and the filter chips (FilterChip); nothing else is put on the title's row. The title is the page's one h1, and the place
// the cursor lands when the screen opens, so it can take a ref and be focused.
import type { ReactNode, Ref } from "react";
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
  /** What kind of page this is, drawn beside the title (a Pill). */
  kind?: ReactNode;
  /** One line under the title. */
  subtitle?: ReactNode;
  /** The one primary action of the screen. */
  primary?: ReactNode;
  /** The other actions and menus, beside the primary. */
  actions?: ReactNode;
  /** Names the group of actions for a screen reader, when there are several. */
  actionsLabel?: string;
  /** A TabStrip. */
  tabs?: ReactNode;
  /** The filter chips, at the right of the tab strip. */
  filters?: ReactNode;
  className?: string;
}

export function PageHeader(props: PageHeaderProps) {
  const { title, id, level = 1, headingRef, focusable, crumb, kind, subtitle, primary, actions, actionsLabel, tabs, filters, className } = props;
  const Heading = `h${level}` as const;
  return (
    <div className={[styles.header, className ?? ""].filter(Boolean).join(" ")} data-page-header="">
      {crumb && <div className={styles.crumb}>{crumb}</div>}
      <div className={styles.top}>
        <div className={styles.titles}>
          <div className={styles.titleLine}>
            <Heading id={id} ref={headingRef} tabIndex={focusable ? -1 : undefined} className={styles.title}>
              {title}
            </Heading>
            {kind}
          </div>
          {subtitle && <p className={styles.sub}>{subtitle}</p>}
        </div>
        {(actions || primary) && (
          <div className={styles.actions} role={actionsLabel ? "group" : undefined} aria-label={actionsLabel}>
            {actions}
            {primary}
          </div>
        )}
      </div>
      {(tabs || filters) && (
        <div className={[styles.bar, tabs ? styles.ruled : ""].filter(Boolean).join(" ")}>
          {tabs && <div className={styles.tabs}>{tabs}</div>}
          {filters && <div className={styles.chips}>{filters}</div>}
        </div>
      )}
    </div>
  );
}
