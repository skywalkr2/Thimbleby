// What Today says when nothing needs the person (design 7.7), by where the setup stands: with no AI service it says to connect
// one, with one but nothing yet worked on it says what to hand in, and only once the assistant has worked on something does
// it say that nothing needs them and offer "Missed one".
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useWords } from "../lib/wording";
import { EmptyState } from "../ui/EmptyState";
import { NothingNeedsYou } from "./Coverage";
import { MissedOneLine } from "./MissedOne";

export function TodayEmpty(props: { className?: string; onContinueSetup?: () => void; onHandIn?: () => void }) {
  const { t } = useWords();
  const status = useQuery({ queryKey: ["status"], queryFn: api.status });
  if (!status.data) return null;
  const noAi = status.data.ai.state === "not_set_up" || status.data.ai.state === "stand_in";
  if (noAi) {
    return (
      <EmptyState
        className={props.className}
        icon="gear"
        data-queue-empty="connect"
        text={t("queue.empty.connect")}
        action={props.onContinueSetup ? { label: t("queue.empty.continue_setup"), onClick: props.onContinueSetup } : null}
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
  return (
    <NothingNeedsYou className={props.className}>
      <MissedOneLine className="hint" />
    </NothingNeedsYou>
  );
}
