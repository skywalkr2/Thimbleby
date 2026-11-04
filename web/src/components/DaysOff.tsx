// Days off on a team's page and time away on a person's page (design 5.1, 7.14): each period is a row with Edit and Remove,
// "Add" opens a form with date pickers (never typed dates) and the cursor in its first field, and a team also has its holiday
// calendar and the weekdays it works as lists to pick from. Every change is the person's own, at once, with Undo.
import { useQuery } from "@tanstack/react-query";
import { useId, useRef, useState } from "react";
import { api, type S } from "../lib/api";
import { useAct } from "../lib/act";
import { day } from "../lib/dates";
import { useWords } from "../lib/wording";
import { Actions } from "../ui/Actions";
import { Button } from "../ui/Button";
import { CheckboxGroup } from "../ui/CheckboxGroup";
import { DateField } from "../ui/DateField";
import { FormField } from "../ui/FormField";
import { Row } from "../ui/Row";
import { RowList } from "../ui/RowList";
import { Select } from "../ui/Select";
import { RowMenu } from "./RowMenu";

type Period = { start: string; end: string | null; label: string | null };
const WEEKDAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;

/** The fields these sections own: the page's ordinary details and form leave them to this section. */
export const DAYS_OFF_FIELDS = new Set(["away", "days_off", "working_days", "holiday_calendar"]);

function periodsOf(value: unknown): Period[] {
  if (!Array.isArray(value)) return [];
  return value.map((p) => ({ start: String(p.start ?? "").slice(0, 10), end: p.end ? String(p.end).slice(0, 10) : null, label: p.label ? String(p.label) : null }));
}

