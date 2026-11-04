// The side filter on Today and Follow-ups (design 6.32, 7.8): All, Personal and each side of the person's work, shown only to a
// person who has set one, and remembered on this browser as the theme is. One option for each side of the person's work. It is
// there only for a person who has set one, and nothing is drawn without a side; the pick is the same on every screen and is
// remembered on this browser. A screen that has something waiting for the person passes it as `waiting`, and each choice
// then says how many wait in it, in words for a screen reader. A screen with tabs passes `counts` (what the open tab holds) and
// `holds` (what it holds in all), so the numbers match the list and a short list has no bar.
// On a phone, and below 1100px of window where a row of choices with long names would take several lines, there is no strip:
// one button in the page header names the pick and opens a sheet with the choices as a list to pick from.
import { useState } from "react";
import { useIsNarrow, useMediaQuery } from "../lib/media";
import { countText } from "../lib/counts";
import { filterBarShown } from "../lib/filterbar";
import { useSideFilter, type SideChoice } from "../lib/sides";
import { useTabCounts, type WaitingScreen } from "../lib/waiting";
import { useWords } from "../lib/wording";
import { Button } from "../ui/Button";
import { Icon } from "../ui/Icon";
import { SegmentedControl } from "../ui/SegmentedControl";
import { Sheet } from "../ui/Sheet";
import styles from "./SideFilter.module.css";

/** The window width below which the strip gives way to the button and its sheet. */
export const SIDE_STRIP_BELOW = "(max-width: 1100px)";

export function SideFilter(props: {
  waiting?: WaitingScreen;
  /** How many rows the tab on screen holds under a choice. It replaces the screen-wide count of what waits, so a count never
   * contradicts the list under it (an empty tab shows none). */
  counts?: (choice: SideChoice) => number;
  /** How many rows the list holds before any filter: a list with fewer than the filter bar's minimum draws no bar, unless a side is
   * picked (the person can always take it off). */
  holds?: number;
}) {
  const { t, tn } = useWords();
  const filter = useSideFilter();
  const counted = useTabCounts(props.waiting ?? "changed");
  const narrow = useIsNarrow();
  const tight = useMediaQuery(SIDE_STRIP_BELOW);
  const [open, setOpen] = useState(false);
  if (!filter.offered) return null;
  if (props.holds !== undefined && !filterBarShown(props.holds, filter.picked !== "all")) return null;
  const option = (value: SideChoice, label: string) => {
    const count = props.counts ? props.counts(value) : props.waiting ? counted(value) : 0;
    return { value, label, count, countWords: count ? tn("sides.filter.waiting", count) : undefined };
  };
  const options = [
    option("all", t("sides.filter.all")),
    // A side's views follow it, each named with its side so a choice is never a bare name.
    ...filter.options.flatMap((o) => [option(o.id, o.name), ...filter.views.filter((v) => v.side === o.id).map((v) => option(v.id, t("sides.filter.view", { side: v.sideName, view: v.name })))]),
  ];
  if (narrow || tight) {
    const current = options.find((o) => o.value === filter.picked) ?? options[0];
    return (
      <>
        <Button
          className={styles.open}
          icon="chevron-down"
          aria-haspopup="dialog"
          aria-label={t("sides.filter.open", { name: current.label })}
          title={current.label}
          data-side-select=""
          onClick={() => setOpen(true)}
        >
          <span className={styles.openName}>{t("sides.filter.open", { name: current.label })}</span>
        </Button>
        {open && (
          <Sheet title={t("sides.filter.sheet")} onClose={() => setOpen(false)}>
            <p className={styles.hint}>{t("sides.filter.sheet_hint")}</p>
            <ul className={styles.options} aria-label={t("sides.filter.label")}>
              {options.map((o) => (
                <li key={o.value}>
                  <button
                    type="button"
                    className={styles.option}
                    aria-current={o.value === filter.picked ? "true" : undefined}
                    aria-label={o.count ? `${o.label}, ${o.countWords ?? o.count}` : undefined}
                    data-side-option={o.value}
                    onClick={() => {
                      filter.set(o.value);
                      setOpen(false);
                    }}
                  >
                    <span className={styles.name}>{o.label}</span>
                    {o.count ? (
                      <span className={styles.count} aria-hidden="true">
                        {countText(o.count)}
                      </span>
                    ) : null}
                    <span className={styles.tick} aria-hidden="true">
                      {o.value === filter.picked && <Icon name="check" size={18} />}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </Sheet>
        )}
      </>
    );
  }
  return <SegmentedControl<SideChoice> label={t("sides.filter.label")} value={filter.picked} onChange={filter.set} options={options} />;
}
