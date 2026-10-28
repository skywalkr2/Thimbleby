// The setup steps (design 7.8) as sections: one per step, in the order the server gives, each saying in words whether it
// is done or skipped, with its own controls and a way to skip it or come back to it. The core's steps have fixed controls;
// a plugin's step shows its own words and starts its action. The walkthrough shows the steps it has no screen of its own
// for (the optional extras and an add-on's own steps) through this list, and uses the pieces that are exported here.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { api, ApiError, type S } from "../lib/api";
import { useAct } from "../lib/act";
import { useDraftState, useRestored } from "../lib/draft";
import { problemText } from "../lib/problem";
import { useSignInWindow } from "../lib/sign-in-window";
import { useContinue, useHasContinueSlot } from "../lib/walkthrough-continue";
import { addonLabel, formatValue, labelOf } from "../lib/settings";
import { freshSettings, useAfterSave } from "../lib/settings-save";
import { useWords } from "../lib/wording";
import { useActionReview } from "./ActionReview";
import { emptyReason } from "./Addons";
import { PackTiers } from "./PackTiers";
import { SignInRow } from "./SignIns";
import { WelcomeAi } from "./WelcomeAi";
import { TemplateList } from "./Templates";
import { TimeZoneSelect } from "./TimeZoneSelect";
import { RenameName } from "./RenameName";
import { WelcomeBackup } from "./WelcomeBackup";
import { WorkStep } from "./WalkthroughWork";
import { Skeleton } from "../ui/Skeleton";
import { Icon } from "../ui/Icon";
import { Pill } from "../ui/Pill";

type Step = S["SetupStepView"];

/** The id of a step's section, so Today can open the guide at one step. */
export const stepSlug = (id: string) => `guide-${id.replace(/[^a-z0-9]+/gi, "-")}`;

export interface FocusStep {
  id: string;
  n: number;
}

export function StepList(props: {
  /** Which steps to list; all of them when left out. */
  include?: (step: Step) => boolean;
  focusStep?: FocusStep | null;
  onOpenPeople: () => void;
  onOpenAddons: () => void;
  onHandIn: () => void;
  onChooseSource: (plugin: string | null) => void;
}) {
  const { t, has } = useWords();
  const setup = useQuery({ queryKey: ["setup"], queryFn: api.setup });
  const { start, review } = useActionReview();
  const focused = useRef<number | null>(null);
  const loaded = !!setup.data;

  // Opening the list at a step scrolls to it and puts focus on its heading.
  useEffect(() => {
    const want = props.focusStep;
    if (!want || !loaded || focused.current === want.n) return;
    const heading = document.getElementById(`${stepSlug(want.id)}-title`);
    if (!heading) return;
    focused.current = want.n;
    heading.scrollIntoView?.({ block: "start" });
    heading.focus();
  }, [props.focusStep, loaded]);

  if (setup.isPending) return <Skeleton />;
  if (setup.isError) return <p className="empty">{t("welcome.failed")}</p>;
  // A step with nothing for the person to do (no add-on installed to turn on) isn't offered, so it never reads as done.
  const shown = setup.data.steps.filter((step) => step.applies !== false && (!props.include || props.include(step)));
  return (
    <>
      <ol className="guide">
        {shown.map((step) => {
          // A sign-in's step is worded by the list from the service's label; its explanation lists what is asked.
          // A step the core adds for an add-on (its kinds of files, its own models) is worded by the list, with the add-on's name.
          const addon = step.plugin ? addonLabel(step.plugin, t, has) : "";
          const label = step.sign_in
            ? t("welcome.sign_in.title", { label: step.label || step.sign_in })
            : step.kind
              ? t(`setup_step.kind.${step.kind}`, { addon })
              : step.label || (has(`setup_step.${step.id}`) ? t(`setup_step.${step.id}`) : step.id);
          const why = step.sign_in
            ? step.explanation
              ? t("welcome.sign_in.explanation", { allows: step.explanation })
              : ""
            : step.kind
              ? t(`setup_step.kind.${step.kind}.explanation`, { addon })
              : step.explanation || (has(`setup_step.${step.id}.explanation`) ? t(`setup_step.${step.id}.explanation`) : "");
          return (
            <StepSection key={step.id} step={step} label={label} explanation={why}>
              {step.sign_in ? (
                <SignInStep name={step.sign_in} label={step.label || step.sign_in} done={step.done} onChooseSource={props.onChooseSource} />
              ) : step.id === "workspace" ? (
                <WorkspaceStep />
              ) : step.id === "work" ? (
                <WorkStep />
              ) : step.id === "template" ? (
                <TemplateList />
              ) : step.id === "ai" ? (
                <WelcomeAi local={setup.data.local} done={step.done} />
              ) : step.id === "backup" ? (
                <WelcomeBackup local={setup.data.local} />
              ) : step.id === "people" ? (
                <div className="row-end">
                  <button type="button" className="btn" onClick={props.onOpenPeople}>
                    {t("welcome.people.open")}
                  </button>
                </div>
              ) : step.id === "addons" ? (
                <AddonsStep onOpen={props.onOpenAddons} />
              ) : step.kind === "tiers" && step.plugin ? (
                <PackTiers level={4} plugin={step.plugin} />
              ) : step.id === "first_note" ? (
                <div className="row-end">
                  <button type="button" className="btn" onClick={props.onHandIn}>
                    {t("handin.open")}
                  </button>
                </div>
              ) : (
                <>
                  {hasSettings(step) && <SuggestedSettings step={step} />}
                  {step.action && (
                    <div className="row-end">
                      <button
                        type="button"
                        className="btn"
                        onClick={() => start({ name: step.action!, label, on: null }, null)}
                      >
                        {label}
                      </button>
                    </div>
                  )}
                </>
              )}
            </StepSection>
          );
        })}
      </ol>
      {review}
    </>
  );
}

