// The work question of setup (design 7.8): "Just me" or "Me and my work", on its own screen. Choosing work asks what the
// work is called (an employer or a business) and shows the notice about reading work mail. Whether the work is a job or a
// business shows later, in the people's relations and the wording, never as a third choice here.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api, ApiError } from "../lib/api";
import { problemText } from "../lib/problem";
import { useContinue, useHasContinueSlot } from "../lib/walkthrough-continue";
import { useWords } from "../lib/wording";

type Choice = "me" | "work";

/** The work question. In the walkthrough its Continue saves the answer and moves on (`useContinue`); in the setup list it
 * has a button of its own. */
export function WorkStep(props: { onContinue?: () => void; done?: boolean } = {}) {
  const { t } = useWords();
  const client = useQueryClient();
  const hasSlot = useHasContinueSlot();
  const state = useQuery({ queryKey: ["business"], queryFn: api.business });
  const [choiceEdit, setChoiceEdit] = useState<Choice | null>(null);
  const [nameEdit, setNameEdit] = useState<string | null>(null);
  const [problem, setProblem] = useState("");
  const [busy, setBusy] = useState(false);

  const answered = state.data?.chosen ?? null;
  const hasWork = state.data?.business === true;
  const choice: Choice = choiceEdit ?? (answered === "work" ? "work" : "me");
  const name = nameEdit ?? state.data?.name ?? "";
  // Nothing to save when the answer stands: Just me again, or the same work under the same name.
  const changed = choice === "work" ? name.trim() !== "" && name.trim() !== (state.data?.name ?? "") : answered !== "me";
  const missing = choice === "work" && name.trim() === "" ? t("walkthrough.work.why") : "";

  const save = async (): Promise<boolean> => {
    setBusy(true);
    setProblem("");
    try {
      await api.chooseWork(choice === "work" ? { choice, name: name.trim() } : { choice });
      setNameEdit(null);
      setChoiceEdit(null);
      await Promise.all(["business", "setup", "projects"].map((key) => client.invalidateQueries({ queryKey: [key] })));
      if (!hasSlot && props.onContinue && !props.done) props.onContinue();
      return true;
    } catch (err) {
      setProblem(err instanceof ApiError && err.detail ? err.detail : problemText(err, t));
      return false;
    } finally {
      setBusy(false);
    }
  };

  useContinue(hasSlot ? { run: async () => (changed ? save() : true), disabled: !!missing, why: missing } : null);

  if (!state.data) return <p className="empty">{t(state.isError ? "welcome.failed" : "loading")}</p>;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (changed && !missing) void save();
      }}
    >
      <fieldset className="field">
        <legend>{t("walkthrough.work.question")}</legend>
        {(["me", "work"] as const).map((k) => (
          <label key={k} className="choice">
            <input
              type="radio"
              name="work-choice"
              checked={choice === k}
              disabled={k === "me" && hasWork}
              onChange={() => setChoiceEdit(k)}
            />
            {t(`walkthrough.work.choice.${k}`)}
          </label>
        ))}
        {hasWork && <p className="hint">{t("walkthrough.work.stays")}</p>}
      </fieldset>
      {choice === "work" && (
        <>
          <div className="field">
            <label htmlFor="work-name">{t("walkthrough.work.name")}</label>
            <input
              id="work-name"
              type="text"
              value={name}
              autoComplete="organization"
              aria-describedby="work-name-hint"
              onChange={(e) => setNameEdit(e.target.value)}
            />
            <p className="hint" id="work-name-hint">
              {t("walkthrough.work.name_hint")}
            </p>
          </div>
          <p className="notice" role="note" data-notice="work-mail">
            {t("walkthrough.work.mail_notice")}
          </p>
        </>
      )}
      {problem && (
        <p className="problem-note" role="alert">
          {problem}
        </p>
      )}
      {!hasSlot && (
        <div className="row-end">
          <button type="submit" className={props.done ? "btn" : "btn primary"} disabled={busy || !changed || !!missing}>
            {t(props.onContinue && !props.done ? "welcome.workspace.save_continue" : "welcome.workspace.save")}
          </button>
        </div>
      )}
    </form>
  );
}
