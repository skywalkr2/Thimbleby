// Today's all-clear (design 7.7): setup is done, the assistant has run, every source was read and nothing waits. A calm card
// with the brand mark, a title in the display face and one line; "See what was handled today" shows only when something was
// handled today. The coverage stays as a quiet line under it, so an empty Today is never mistaken for "couldn't check".
import { useQuery } from "@tanstack/react-query";
import markDay from "../assets/brand/mark-day.svg";
import markNight from "../assets/brand/mark-night.svg";
import { api } from "../lib/api";
import type { Coverage } from "../lib/coverage";
import { viewHref } from "../lib/views";
import { useWords } from "../lib/wording";
import { ButtonLink } from "../ui/Button";
import { Parts } from "./Coverage";
import { MissedOneLine } from "./MissedOne";
import styles from "./TodayAllClear.module.css";

export function AllClear(props: { className?: string; found: Coverage }) {
  const { t } = useWords();
  const handled = useQuery({ queryKey: ["handled", "counts"], queryFn: api.handledCounts });
  const handledToday = handled.data?.today ?? 0;
  return (
    <div className={[styles.card, props.className ?? ""].filter(Boolean).join(" ")} data-queue-empty="" data-all-clear="">
      <img className={`${styles.mark} ${styles.markDay}`} src={markDay} alt="" data-brand-mark="day" />
      <img className={`${styles.mark} ${styles.markNight}`} src={markNight} alt="" data-brand-mark="night" />
      <span className={styles.glyph} aria-hidden="true" data-brand-glyph="">
        ✳
      </span>
      <h3 className={styles.title}>{t("queue.allclear.title")}</h3>
      <p className={styles.text}>{t("queue.allclear.text")}</p>
      {handledToday > 0 && (
        <ButtonLink size="sm" href={viewHref("work/handled")} data-handled-today="">
          {t("queue.allclear.handled")}
        </ButtonLink>
      )}
      <p className={styles.coverage} data-coverage-line="">
        <Parts found={props.found} />
      </p>
      <MissedOneLine className={styles.coverage} />
    </div>
  );
}
