// Connecting a mailbox by service name (design 6.33, "Guided mailbox step"): the person picks their mail service from a list
// the app offers (the services are data, never named here), reads its numbered steps for making an app password, and types
// only their address and that password; the server details are filled in on the server. After the mailbox is connected, a
// service that has steps for its calendar's private address offers to add the calendar too. "Another mailbox" hands over to
// the full form, where the server is typed by hand. With no service on offer the component shows nothing.
import { useQuery } from "@tanstack/react-query";
import { useEffect, useId, useRef, useState } from "react";
import { api, ApiError, type S } from "../lib/api";
import { problemText } from "../lib/problem";
import { useAfterSave, useFreshFingerprint } from "../lib/settings-save";
import { useWords } from "../lib/wording";
import { SafeLink } from "./SafeText";
import { Button } from "../ui/Button";
import { Select } from "../ui/Select";
import { FormField } from "../ui/FormField";
import { FormBlock } from "../ui/FormBlock";
import { Actions } from "../ui/Actions";
type Service = S["MailServiceView"];

/** What `onPick` is told when the person chooses to type the server by hand. */
export const OTHER_MAILBOX = "other";
/** How often a connection made here is read, as the full form offers it first. */
const EVERY_MINUTES = 60;

/** A numbered list of plain steps, each with its number. */
function Steps(props: { steps: string[]; label: string }) {
  return (
    <ol className="plain-list numbered-steps" aria-label={props.label}>
      {props.steps.map((text, i) => (
        <li className="numbered-step" key={i}>
          <span className="step-number" aria-hidden="true">
            {i + 1}
          </span>
          <div className="step-text">
            <span>{text}</span>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function MailServiceConnect(props: {
  /** Told which service is picked (its id), "other" for typing the server by hand, or "" for none. */
  onPick?: (id: string) => void;
  /** Called when everything the person set out to connect here is done (or they chose to leave the calendar for later). */
  onConnected?: () => void;
  /** An id for the pick list, for something else on the screen to send the cursor to. */
  selectId?: string;
}) {
  const { t } = useWords();
  const base = useId();
  const afterSave = useAfterSave();
  const fresh = useFreshFingerprint();
  const services = useQuery({ queryKey: ["mail-services"], queryFn: api.mailServices });
  const setup = useQuery({ queryKey: ["setup"], queryFn: api.setup });
  // A hosted app keeps no typed secret: the person gives where the password is kept, as for any setting.
  const local = setup.data?.local ?? true;
  const [picked, setPicked] = useState("");
  const [address, setAddress] = useState("");
  const [password, setPassword] = useState("");
  const [calendar, setCalendar] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
  const [connected, setConnected] = useState(false);
  const addressBox = useRef<HTMLInputElement>(null);
  const calendarBox = useRef<HTMLInputElement>(null);
  const { onPick } = props;

  const list = services.data ?? [];
  const service: Service | undefined = list.find((s) => s.id === picked);

  // The cursor goes to the first field of what the pick opened: the address.
  useEffect(() => {
    if (service && !connected) addressBox.current?.focus();
  }, [service?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (connected) calendarBox.current?.focus();
  }, [connected]);
  // Leaving tells the parent nothing is picked any more.
  const told = useRef(onPick);
  told.current = onPick;
  useEffect(() => () => told.current?.(""), []);

  if (list.length === 0) return null;

  const pick = (id: string) => {
    setPicked(id);
    setProblem("");
    setConnected(false);
    onPick?.(id);
  };

  /** All done here: the choice is cleared and the parent told, so a step can show what is read now. */
  const finish = () => {
    setPicked("");
    setAddress("");
    setConnected(false);
    onPick?.("");
    props.onConnected?.();
  };

  const failed = (err: unknown) => (err instanceof ApiError && err.detail ? err.detail : problemText(err, t));

  const connect = async () => {
    if (!service || busy || address.trim() === "" || password.trim() === "") return;
    setBusy(true);
    setProblem("");
    try {
      const user = address.trim();
      const saved = await api.addSource({
        connector: "mailbox",
        every_minutes: EVERY_MINUTES,
        service: service.id,
        label: user,
        settings: local ? { user } : { user, password: password.trim() },
        ...(local ? { secrets: { password: password.trim() } } : {}),
        fingerprint: await fresh(),
      });
      await afterSave(saved, { message: t("mail_service.connected_toast", { service: service.name }) });
      // The password was sent once and is not kept on the screen.
      setPassword("");
      if (service.calendar_steps.length > 0) setConnected(true);
      else finish();
    } catch (err) {
      setProblem(failed(err));
    } finally {
      setBusy(false);
    }
  };

  const addCalendar = async () => {
    if (!service || busy || calendar.trim() === "") return;
    setBusy(true);
    setProblem("");
    try {
      const where = calendar.trim();
      const saved = await api.addSource({
        connector: "calendar",
        every_minutes: EVERY_MINUTES,
        label: t("mail_service.calendar_label", { service: service.name }),
        settings: local ? {} : { address: where },
        ...(local ? { secrets: { address: where } } : {}),
        fingerprint: await fresh(),
      });
      await afterSave(saved, { message: t("mail_service.calendar_toast", { service: service.name }) });
      setCalendar("");
      finish();
    } catch (err) {
      setProblem(failed(err));
    } finally {
      setBusy(false);
    }
  };

  const enter = (run: () => Promise<void>) => (e: React.KeyboardEvent) => {
    // Inside another form, Enter here connects this and nothing else.
    if (e.key === "Enter") {
      e.preventDefault();
      void run();
    }
  };

  return (
    <div className="mail-service" data-mail-service="" role="group" aria-labelledby={`${base}-title`}>
      <p className="what" id={`${base}-title`}>
        {t("mail_service.title")}
      </p>
      <FormField id={props.selectId ?? `${base}-pick`} label={t("mail_service.pick")}>
        <Select id={props.selectId ?? `${base}-pick`} value={picked} disabled={busy} onChange={(e) => pick(e.target.value)} aria-describedby={`${base}-pick-hint`}>
          <option value="">{t("mail_service.choose")}</option>
          {list.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
          <option value={OTHER_MAILBOX}>{t("mail_service.other")}</option>
        </Select>
        <p className="hint" id={`${base}-pick-hint`}>
          {t("mail_service.pick_hint")}
        </p>
      </FormField>
      {service && !connected && (
        <>
          <p className="what">{t("mail_service.steps_title", { service: service.name })}</p>
          <Steps steps={service.app_password_steps} label={t("mail_service.steps_title", { service: service.name })} />
          {service.app_password_page && (
            <p className="hint" data-app-passwords-page="">
              <SafeLink label={t("mail_service.open_page", { service: service.name })} url={service.app_password_page} />
            </p>
          )}
          <FormField id={`${base}-address`} label={t("mail_service.address")}>
            <input
              id={`${base}-address`}
              ref={addressBox}
              type="email"
              value={address}
              autoComplete="off"
              disabled={busy}
              aria-describedby={service.user_hint ? `${base}-address-hint` : undefined}
              onChange={(e) => setAddress(e.target.value)}
              onKeyDown={enter(connect)}
            />
            {service.user_hint && (
              <p className="hint" id={`${base}-address-hint`}>
                {service.user_hint}
              </p>
            )}
          </FormField>
          <FormField id={`${base}-password`} label={t(local ? "mail_service.password" : "mail_service.password_where")}>
            <input
              id={`${base}-password`}
              type={local ? "password" : "text"}
              value={password}
              autoComplete="off"
              disabled={busy}
              aria-describedby={`${base}-password-hint`}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={enter(connect)}
            />
            <p className="hint" id={`${base}-password-hint`}>
              {t(local ? "mail_service.password_hint" : "secret.hosted_hint")}
            </p>
          </FormField>
          {problem && (
            <p className="problem-note" role="alert" data-mail-service-problem="">
              {problem}
            </p>
          )}
          <Actions align="end">
            <Button variant="primary" disabled={busy || address.trim() === "" || password.trim() === ""} onClick={() => void connect()}>
              {busy ? t("mail_service.connecting") : t("mail_service.connect", { service: service.name })}
            </Button>
          </Actions>
        </>
      )}
      {service && connected && (
        <FormBlock data-calendar-offer="" role="group" aria-labelledby={`${base}-calendar-title`}>
          <p className="what" id={`${base}-calendar-title`}>
            {t("mail_service.calendar_title")}
          </p>
          <p className="hint">{t("mail_service.calendar_intro", { service: service.name })}</p>
          <Steps steps={service.calendar_steps} label={t("mail_service.calendar_title")} />
          <label htmlFor={`${base}-calendar`}>{t("mail_service.calendar_address")}</label>
          <input
            id={`${base}-calendar`}
            ref={calendarBox}
            type={local ? "password" : "text"}
            value={calendar}
            autoComplete="off"
            disabled={busy}
            onChange={(e) => setCalendar(e.target.value)}
            onKeyDown={enter(addCalendar)}
          />
          {problem && (
            <p className="problem-note" role="alert">
              {problem}
            </p>
          )}
          <Actions align="end">
            <Button variant="quiet" disabled={busy} onClick={finish}>
              {t("mail_service.calendar_skip")}
            </Button>
            <Button variant="primary" disabled={busy || calendar.trim() === ""} onClick={() => void addCalendar()}>
              {busy ? t("mail_service.connecting") : t("mail_service.calendar_add")}
            </Button>
          </Actions>
        </FormBlock>
      )}
    </div>
  );
}
