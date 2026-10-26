// What waits for the person's approval to go out (design 7.4, 6.12), as the first part of Follow-ups' To send tab: one line for
// each, with its state in words and an icon and its one button. The one chosen shows in full in the detail beside the list (a
// drawer below 1024px), with its exact content and target, the callouts to acknowledge by name and Approve and send. The list
// is Follow-ups' own list | detail: the screen holds the choice, so an act and a person's message are chosen the same way.
import { useRef } from "react";
import { actTitle, subjectOf, canTakeBack, isByHand, useOutgoing, changedWords, type Act } from "../lib/acts";
import { useRowKeys } from "../lib/keys";
import type { ListChoice } from "../lib/list-choice";
import { useWords } from "../lib/wording";
import { Button } from "../ui/Button";
import { ActPill } from "./ActPill";
import { RowMenu, type MenuAction } from "./RowMenu";
import { SafeText } from "./SafeText";
import { Row } from "../ui/Row";

/** The key an act has in the list's choice, apart from every person's. */
export const actKey = (id: string): string => `act:${id}`;
/** The acts that wait, under their own heading: what they are, that nothing goes without the person's approval, one line each. */
export function ActsList(props: { acts: Act[]; choice: ListChoice; onLook: (id: string) => void }) {
  const { t } = useWords();
  return (
    <section aria-labelledby="outgoing-title" data-waiting-acts="">
      <h2 id="outgoing-title">{t("outgoing.title")}</h2>
      <p className="hint">{t("outgoing.intro")}</p>
      <ol className="queue" aria-label={t("outgoing.list")}>
        {props.acts.map((a) => (
          <OutgoingRow key={a.id} act={a} choice={props.choice} onLook={() => props.onLook(a.id)} />
        ))}
      </ol>
    </section>
  );
}

function OutgoingRow(props: { act: Act; choice: ListChoice; onLook: () => void }) {
  const { t } = useWords();
  const out = useOutgoing();
  const ref = useRef<HTMLLIElement & HTMLDivElement>(null);
  const { act, choice } = props;
  const title = actTitle(act, t);
  const titleId = `outgoing-${act.id}`;

  const label =
    act.status === "stale"
      ? "outgoing.primary.look"
      : act.status === "uncertain"
        ? "outgoing.primary.check"
        : isByHand(act)
          ? "outgoing.primary.review_copy"
          : "outgoing.primary.review";
  const open = () => {
    if (act.status === "stale") props.onLook();
    choice.enter(actKey(act.id));
  };
  const primary = act.status === "sending" ? null : open;
  useRowKeys(ref, { toggle: () => choice.enter(actKey(act.id)), primary: primary ?? undefined });

  const menu: MenuAction[] = canTakeBack(act) ? [{ id: "withdraw", label: t("outgoing.withdraw"), run: () => void out.withdraw(act) }] : [];
  const note =
    act.status === "failed" && act.failure
      ? t("outgoing.failure.text", { reason: act.failure.reason })
      : act.status === "stale"
        ? t("outgoing.stale.row", { changed: changedWords(act, t) })
        : t(`outgoing.state_long.${act.status}`);
  const subject = subjectOf(act);

  return (
    <Row
      ref={ref}
      aria-labelledby={titleId}
      pill={<ActPill status={act.status} />}
      title={
        <span id={titleId}>
          <SafeText text={title} />
        </span>
      }
      meta={[subject, note].filter(Boolean).join(" · ")}
      primary={
        primary ? (
          <Button size="sm" variant="primary" data-key="primary" aria-describedby={titleId} onClick={primary}>
            {t(label)}
          </Button>
        ) : undefined
      }
      menu={<RowMenu label={title} actions={menu} />}
      {...choice.rowProps(actKey(act.id))}
    />
  );
}