/** A sign-in's step: one button that starts the sign-in, as the Sign-ins row does. Once signed in, the row itself, with
 * the actions it has there (choose what to read, sign out, sign in again). */
function SignInStep(props: { name: string; label: string; done: boolean; onChooseSource: (plugin: string | null) => void }) {
  const { t } = useWords();
  const { start, busy, problem } = useSignInWindow(props.name);
  const signIns = useQuery({ queryKey: ["sign-ins"], queryFn: api.signIns, enabled: props.done });
  if (props.done) {
    const row = signIns.data?.find((item) => item.name === props.name);
    return row ? (
      <ul className="queue">
        <SignInRow item={row} onChooseSource={props.onChooseSource} />
      </ul>
    ) : null;
  }
  return (
    <>
      {problem && (
        <p className="problem-note" role="alert">
          {problem}
        </p>
      )}
      <div className="row-end">
        <button
          type="button"
          className="btn"
          disabled={busy}
          aria-label={t("sign_in.sign_in_named", { label: props.label })}
          onClick={() => void start()}
        >
          {busy ? t("sign_in.working") : t("sign_in.sign_in")}
        </button>
      </div>
    </>
  );
}

/** The add-ons installed here and turned off, by name, with one button that opens the Add-ons screen. */
function AddonsStep(props: { onOpen: () => void }) {
  const { t, has } = useWords();
  const act = useAct();
  const [busy, setBusy] = useState(false);
  const leaveOff = async () => {
    setBusy(true);
    await act(
      () => api.leaveAddonsOff(),
      () => ({ message: t("welcome.addons.left_off_toast") }),
    );
    setBusy(false);
  };
  const packs = useQuery({ queryKey: ["packs"], queryFn: api.packs });
  const off = (packs.data?.installed ?? []).filter((p) => !p.enabled);
  const why = packs.data && packs.data.installed.length === 0 ? emptyReason(packs.data, t) : null;
  return (
    <>
      {why && (
        <p className="hint" data-no-addons="">
          {why}
        </p>
      )}
      {off.length > 0 && (
        <div className="field">
          <span className="what" id="guide-addons-off">
            {t("welcome.addons.off_title")}
          </span>
          <ul className="plain-list" aria-labelledby="guide-addons-off">
            {off.map((p) => (
              <li key={p.name}>{addonLabel(p.name, t, has)}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="row-end">
        {off.length > 0 && (
          <button type="button" className="btn" disabled={busy} onClick={() => void leaveOff()}>
            {t("welcome.addons.leave_off")}
          </button>
        )}
        <button type="button" className="btn" onClick={props.onOpen}>
          {t("welcome.addons.open")}
        </button>
      </div>
    </>
  );
}

const hasSettings = (step: Step) => Object.keys(step.settings ?? {}).length > 0 || Object.keys(step.adds ?? {}).length > 0;

/** The settings a step suggests, in words, with one button that applies them all and reads the result back. */
function SuggestedSettings(props: { step: Step }) {
  const { t, has } = useWords();
  const client = useQueryClient();
  const afterSave = useAfterSave();
  const settings = useQuery({ queryKey: ["settings"], queryFn: api.settings });
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
  const { step } = props;
  const label = (key: string) => {
    const item = settings.data?.items.find((i) => i.key === key);
    return item ? labelOf(item, t, has) : has(`settings.key.${key}`) ? t(`settings.key.${key}`) : key;
  };

  const apply = async () => {
    setBusy(true);
    setProblem("");
    try {
      // The fingerprint of the settings as they are now, so a change made meanwhile is noticed rather than overwritten.
      const current = await freshSettings(client);
      const saved = await api.applyStepSettings(step.id, current.fingerprint);
      await afterSave(saved);
    } catch (err) {
      setProblem(problemText(err, t));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="field">
      <span className="what" id={`${stepSlug(step.id)}-settings`}>
        {t(Object.keys(step.settings ?? {}).length > 0 ? "welcome.settings.title" : "welcome.settings.adds_title")}
      </span>
      <ul className="plain-list" aria-labelledby={`${stepSlug(step.id)}-settings`}>
        {Object.entries(step.settings ?? {}).map(([key, value]) => (
          <li key={key}>{t("welcome.settings.line", { label: label(key), value: formatValue(value, t) })}</li>
        ))}
        {Object.entries(step.adds ?? {}).map(([key, values]) => (
          <li key={`adds-${key}`}>{t("welcome.settings.adds_line", { label: label(key), values: values.map((v) => String(v)).join(", ") })}</li>
        ))}
      </ul>
      {problem && (
        <p className="problem-note" role="alert">
          {problem}
        </p>
      )}
      <div className="row-end">
        <button type="button" className="btn" disabled={busy} onClick={() => void apply()}>
          {t("welcome.settings.apply")}
        </button>
      </div>
    </div>
  );
}

function StepSection(props: { step: Step; label: string; explanation: string; children: ReactNode }) {
  const { t, has } = useWords();
  const act = useAct();
  const { step, label } = props;
  const slug = stepSlug(step.id);
  const state = step.done ? "done" : step.skipped ? "skipped" : "todo";
  const skipWords = has(`welcome.skip.${step.id}`) ? t(`welcome.skip.${step.id}`) : t("welcome.skip");
  const toggle = () =>
    step.skipped
      ? void act(
          () => api.reopenStep(step.id),
          () => ({ message: t("welcome.reopened", { label }), undo: () => api.skipStep(step.id) }),
        )
      : void act(
          () => api.skipStep(step.id),
          () => ({ message: t("welcome.skipped_toast", { label }), undo: () => api.reopenStep(step.id) }),
        );
  return (
    <li id={slug} className="panel guide-step" data-step={step.id} data-state={state} aria-labelledby={`${slug}-title`}>
      <div className="heading">
        <h3 id={`${slug}-title`} tabIndex={-1}>
          {label}
        </h3>
        <Pill tone={state === "done" ? "ok" : state === "skipped" ? "neutral" : "need"}>
          <Icon name={state === "done" ? "check" : state === "skipped" ? "minus" : "circle"} size={14} />{" "}
          {t(state === "done" ? "start.done" : state === "skipped" ? "welcome.state_skipped" : "start.not_done")}
        </Pill>
      </div>
      {props.explanation && <p className="hint">{props.explanation}</p>}
      {props.children}
      {!step.done && (
        <div className="row-end">
          <button
            type="button"
            className="btn quiet"
            aria-label={t(step.skipped ? "welcome.reopen_named" : "welcome.skip_named", { label, skip: skipWords })}
            onClick={toggle}
          >
            {step.skipped ? t("welcome.reopen") : skipWords}
          </button>
        </div>
      )}
    </li>
  );
}

// ---- workspace -----------------------------------------------------------------------------------------------------

const TIMEZONE = "workspace.user.timezone";

function browserZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  } catch {
    return "";
  }
}

/** The person's name and time zone, in one form, and under it the assistant's name with Rename. Saving the person's name
 * also names the app after them while it still has its default name. In the walkthrough, saving a step that was not done yet is also the way on (`onContinue`), so
 * the screen has one primary button; the setup list has none. */
export function WorkspaceStep(props: { onContinue?: () => void; done?: boolean } = {}) {
  const { t } = useWords();
  const settings = useQuery({ queryKey: ["settings"], queryFn: api.settings });
  // The person's name lives on their person record only; the settings hold the time zone.
  const me = useQuery({ queryKey: ["me"], queryFn: api.me });
  if (!settings.data || !me.data) {
    return settings.isError || me.isError ? <p className="empty">{t("welcome.failed")}</p> : <Skeleton rows={2} />;
  }
  return <WorkspaceForm {...props} settings={settings.data} me={me.data} />;
}

function WorkspaceForm(props: { onContinue?: () => void; done?: boolean; settings: S["SettingsView"]; me: S["MeView"] }) {
  const { t } = useWords();
  const client = useQueryClient();
  const afterSave = useAfterSave();
  const hasSlot = useHasContinueSlot();
  const settings = { data: props.settings };
  const me = { data: props.me };
  // What is typed stays as a draft in this tab until it is saved, so a reload brings it back.
  const [zoneEdit, setZoneEdit] = useDraftState<string | null>("you", "zone", null);
  const [nameEdit, setNameEdit] = useDraftState<string | null>("you", "name", null);
  const restoredDraft = useRestored("you");
  const [problem, setProblem] = useState("");
  const [busy, setBusy] = useState(false);
  const fullName = nameEdit ?? me.data.full_name;
  const nameChanged = fullName.trim() !== me.data.full_name;

  const item = settings.data.items.find((i) => i.key === TIMEZONE);
  const stored = item?.value == null ? "" : String(item.value);
  // A value still equal to its built-in default counts as not chosen, whether or not the workspace's files hold it (a new
  // workspace's files hold every default): the time zone is offered from this computer.
  const unchosen = item != null && item.source !== "env" && item.source !== "flag" && item.value === item.default;
  const zone = zoneEdit ?? (unchosen ? browserZone() || stored : stored);
  const off = !item || item.locked || !item.editable;
  const zoneChanged = !off && zone.trim() !== "" && zone.trim() !== stored;
  const empty = nameChanged && !fullName.trim();
  const pending = nameChanged || zoneChanged;

  /** Saves the name and the time zone when they changed. True when it all went through. */
  const save = async (): Promise<boolean> => {
    setBusy(true);
    setProblem("");
    try {
      if (nameChanged) {
        // The first word of the name, for the name the app takes while it has only its default.
        const first = fullName.trim().split(/\s+/)[0] ?? "";
        await api.saveMe(fullName.trim(), t("walkthrough.name.default", { name: first }));
        setNameEdit(null);
        await client.invalidateQueries({ queryKey: ["me"] });
        await client.invalidateQueries({ queryKey: ["people"] });
        await client.invalidateQueries({ queryKey: ["runtime-config"] });
        await client.invalidateQueries({ queryKey: ["settings"] });
      }
      if (zoneChanged) {
        const fresh = nameChanged ? await api.settings() : settings.data!;
        const saved = await api.saveSettings({ changes: { [TIMEZONE]: zone.trim() }, reset: [], fingerprint: fresh.fingerprint, by_setup: true });
        setZoneEdit(null);
        await afterSave(saved);
      } else {
        await client.invalidateQueries({ queryKey: ["setup"] });
      }
      if (!hasSlot && props.onContinue && !props.done) props.onContinue();
      return true;
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) void client.invalidateQueries({ queryKey: ["settings"] });
      setProblem(err instanceof ApiError && err.detail ? err.detail : problemText(err, t));
      return false;
    } finally {
      setBusy(false);
    }
  };

  // Inside the walkthrough the screen's one Continue saves this form (when it has something to save) and moves on.
  const missing = !props.done && (empty || !pending) ? t(empty ? "welcome.workspace.why_blank" : "welcome.workspace.why") : "";
  useContinue(hasSlot ? { run: async () => (pending ? save() : true), disabled: !!missing, why: missing } : null);

  const zoneId = "workspace-workspace-user-timezone";
  return (
    <>
    {restoredDraft && (
      <p className="hint" role="status" data-draft-restored="">
        {t("draft.restored")}
      </p>
    )}
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (pending && !empty) void save();
      }}
    >
      <div className="field">
        <label htmlFor="workspace-full-name">{t("welcome.workspace.full_name")}</label>
        <input
          id="workspace-full-name"
          type="text"
          value={fullName}
          autoComplete="name"
          aria-describedby="workspace-full-name-hint"
          onChange={(e) => setNameEdit(e.target.value)}
        />
        <p className="hint" id="workspace-full-name-hint">
          {t("welcome.workspace.full_name_hint")}
        </p>
      </div>
      <div className="field">
        <label htmlFor={zoneId}>{t("welcome.workspace.timezone")}</label>
        {item?.type === "choice" && item.options?.length ? (
          // A time zone is picked by its city, with a search.
          <TimeZoneSelect
            id={zoneId}
            value={zone}
            options={item.options ?? []}
            disabled={off}
            describedBy={`${zoneId}-hint`}
            onChange={(next) => setZoneEdit(next)}
          />
        ) : (
          <input
            id={zoneId}
            type="text"
            value={zone}
            disabled={off}
            autoComplete="off"
            aria-describedby={`${zoneId}-hint`}
            onChange={(e) => setZoneEdit(e.target.value)}
          />
        )}
        <p className="hint" id={`${zoneId}-hint`}>
          {t("welcome.workspace.timezone_hint")}
        </p>
        {item?.locked && <p className="hint">{t(item.source === "env" ? "settings.locked_env" : "settings.locked_flag")}</p>}
      </div>
      {problem && (
        <p className="problem-note" role="alert">
          {problem}
        </p>
      )}
      {!hasSlot && (
        <div className="row-end">
          <button type="submit" className={props.done ? "btn" : "btn primary"} disabled={busy || empty || !pending}>
            {t(props.onContinue && !props.done ? "welcome.workspace.save_continue" : "welcome.workspace.save")}
          </button>
        </div>
      )}
    </form>
    <RenameName
      settingKey="workspace.assistant_name"
      sentence={(name) => t("walkthrough.assistant.called", { name })}
      label={t("walkthrough.assistant.label")}
      rename={t("walkthrough.assistant.rename")}
      save={t("walkthrough.assistant.save")}
      cancel={t("walkthrough.assistant.cancel")}
      blank={t("walkthrough.assistant.blank")}
    />
    </>
  );
}
