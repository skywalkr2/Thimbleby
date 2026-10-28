// Sending feedback: the person writes what happened, sees exactly what the email will say, and either opens it in
// their own mail program or copies it. The app sends nothing, and the only facts it adds (if the person leaves them on)
// are the app's version, the name of the screen they were on and, when there were any, the last problems (each already
// masked by the server, and shown in the preview exactly as they will be sent).
import { useQuery } from "@tanstack/react-query";
import { useId, useState } from "react";
import { Heading } from "react-aria-components";
import { api } from "../lib/api";
import { monthDay } from "../lib/dates";
import { missedWeeks } from "../lib/missed-weeks";

import { copyMessage } from "../lib/copy";
import { mailText, mailtoLink, tooLongForLink } from "../lib/mail";
import { useToasts } from "../lib/toasts";
import { problemLines } from "../lib/problem-lines";
import { parseView, type CoreView, type View } from "../lib/views";
import { useWords } from "../lib/wording";
import { ModalPanel } from "./ModalPanel";
import { Button, ButtonLink } from "../ui/Button";
const VIEW_LABEL: Record<CoreView, string> = {
  today: "nav.home",
  schedule: "schedule.title",
  "work/changed": "nav.changed",
  "work/since": "since.title",
  "work/handled": "nav.handled",
  "work/followups": "nav.followups",
  "work/open": "nav.open",
  "work/stages": "nav.stages",
  "records/projects": "nav.projects",
  "records/people": "nav.people",
  "records/files": "nav.files",
  "records/knowledge": "nav.knowledge",
  "records/rules-review": "rules_review.title",
  settings: "nav.settings",
  "settings/ai-compare": "ai_compare.title",
  setup: "welcome.title",
  handover: "handover.title",
  quality: "quality.open",
  styleguide: "nav.styleguide",
};

/** The name of the screen as the person sees it: the tab's name, a plugin panel's title, or a general name for a record page. */
export function useScreenLabel(view: View): string {
  const { t } = useWords();
  const panels = useQuery({ queryKey: ["panels"], queryFn: () => api.panels() });
  const parsed = parseView(view);
  if (parsed.type === "panel") return panels.data?.find((p) => p.name === parsed.name)?.title ?? parsed.name;
  if (parsed.type === "record") return t("feedback.screen.record");
  return t(VIEW_LABEL[parsed.view]);
}

