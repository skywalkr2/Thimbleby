// What changed in an invitation (design 6.32, 7.14), on the calendar entry's own page: a list with one row for each change
// the server found in the entry's history, worded from the sheet, newest state first as the server orders them. Nothing here
// changes a record.
import { day, wallTime } from "../lib/dates";
import { plainTitle } from "../lib/title-dates";
import { useWords } from "../lib/wording";
import type { S } from "../lib/api";

type Change = S["InvitationChangeView"];

const clock = (at: string | null | undefined) => (at ? wallTime(`T${at}`) : "");

/** The words for one change: its kind picks the line, its values fill it. */
export function useChangeWords(): (change: Change) => string {
  const { t } = useWords();
  return (change) => {
    const vars = {
      text: plainTitle(change.text ?? ""),
      name: change.name ?? "",
      date: day(change.day),
      time: clock(change.at),
      from: [day(change.from_day), clock(change.from_at)].filter(Boolean).join(" "),
      status: change.status ? t(`invitation.changes.status.${change.status}`) : "",
    };
    const key = change.kind.endsWith("_unknown") ? "invitation.changes.unknown" : `invitation.changes.${change.kind}`;
    const withTime = change.at && (change.kind === "moved" || change.kind === "end_changed") ? `${key}_at` : key;
    return t(withTime, vars);
  };
}

export function InvitationChanges(props: { changes: Change[]; changedAt?: string | null }) {
  const { t } = useWords();
  const words = useChangeWords();
  if (props.changes.length === 0) return null;
  return (
    <section aria-labelledby="invitation-changes" className="record-section" data-invitation-changes="">
      <div className="heading">
        <h3 id="invitation-changes">{t("invitation.changes.heading")}</h3>
      </div>
      {props.changedAt && <p className="hint">{t("invitation.changes.as_of", { date: day(props.changedAt) })}</p>}
      <ul className="plain-list">
        {props.changes.map((change, index) => (
          <li key={`${change.kind}-${index}`} data-change={change.kind}>
            {words(change)}
          </li>
        ))}
      </ul>
    </section>
  );
}
