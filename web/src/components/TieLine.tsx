// The line on a to-do's page when a calendar entry is proposed for it: "Tie <to-do> to <entry> on <day>?", with the two
// answers Today's line has (design 6.32). Tying makes the to-do's date follow the entry; nothing follows a proposal.
import { type S } from "../lib/api";
import { day } from "../lib/dates";
import { useTie } from "../lib/tie";
import { useWords } from "../lib/wording";
import { Button } from "../ui/Button";

export function TieLine(props: { action: string; text: string; tie: S["TieProposal"] }) {
  const { t } = useWords();
  const answers = useTie();
  const { tie } = props;
  return (
    <p className="filed-line" data-tie={tie.entry}>
      <span>{t("queue.tie", { text: props.text, other: tie.title, when: day(tie.day) })}</span>{" "}
      <Button size="sm" onClick={() => void answers.tie(props.action, props.text, tie.title)}>
        {t("queue.tie.yes")}
      </Button>{" "}
      <Button size="sm" variant="quiet" onClick={() => void answers.notThis(props.action, props.text, tie.title)}>
        {t("queue.tie.no")}
      </Button>
    </p>
  );
}