export function DaysOff(props: { kind: "person" | "team"; record: S["GenericRecordView"] }) {
  const { t } = useWords();
  const act = useAct();
  const { kind, record } = props;
  const field = kind === "team" ? "days_off" : "away";
  const periods = periodsOf(record.fields[field]);
  const [editing, setEditing] = useState<number | "new" | null>(null);
  const addButton = useRef<HTMLButtonElement>(null);
  const kindView = useQuery({ queryKey: ["kind", "team"], queryFn: () => api.kindView("team"), enabled: kind === "team" });
  const calendars = kindView.data?.fields.find((f) => f.name === "holiday_calendar")?.options ?? [];
  const week = Array.isArray(record.fields.working_days) ? (record.fields.working_days as string[]) : [];
  const ids = useId();

  /** Save fields of the record as the person's own change, at once, with Undo. */
  const save = (fields: Record<string, unknown>, message: string) =>
    act(
      () => api.editRecord({ kind, id: record.id, fields, read_version: record.version }),
      (result) => ({ message, undo: () => api.undo(result.changeset) }),
    );
  const saveList = (next: Period[], message: string) => save({ [field]: next }, message);
  const close = () => {
    setEditing(null);
    requestAnimationFrame(() => addButton.current?.focus());
  };
  const sayRange = (p: Period) => (p.end && p.end !== p.start ? t("daysoff.range", { from: day(p.start), to: day(p.end) }) : day(p.start));

  return (
    <section className="panel-section" aria-labelledby={`${ids}-title`} data-days-off="">
      <h3 id={`${ids}-title`}>{t(kind === "team" ? "daysoff.team.title" : "daysoff.person.title")}</h3>
      {periods.length === 0 && editing !== "new" && <p className="hint">{t(kind === "team" ? "daysoff.team.empty" : record.fields.team ? "daysoff.person.empty_team" : "daysoff.person.empty")}</p>}
      {periods.length > 0 && (
        <RowList aria-label={t(kind === "team" ? "daysoff.team.list" : "daysoff.person.list")}>
          {periods.map((p, i) => (
            <Row
              key={`${p.start}-${i}`}
              title={p.label ?? t(kind === "team" ? "daysoff.team.default" : "daysoff.person.default")}
              meta={sayRange(p)}
              primary={
                <Button variant="quiet" onClick={() => setEditing(i)}>
                  {t("daysoff.edit")}
                </Button>
              }
              menu={
                <RowMenu
                  label={`${p.label ?? ""} ${sayRange(p)}`.trim()}
                  actions={[{ id: "remove", label: t("daysoff.remove"), run: () => void saveList(periods.filter((_, n) => n !== i), t("daysoff.removed")) }]}
                />
              }
            >
              {editing === i && <PeriodForm key={`edit-${i}`} start={p} onSave={(q) => saveList(periods.map((o, n) => (n === i ? q : o)), t("daysoff.changed")).then(close)} onCancel={close} />}
            </Row>
          ))}
        </RowList>
      )}
      {editing === "new" ? (
        <PeriodForm key="new" start={{ start: "", end: null, label: null }} onSave={(q) => saveList([...periods, q], t("daysoff.added")).then(close)} onCancel={close} />
      ) : (
        <Button ref={addButton} variant="quiet" icon="plus" onClick={() => setEditing("new")}>
          {t(kind === "team" ? "daysoff.team.add" : "daysoff.person.add")}
        </Button>
      )}
      {kind === "team" && (
        <>
          <FormField id={`${ids}-calendar`} label={t("daysoff.calendar")} hint={t("daysoff.calendar.hint")}>
            <Select
              id={`${ids}-calendar`}
              aria-describedby={`${ids}-calendar-hint`}
              value={String(record.fields.holiday_calendar ?? "")}
              onChange={(e) => void save({ holiday_calendar: e.target.value || null }, t("daysoff.changed"))}
            >
              <option value="">{t("daysoff.calendar.workspace")}</option>
              {calendars.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </FormField>
          <CheckboxGroup legend={t("daysoff.week")} hint={t("daysoff.week.hint")}>
            {WEEKDAYS.map((w) => (
              <label key={w}>
                <input
                  type="checkbox"
                  checked={week.includes(w)}
                  onChange={(e) => {
                    const next = WEEKDAYS.filter((d) => (d === w ? e.target.checked : week.includes(d)));
                    void save({ working_days: next.length > 0 ? next : null }, t("daysoff.changed"));
                  }}
                />{" "}
                {t(`repeat.weekday.${w}`)}
              </label>
            ))}
          </CheckboxGroup>
        </>
      )}
    </section>
  );
}

function PeriodForm(props: { start: Period; onSave: (p: Period) => Promise<unknown>; onCancel: () => void }) {
  const { t } = useWords();
  const id = useId();
  const [first, setFirst] = useState(props.start.start);
  const [last, setLast] = useState(props.start.end ?? "");
  const [label, setLabel] = useState(props.start.label ?? "");
  const inOrder = !last || !first || last >= first;
  const ready = !!first && inOrder;
  return (
    <form
      className="answer-form"
      aria-label={t("daysoff.form")}
      onSubmit={(e) => {
        e.preventDefault();
        if (ready) void props.onSave({ start: first, end: last && last !== first ? last : null, label: label.trim() || null });
      }}
      onKeyDown={(e) => e.key === "Escape" && props.onCancel()}
    >
      <FormField id={`${id}-first`} label={t("daysoff.first")}>
        <DateField id={`${id}-first`} autoFocus value={first} onChange={(e) => setFirst(e.target.value)} />
      </FormField>
      <FormField id={`${id}-last`} label={t("daysoff.last")} optional hint={inOrder ? t("daysoff.last.hint") : t("daysoff.order")}>
        <DateField id={`${id}-last`} aria-describedby={`${id}-last-hint`} min={first || undefined} value={last} onChange={(e) => setLast(e.target.value)} />
      </FormField>
      <FormField id={`${id}-label`} label={t("daysoff.label")} optional hint={t("daysoff.label.hint")}>
        <input id={`${id}-label`} type="text" aria-describedby={`${id}-label-hint`} maxLength={80} value={label} onChange={(e) => setLabel(e.target.value)} />
      </FormField>
      <Actions align="end">
        <Button variant="quiet" onClick={props.onCancel}>
          {t("action.cancel")}
        </Button>
        <Button variant="primary" type="submit" disabled={!ready}>
          {t("daysoff.save")}
        </Button>
      </Actions>
    </form>
  );
}
