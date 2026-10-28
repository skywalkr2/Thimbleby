// A new event on a connected calendar (design 6.12), beside Add to schedule (which writes only the app's own calendar). Offered only
// when a connected calendar account can add events after the person's yes: acting is on and its service creates events. The
// drawer asks what, which calendar account, the day, the start and end and an optional alarm; the draft opens in Waiting to go out,
// where the person says yes to exactly what will be written. Nothing is added before it.
import { useId, useState } from "react";
import { useCalendarOptions, useDraftAct } from "../lib/acts";
import { useWords } from "../lib/wording";
import { Button } from "../ui/Button";
import { Drawer } from "../ui/Drawer";

/** The button that opens the form, drawn only when some connected calendar can add an event. */
export function NewEvent(props: { today: string }) {
  const { t } = useWords();
  const options = useCalendarOptions();
  const [open, setOpen] = useState(false);
  const accounts = options.data?.accounts ?? [];
  if (accounts.length === 0) return null;
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        {t("calendar.new.open")}
      </Button>
      {open && <NewEventDrawer today={props.today} accounts={accounts} onClose={() => setOpen(false)} />}
    </>
  );
}

function NewEventDrawer(props: { today: string; accounts: { id: string; label: string }[]; onClose: () => void }) {
  const { t } = useWords();
  const draft = useDraftAct();
  const base = useId();
  const [what, setWhat] = useState("");
  const [account, setAccount] = useState(props.accounts.length === 1 ? props.accounts[0].id : "");
  const [day, setDay] = useState(props.today);
  const [from, setFrom] = useState("09:00");
  const [to, setTo] = useState("10:00");
  const [alarm, setAlarm] = useState("");
  const [bad, setBad] = useState(false);
  const [busy, setBusy] = useState(false);
  const ready = what.trim() !== "" && account !== "" && day !== "" && from !== "" && to !== "";
  const submit = async () => {
    if (!ready) return;
    const start = new Date(`${day}T${from}`);
    const end = new Date(`${day}T${to}`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      setBad(true);
      return;
    }
    setBad(false);
    setBusy(true);
    const made = await draft({
      kind: "calendar",
      action: "create",
      account,
      title: what.trim(),
      start: start.toISOString(),
      end: end.toISOString(),
      alarm_minutes: alarm.trim() === "" ? undefined : Number(alarm),
    });
    setBusy(false);
    if (made) props.onClose();
  };
  return (
    <Drawer
      open
      title={t("calendar.new.title")}
      onClose={props.onClose}
      dirty={what.trim() !== ""}
      footer={
        <>
          <Button onClick={props.onClose}>{t("action.cancel")}</Button>
          <Button type="submit" form={`${base}-form`} variant="primary" disabled={!ready || busy}>
            {t("calendar.new.go")}
          </Button>
        </>
      }
    >
      <form
        id={`${base}-form`}
        className="meeting-line"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <p className="hint">{t("calendar.new.hint")}</p>
        <div className="field">
          <label htmlFor={`${base}-what`}>{t("calendar.new.what")}</label>
          <input id={`${base}-what`} type="text" autoFocus value={what} onChange={(e) => setWhat(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor={`${base}-account`}>{t("calendar.new.account")}</label>
          <select id={`${base}-account`} value={account} onChange={(e) => setAccount(e.target.value)}>
            {props.accounts.length > 1 && <option value="">{t("calendar.new.choose")}</option>}
            {props.accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor={`${base}-day`}>{t("calendar.new.day")}</label>
          <input id={`${base}-day`} type="date" value={day} onChange={(e) => setDay(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor={`${base}-start`}>{t("calendar.new.start")}</label>
          <input id={`${base}-start`} type="time" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor={`${base}-end`}>{t("calendar.new.end")}</label>
          <input id={`${base}-end`} type="time" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor={`${base}-alarm`}>{t("calendar.new.alarm")}</label>
          <input id={`${base}-alarm`} type="number" min={0} max={40320} inputMode="numeric" value={alarm} onChange={(e) => setAlarm(e.target.value)} />
        </div>
        {bad && (
          <p className="problem-note" role="alert">
            {t("calendar.new.bad")}
          </p>
        )}
        {/* The drawer's button is outside the form; this one lets Enter in a field draft the event. */}
        <button type="submit" hidden tabIndex={-1} aria-hidden="true" />
      </form>
    </Drawer>
  );
}
