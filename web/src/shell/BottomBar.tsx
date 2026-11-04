// The phone's bottom bar (design 7.1): Today, To-dos, a tonal + (Hand something in), Schedule and More. Today, To-dos and Schedule
// are links; More opens a sheet with the rest: the work screens, the saved items and Settings, then the Help items and this
// device's theme and density. Search is an icon in the header, not a tab.
import { useState } from "react";
import { Link } from "react-aria-components";
import { setDensity, setTheme, useAppearance, type Density, type Theme } from "../lib/theme";
import { viewHref, type View } from "../lib/views";
import { useWords } from "../lib/wording";
import { MISSED_BUTTON, useAnythingToMiss, useMissedOne } from "../components/MissedOne";
import { afterClose } from "../ui/afterClose";
import { GroupLabel } from "../ui/GroupLabel";
import { Icon } from "../ui/Icon";
import { SegmentedControl } from "../ui/SegmentedControl";
import { Sheet } from "../ui/Sheet";
import { useNav, type NavEntry } from "./nav";
import { NavCount, navName } from "./NavCount";
import styles from "./BottomBar.module.css";

function Links(props: { entries: NavEntry[]; current: View; onPick: () => void }) {
  return (
    <div className={styles.list}>
      {props.entries.map((e) => (
        <Link key={e.view} href={viewHref(e.view)} className={styles.link} aria-current={props.current === e.view ? "page" : undefined} aria-label={e.count ? navName(e) : undefined} onPress={props.onPick}>
          {e.icon ? <Icon name={e.icon} /> : <span className={styles.glyph} aria-hidden="true">{e.glyph}</span>}
          <span>{e.label}</span>
          <NavCount entry={e} className={styles.count} />
        </Link>
      ))}
    </div>
  );
}

export function BottomBar(props: {
  current: View;
  version: string;
  onHandIn: () => void;
  /** Search lives in the header on a phone; these two stay for the callers that pass them. */
  onOpenRecord?: (kind: string, id: string) => void;
  onAsk?: (question: string) => void;
  /** The keyboard list: a phone has no keyboard to speak of, so the sheet does not offer it. */
  onHelp?: () => void;
  onFeedback: () => void;
  onOpenGuide: () => void;
}) {
  const { t } = useWords();
  const nav = useNav();
  const missed = useMissedOne();
  const anythingMissed = useAnythingToMiss();
  const { theme, density } = useAppearance();
  const [sheet, setSheet] = useState<"more" | null>(null);
  const close = () => setSheet(null);
  const later = (run: () => void) => () => {
    close();
    // The sheet leaves first, so what opens next gets focus and the page behind is no longer inert.
    afterClose(run);
  };
  const todos = nav.work.find((e) => e.view === "work/open");
  // The work screens other than To-dos, which has its own tab.
  const moreWork = nav.work.filter((e) => e.view !== "work/open");
  // The saved items in the groups the person thinks in: their projects (every side and project), then the people and files.
  const kept = nav.records.filter((e) => !nav.projects.includes(e));
  const tabViews: View[] = ["today", "work/open", "schedule"];
  const onMore = !tabViews.includes(props.current);
  return (
    <>
      <nav className={styles.bar} aria-label={t("nav.label")}>
        <a className={styles.item} href={viewHref("today")} aria-current={props.current === "today" ? "page" : undefined}>
          <Icon name="home" size={24} />
          {t("nav.home")}
        </a>
        <a
          className={styles.item}
          href={viewHref("work/open")}
          aria-current={props.current === "work/open" ? "page" : undefined}
          aria-label={todos?.count ? `${t("nav.tab.todos")}, ${todos.countWords ?? todos.count}` : undefined}
        >
          <Icon name="check" size={24} />
          {t("nav.tab.todos")}
        </a>
        <span className={styles.plusCell}>
          <button type="button" className={styles.plus} data-weight="tonal" aria-label={t("handin.open")} onClick={props.onHandIn}>
            <Icon name="plus" size={24} />
          </button>
        </span>
        <a className={styles.item} href={viewHref("schedule")} aria-current={props.current === "schedule" ? "page" : undefined}>
          <Icon name="calendar" size={24} />
          {t("nav.schedule")}
        </a>
        <button type="button" className={styles.item} data-feedback-button="" aria-haspopup="dialog" aria-current={onMore ? "page" : undefined} onClick={() => setSheet("more")}>
          <Icon name="menu" size={24} />
          {t("nav.more")}
        </button>
      </nav>
      {sheet === "more" && (
        <Sheet title={t("nav.more")} onClose={close}>
          <GroupLabel as="p" className={styles.section}>{nav.workTitle}</GroupLabel>
          <Links entries={moreWork} current={props.current} onPick={close} />
          <GroupLabel as="p" className={styles.section}>{t("nav.more.projects")}</GroupLabel>
          <Links entries={nav.projects} current={props.current} onPick={close} />
          <GroupLabel as="p" className={styles.section}>{t("nav.more.people_files")}</GroupLabel>
          <Links entries={kept} current={props.current} onPick={close} />
          <GroupLabel as="p" className={styles.section}>{t("nav.more.settings")}</GroupLabel>
          <Links entries={nav.bottom} current={props.current} onPick={close} />
          <GroupLabel as="p" className={styles.section}>{t("user.theme")}</GroupLabel>
          <div className={styles.choices}>
            <SegmentedControl<Theme>
              label={t("user.theme")}
              value={theme}
              onChange={setTheme}
              options={(["system", "light", "dark"] as Theme[]).map((id) => ({ value: id, label: t(`user.theme.${id}`) }))}
            />
          </div>
          <GroupLabel as="p" className={styles.section}>{t("user.density")}</GroupLabel>
          <div className={styles.choices}>
            <SegmentedControl<Density>
              label={t("user.density")}
              value={density}
              onChange={setDensity}
              options={(["comfortable", "compact"] as Density[]).map((id) => ({ value: id, label: t(`user.density.${id}`) }))}
            />
          </div>
          <GroupLabel as="p" className={styles.section}>{t("header.help")}</GroupLabel>
          <div className={styles.list}>
            {anythingMissed && (
              <button type="button" className={styles.link} {...{ [MISSED_BUTTON]: "" }} onClick={later(missed)}>
                <Icon name="search" />
                {t("missed.menu")}
              </button>
            )}
            <button type="button" className={styles.link} onClick={later(props.onOpenGuide)}>
              <Icon name="book" />
              {t("header.help_guide")}
            </button>
            <button type="button" className={styles.link} onClick={later(props.onFeedback)}>
              <Icon name="chat" />
              {t("feedback.open")}
            </button>
            <button type="button" className={styles.link} disabled>
              <span className={styles.spacer} aria-hidden="true" />
              {t("app.version", { version: props.version })}
            </button>
          </div>
          {/* Scrolling shows where the list goes on: a fade at the sheet's bottom edge until its end. */}
          <div className={styles.fade} aria-hidden="true" />
        </Sheet>
      )}
    </>
  );
}
