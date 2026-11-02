// The walkthrough's first-result step (design 7.8): once a mailbox is connected and an AI account is chosen it says what the
// assistant will look for in the person's recent mail, that it reads in the background after setup, and that what it
// found waits on Today as one line to look over. It shows no findings, no counts and no list of what was read: setup
// starts the work, Today shows what came of it. Without an AI account or a mailbox it says what to do first and points back.
import { useQuery } from "@tanstack/react-query";
import { api, type S } from "../lib/api";
import type { Screen } from "../lib/walkthrough";
import { useContinue } from "../lib/walkthrough-continue";
import { useWords } from "../lib/wording";
import { Button } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";
import { FormBlock } from "../ui/FormBlock";
import { Actions } from "../ui/Actions";
import { Skeleton } from "../ui/Skeleton";

type Result = S["FirstPromisesView"];

/** The first-result step's body. `go` moves the walkthrough to another screen (to finish what the step needs). */
export function FirstPromises(props: { go: (screen: Screen) => void; onHandIn: () => void }) {
  const { t } = useWords();
  const result = useQuery({ queryKey: ["first-promises"], queryFn: api.firstPromises });
  const data = result.data;
  if (!data) return result.isError ? <EmptyState text={t("welcome.failed")} /> : <Skeleton />;
  return <Stage data={data} go={props.go} onHandIn={props.onHandIn} />;
}

/** Says to the walkthrough that this stage has a primary button of its own, so its Continue is drawn plain beside it. */
function OwnPrimary() {
  useContinue({ run: async () => true, quiet: true });
  return null;
}

/** What the step shows at the stage the server says it is at: what to do first, or the background explanation. */
function Stage(props: { data: Result; go: (screen: Screen) => void; onHandIn: () => void }) {
  const { t } = useWords();
  switch (props.data.stage) {
    case "no_ai":
      return <Needs text={t("walkthrough.promises.no_ai")} label={t("walkthrough.promises.to_ai")} run={() => props.go("ai")} />;
    case "no_mail":
      // With no mail read there is nothing to look back over: handing something in is the way to see what the assistant
      // does, and connecting mail is the quieter choice beside it.
      return (
        <FormBlock data-first-promises="needs">
          <OwnPrimary />
          <p>{t("walkthrough.promises.no_mail")}</p>
          <Actions align="end">
            <Button onClick={() => props.go("mail")}>{t("walkthrough.promises.to_mail")}</Button>
            <Button variant="primary" onClick={props.onHandIn}>
              {t("walkthrough.promises.none_hand_in")}
            </Button>
          </Actions>
        </FormBlock>
      );
    default:
      return (
        <FormBlock data-first-promises="background">
          <p>{t("walkthrough.promises.background")}</p>
          <p className="hint">{t("walkthrough.promises.background_where")}</p>
        </FormBlock>
      );
  }
}

function Needs(props: { text: string; label: string; run: () => void }) {
  return (
    <FormBlock data-first-promises="needs">
      <p>{props.text}</p>
      <Actions align="end">
        <Button onClick={props.run}>{props.label}</Button>
      </Actions>
    </FormBlock>
  );
}
