// Today's rail (design 7.7): at most three cards beside the queue (below it under 1024px, and on the phone each folded to one
// line): Briefing, Schedule and Came in. A card with nothing in it is not drawn; when none is drawn and the queue is empty,
// one line says so. What needs the person is the queue, not the rail, and a to-do is acted on in To-dos and questions, so
// neither the priorities nor the to-dos are cards. An add-on's Today panels follow the cards, each folded to one line.
import { useState } from "react";
import { useSetupOpen } from "../lib/setup-open";
import { useWords } from "../lib/wording";
import { settingsView, type View } from "../lib/views";
import { BriefCard, hasBrief, useBrief } from "./BriefCard";
import { useCameInCard } from "./CameInCard";
import { PluginPanels } from "./PluginPanels";
import { RailFolds } from "./RailPanel";
import { useScheduleCard } from "./ScheduleCard";
import styles from "./Today.module.css";

/** The rail's cards. `onAddSource` opens Sources with the add form open; it is offered only once setup is finished (while it is
 * open the setup line offers it). With a `workspace` the Briefing card is the form that is due. `queueEmpty` is whether the
 * queue has nothing for the person, which is when an empty rail says so. */
export function TodayRail(props: {
  onView: (view: View) => void;
  onAddSource?: () => void;
  workspace?: string;
  onOpenRecord?: (kind: string, id: string) => void;
  queueEmpty?: boolean;
}) {
  const { t } = useWords();
  const setupOpen = useSetupOpen();
  const add = setupOpen ? undefined : (props.onAddSource ?? (() => props.onView(settingsView("connections"))));
  const open = props.onOpenRecord ?? (() => {});
  // The Briefing card closing for the day changes what is drawn, so the rail draws again.
  const [, closed] = useState(0);
  const brief = useBrief(null);
  const briefing = props.workspace ? { settled: !brief.isPending, drawn: hasBrief(brief.data, props.workspace) } : { settled: true, drawn: false };
  const schedule = useScheduleCard(add);
  const cameIn = useCameInCard(add);
  const settled = briefing.settled && schedule.settled && cameIn.settled;
  const nothing = settled && !briefing.drawn && !schedule.drawn && !cameIn.drawn;
  return (
    <div className={styles.rail} role="group" aria-label={t("today.rail.label")} data-region="">
      <RailFolds>
        {briefing.drawn && props.workspace && <BriefCard workspace={props.workspace} onOpenRecord={open} onOpenView={props.onView} onClosed={() => closed((n) => n + 1)} />}
        {schedule.drawn && schedule.card}
        {cameIn.drawn && cameIn.card}
      </RailFolds>
      {nothing && props.queueEmpty && (
        <p className={styles.railNothing} data-rail-nothing="">
          {t("today.rail.nothing_else")}
        </p>
      )}
      <PluginPanels onOpenRecord={open} />
    </div>
  );
}
