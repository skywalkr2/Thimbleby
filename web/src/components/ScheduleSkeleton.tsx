// What the calendar page shows while its days are coming (design 7.12): the shape of what will be there, so the page does not
// jump when the days arrive. The time grids get hour rows and a column for each day; the Month and the list by day on a phone
// get the list's rows.
import { useWords } from "../lib/wording";
import { Skeleton } from "../ui/Skeleton";
import styles from "./Schedule.module.css";

export function ScheduleSkeleton(props: { view: "grid" | "month" | "list"; days: number }) {
  const { t } = useWords();
  if (props.view !== "grid") return <Skeleton rows={props.view === "month" ? 5 : 4} />;
  const columns = Math.max(1, props.days);
  return (
    <div role="status" aria-busy="true" aria-label={t("loading")} className={styles.gridSkeleton} data-skeleton="grid" style={{ ["--cols" as string]: columns }}>
      <span aria-hidden="true" />
      {Array.from({ length: columns }, (_, n) => (
        <span key={n} className={styles.skeletonHead} aria-hidden="true" />
      ))}
      {Array.from({ length: 8 }, (_, h) => (
        <span key={h} className={styles.skeletonHour} aria-hidden="true" style={{ gridRow: h + 2 }} />
      ))}
      {Array.from({ length: columns * 8 }, (_, n) => (
        <span key={`c${n}`} className={styles.skeletonCell} aria-hidden="true" style={{ gridRow: Math.floor(n / columns) + 2, gridColumn: (n % columns) + 2 }} />
      ))}
    </div>
  );
}
