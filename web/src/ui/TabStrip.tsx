// The underlined tab strip with counts that sits under a screen's title (design 7.12). It switches what one list shows, so each
// tab is a toggle button that says which is on; the count is in words for a screen reader. Tabs that switch panes inside a record
// are a different thing (a tab list), and neither is the main navigation.
import styles from "./TabStrip.module.css";

export interface TabOption<T extends string> {
  value: T;
  label: string;
  count?: number | string;
  /** What the count says in words, for the screen reader ("3 waiting"). */
  countWords?: string;
}

export function TabStrip<T extends string>(props: { label: string; options: TabOption<T>[]; value: T; onChange: (value: T) => void; className?: string }) {
  return (
    <div role="group" aria-label={props.label} className={[styles.strip, props.className ?? ""].filter(Boolean).join(" ")}>
      {props.options.map((o) => (
        <button
          key={o.value}
          type="button"
          className={styles.tab}
          aria-pressed={props.value === o.value}
          aria-label={o.count !== undefined && o.countWords ? `${o.label}, ${o.countWords}` : undefined}
          onClick={() => props.onChange(o.value)}
        >
          {o.label}
          {o.count !== undefined && " "}
          {o.count !== undefined && (
            <span className={styles.count} aria-hidden={o.countWords ? "true" : undefined}>
              {o.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