export function Feedback(props: { onClose: () => void; view: View; version: string; to: string | null | undefined }) {
  const { t } = useWords();
  const { push } = useToasts();
  const base = useId();
  const screen = useScreenLabel(props.view);
  const [message, setMessage] = useState("");
  const [include, setInclude] = useState(true);
  const [withProblems, setWithProblems] = useState(true);
  const [blocked, setBlocked] = useState(false);

  const recent = useQuery({ queryKey: ["feedback-problems"], queryFn: () => api.feedbackProblems(), gcTime: 0 });
  const found = recent.data?.problems ?? [];
  const addProblems = withProblems && found.length > 0;

  // How often "Missed something?" was used, per week across the window the Quality screen counts; when that can't be read, none.
  const quality = useQuery({ queryKey: ["quality"], queryFn: api.quality, retry: false, gcTime: 0 });
  const weeks = missedWeeks(quality.data?.missed);
  const [withMissed, setWithMissed] = useState(true);
  const hasMissed = quality.isSuccess;
  const missedLines = weeks.length === 0 ? [t("feedback.body_missed_none")] : weeks.map((w) => t("feedback.body_missed_week", { from: monthDay(w.week), to: monthDay(w.end), n: w.count }));

  const subject = t("feedback.subject", { app: t("app.name") });
  const body = [
    message.trim(),
    ...(include ? ["", t("feedback.body_version", { version: props.version }), t("feedback.body_screen", { screen })] : []),
    ...(hasMissed && withMissed ? ["", ...missedLines] : []),
    ...(addProblems ? ["", ...problemLines(found, t)] : []),
  ].join("\n");
  const ready = message.trim() !== "";
  const link = ready ? mailtoLink(props.to, subject, body) : null;
  const tooLong = ready && tooLongForLink(props.to, subject, body);
  const noAddress = !props.to?.trim();
  // The mail link is the main action when there is one; otherwise copying is.
  const mailIsMain = !noAddress && !tooLong;

  const copy = async () => {
    if ((await copyMessage(mailText(subject, body))) === "blocked") {
      setBlocked(true);
      return;
    }
    setBlocked(false);
    push({ message: t("feedback.toast.copied") });
  };

  const titleId = `${base}-title`;
  const fieldId = `${base}-message`;
  const hintId = `${base}-hint`;
  const requiredId = `${base}-required`;
  const noteId = `${base}-note`;
  const problemsId = `${base}-problems`;
  const missedId = `${base}-missed`;
  const note = tooLong ? t("feedback.too_long") : noAddress ? t("feedback.no_address") : "";
  return (
    <ModalPanel titleId={titleId} onClose={props.onClose}>
      <Heading slot="title" id={titleId}>
        {t("feedback.title")}
      </Heading>
      <form onSubmit={(e) => e.preventDefault()}>
        <div className="field">
          <label htmlFor={fieldId}>{t("feedback.message")}</label>
          <textarea
            id={fieldId}
            className="short"
            autoFocus
            required
            value={message}
            aria-describedby={ready ? hintId : `${hintId} ${requiredId}`}
            onChange={(e) => {
              setMessage(e.target.value);
              setBlocked(false);
            }}
          />
          <span id={hintId} className="hint">
            {t("feedback.message_hint")}
          </span>
          {!ready && (
            <span id={requiredId} className="hint">
              {t("feedback.required")}
            </span>
          )}
        </div>
        <label className="check-line">
          <input type="checkbox" checked={include} onChange={(e) => setInclude(e.target.checked)} />
          <span>{t("feedback.include")}</span>
        </label>
        {hasMissed && (
          <>
            <label className="check-line">
              <input type="checkbox" checked={withMissed} aria-describedby={missedId} onChange={(e) => setWithMissed(e.target.checked)} />
              <span>{t("feedback.missed")}</span>
            </label>
            <span id={missedId} className="hint">
              {[t("feedback.missed_hint"), ...missedLines].join(" ")}
            </span>
          </>
        )}
        {found.length > 0 && (
          <>
            <label className="check-line">
              <input type="checkbox" checked={withProblems} aria-describedby={problemsId} onChange={(e) => setWithProblems(e.target.checked)} />
              <span>{t("feedback.problems", { count: found.length })}</span>
            </label>
            <span id={problemsId} className="hint">
              {t("feedback.problems_hint")}
            </span>
          </>
        )}
        <fieldset className="details">
          <legend>{t("feedback.preview")}</legend>
          <div className="field">
            <label htmlFor={`${base}-subject`}>{t("feedback.preview_subject")}</label>
            <input id={`${base}-subject`} readOnly value={subject} />
          </div>
          <div className="field">
            <label htmlFor={`${base}-body`}>{t("feedback.preview_body")}</label>
            <textarea id={`${base}-body`} className="short" readOnly rows={Math.min(addProblems ? 14 : 10, body.split("\n").length + 1)} value={body} />
          </div>
        </fieldset>
        {note && (
          <p id={noteId} className="hint" role="status">
            {note}
          </p>
        )}
        {blocked && (
          <p className="problem-note" role="alert">
            {t("feedback.copy_blocked")}
          </p>
        )}
        <div className="row-end">
          <Button variant="quiet" onClick={props.onClose}>
            {t("action.close")}
          </Button>
          <Button variant={mailIsMain ? "secondary" : "primary"} disabled={!ready} onClick={() => void copy()}>
            {t("feedback.copy")}
          </Button>
          {mailIsMain &&
            (link ? (
              <ButtonLink variant="primary" href={link}>
                {t("feedback.mail")}
              </ButtonLink>
            ) : (
              <Button variant="primary" disabled>
                {t("feedback.mail")}
              </Button>
            ))}
        </div>
      </form>
    </ModalPanel>
  );
}
