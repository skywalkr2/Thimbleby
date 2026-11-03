// What Today says when nothing needs the person (design 7.7), by where the setup stands: with no AI service it says to connect
// one, with one but nothing yet worked on it says what to hand in, and only once the assistant has worked on something does
// it say that nothing needs them: as the all-clear card when every source was read, otherwise in one line with what was read.
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useNextSetupStep } from "../lib/setup-next";
import { useWords } from "../lib/wording";
import { EmptyState } from "../ui/EmptyState";
import { useCoverage } from "../lib/coverage";
import { NothingNeedsYou } from "./Coverage";
import { AllClear } from "./TodayAllClear";
import { MissedOneLine } from "./MissedOne";

export function TodayEmpty(props: { className?: string; onContinueSetup?: (step: string) => void; onHandIn?: () => void }) {
  const { t } = useWords();
  const status = useQuery({ queryKey: ["status"], queryFn: api.status });
  const setupNext = useNextSetupStep();
  const found = useCoverage();
  if (!status.data) return null;
  // Setup is not finished: "nothing needs you" would be untrue, so the empty state says which step is next.
  if (setupNext) {
    return (
      <EmptyState
        className={props.className}
        icon="gear"
        data-queue-empty="setup"
        text={t("queue.empty.setup_next", { step: setupNext.label })}
        action={props.onContinueSetup ? { label: t("queue.empty.continue_setup"), onClick: () => props.onContinueSetup?.(setupNext.id) } : null}
      />
    );
  }
  const noAi = status.data.ai.state === "not_set_up" || status.data.ai.state === "stand_in";
  if (noAi) {
    return (
      <EmptyState
        className={props.className}
        icon="gear"
        data-queue-empty="connect"
        text={t("queue.empty.connect")}
        action={props.onContinueSetup ? { label: t("queue.empty.continue_setup"), onClick: () => props.onContinueSetup?.("ai") } : null}
      />
    );
  }
  if (status.data.assistant.last_run_at === null) {
    return (
      <EmptyState
        className={props.className}
        icon="upload"
        data-queue-empty="first"
        text={t("queue.empty.hand_in")}
        action={props.onHandIn ? { label: t("handin.open"), onClick: props.onHandIn } : null}
      />
    );
  }
  // Setup done, a run has happened and every source was read: the brand moment, with the coverage as a quiet line under it.
  if (found?.complete) return <AllClear className={props.className} found={found} />;
  return (
    <NothingNeedsYou className={props.className}>
      <MissedOneLine className="hint" />
    </NothingNeedsYou>
  );
}
