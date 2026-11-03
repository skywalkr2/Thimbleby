// "Needs a date" (design 7.5): the open to-dos with no date that the person owns or has told someone about, at the top of
// the to-dos, each with a date picker. Picking a day sets the to-do's date as the person's own change, at once, with Undo; it
// drops the words an old date was read from and leaves the group on its own. Nothing here guesses a date.
import { api } from "../lib/api";
import { useAct } from "../lib/act";
import { day } from "../lib/dates";
import type { OpenAction } from "../lib/open-items";
import { shortTitle } from "../lib/title-dates";
import { recordView, viewHref } from "../lib/views";
import { useWords } from "../lib/wording";
import { DateField } from "../ui/DateField";
import { Row } from "../ui/Row";
import { RowList } from "../ui/RowList";
import styles from "./OpenItems.module.css";

/** A day typed or picked in full: four digits for the year, so a year half typed is never saved. */
const FULL_DAY = /^(19|2\d)\d\d-\d\d-\d\d$/;

/** `hint` names the wording of the note under the group (its `.one` and `.other` forms), for a screen where the dated to-do goes
 * somewhere other than the list below. */
export function NeedsADate(props: { rows: OpenAction[]; first?: boolean; hint?: string }) {
  const { t, tn } = useWords();
  const act = useAct();
  if (props.rows.length === 0) return null;
  const setDay = (row: OpenAction, picked: string) => {
    if (!FULL_DAY.test(picked)) return;
    void act(
      () => api.editRecord({ kind: "action", id: row.id, fields: { due: picked, due_words: null, due_check: false }, read_version: row.version }),
      (result) => ({
        message: t("open.needs_date.saved", { text: shortTitle(row.text), date: day(picked) }),
        undo: () => api.undo(result.changeset),
      }),
    );
  };
  return (
    <section className={styles.needs} aria-labelledby="needs-date-title" data-needs-date="">
      <h2 id="needs-date-title" className={styles.needsHead}>
        {t("open.needs_date.title")}
        <span className={styles.needsCount} aria-hidden="true">
          · {props.rows.length}
        </span>
      </h2>
      <RowList aria-label={t("open.needs_date.list")}>
        {props.rows.map((a) => (
          <Row
            key={a.id}
            title={<a href={viewHref(recordView("action", a.id))}>{shortTitle(a.text)}</a>}
            meta={[a.owners.length > 0 ? a.owners.map((o) => o.name).join(", ") : t("open.nobody"), a.project_name || a.side_name].filter(Boolean).join(" · ")}
          >
            <div className={styles.pick}>
              <label className="hint" htmlFor={`needs-date-${a.id}`}>
                {t("open.needs_date.pick", { text: shortTitle(a.text) })}
              </label>
              <DateField id={`needs-date-${a.id}`} value="" onChange={(e) => setDay(a, e.target.value)} />
            </div>
          </Row>
        ))}
      </RowList>
      <p className="hint">{tn(props.hint ?? "open.needs_date.hint", props.rows.length)}</p>
    </section>
  );
}
