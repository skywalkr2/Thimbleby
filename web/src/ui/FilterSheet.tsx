// The one Filter sheet (design 7.12): on a phone every filter of a screen (its side filter, its calendars, who or which state)
// lives behind one "Filter" button, with how many are on, and opens as one sheet from the bottom edge. From the tablet width
// the filters stay in their row. The caller draws the filters themselves; inside the sheet they read `useInFilterSheet` to
// draw as full rows.
import { useState, type ReactNode } from "react";
import { useWords } from "../lib/wording";
import { Button } from "./Button";
import { InFilterSheet } from "./inFilterSheet";
import { Sheet } from "./Sheet";
import styles from "./FilterSheet.module.css";

export function FilterSheet(props: {
  /** How many filters are on now; the button says so and nothing is said for none. */
  active?: number;
  children: ReactNode;
}) {
  const { t } = useWords();
  const [open, setOpen] = useState(false);
  const active = props.active ?? 0;
  return (
    <>
      <Button icon="chevron-down" aria-haspopup="dialog" data-filter-sheet-open="" onClick={() => setOpen(true)}>
        {active > 0 ? t("filter.open_count", { n: active }) : t("filter.open")}
      </Button>
      {open && (
        <Sheet title={t("filter.sheet")} onClose={() => setOpen(false)}>
          <InFilterSheet.Provider value>
            <div className={styles.fields} data-filter-sheet="">
              {props.children}
            </div>
          </InFilterSheet.Provider>
        </Sheet>
      )}
    </>
  );
}
