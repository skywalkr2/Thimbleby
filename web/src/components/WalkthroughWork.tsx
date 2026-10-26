// The work question of setup (design 7.8): "Just me", or, under "Also track", two tick boxes: My job and My own business,
// either or both. A job asks the employer's name and shows the notice about reading work mail; a business asks its name and
// what it works on (jobs, clients or orders, typed or pasted, each becoming a project inside it), and "Add another business"
// repeats that. Each is a side of the person's work (design 6.32). Sides already saved are listed with their projects, each
// with Rename (an edit of its project, never a second add) and, until setup is finished and while nothing is filed under it,
// Remove. It stays one counted step.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { api, ApiError, type S } from "../lib/api";
import { problemText } from "../lib/problem";
import { useToasts } from "../lib/toasts";
import { useContinue, useHasContinueSlot } from "../lib/walkthrough-continue";
import { useWords } from "../lib/wording";
import { workLines } from "../lib/work-lines";

type Side = S["SideView"];
type Draft = { key: number; name: string; lines: string };

/** The work question. In the walkthrough its Continue saves the answer and moves on (`useContinue`); in the setup list it
 * has a button of its own. */
export function WorkStep(props: { onContinue?: () => void; done?: boolean } = {}) {
  const { t } = useWords();
  const client = useQueryClient();
  const hasSlot = useHasContinueSlot();
  const state = useQuery({ queryKey: ["business"], queryFn: api.business });
  const projects = useQuery({ queryKey: ["projects"], queryFn: api.projects });
  const [jobOn, setJobOn] = useState<boolean | null>(null);
  const [businessOn, setBusinessOn] = useState<boolean | null>(null);
  const [jobName, setJobName] = useState("");
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [more, setMore] = useState<Record<string, string>>({});
  const [problem, setProblem] = useState("");
  const [busy, setBusy] = useState(false);
  const counter = useRef(0);
  const blank = (): Draft => ({ key: ++counter.current, name: "", lines: "" });

  const answered = state.data?.chosen ?? null;
  const saved: Side[] = state.data?.sides ?? [];
  const savedJobs = saved.filter((s) => s.kind === "job");
  const savedBusinesses = saved.filter((s) => s.kind === "business");
  // A side that is saved keeps its box ticked: it stays until it is taken back out.
  const jobTicked = savedJobs.length > 0 || (jobOn ?? false);
  const businessTicked = savedBusinesses.length > 0 || (businessOn ?? false);
  const alone = !jobTicked && !businessTicked;
  const needJobName = jobTicked && savedJobs.length === 0;
  const named = drafts.filter((d) => d.name.trim() !== "");
  const unnamedWithLines = drafts.some((d) => d.name.trim() === "" && workLines(d.lines).length > 0);
  const needBusinessName = businessTicked && savedBusinesses.length === 0 && named.length === 0;

  const hasNew =
    (needJobName && jobName.trim() !== "") ||
    (businessTicked && (named.length > 0 || savedBusinesses.some((s) => workLines(more[s.project] ?? "").length > 0)));
  // Nothing to save when the answer stands: Just me again, or nothing new under the sides there already are.
  const changed = alone ? saved.length === 0 && answered !== "me" : hasNew;
  const missing =
    (needJobName && jobName.trim() === "") || needBusinessName || (businessTicked && unnamedWithLines) ? t("walkthrough.work.why") : "";

  const refresh = () =>
    Promise.all(["business", "setup", "projects"].map((key) => client.invalidateQueries({ queryKey: [key] })));
  const sayProblem = (err: unknown) =>
    setProblem(err instanceof ApiError && err.detail ? err.detail : problemText(err, t));

  /** The lines become projects inside the side, each by the project route; one the side already holds is left alone. */
  const addLines = async (side: string, text: string) => {
    const held = new Set((projects.data ?? []).filter((p) => p.parent === side).map((p) => p.name.toLowerCase()));
    for (const name of workLines(text)) {
      if (!held.has(name.toLowerCase())) await api.addProject({ name, parent: side });
    }
  };

  const save = async (): Promise<boolean> => {
    setBusy(true);
    setProblem("");
    try {
      if (alone) {
        await api.chooseWork({ choice: "me" });
      } else {
        if (needJobName && jobName.trim()) {
          await api.addSide({ name: jobName.trim(), kind: "job" });
          setJobName("");
        }
        if (businessTicked) {
          for (const draft of named) {
            const made = await api.addSide({ name: draft.name.trim(), kind: "business" });
            await addLines(made.project, draft.lines);
            setDrafts((all) => all.filter((d) => d.key !== draft.key));
          }
          for (const side of savedBusinesses) {
            const text = more[side.project] ?? "";
            if (workLines(text).length === 0) continue;
            await addLines(side.project, text);
            setMore((all) => ({ ...all, [side.project]: "" }));
          }
        }
      }
      await refresh();
      if (!hasSlot && props.onContinue && !props.done) props.onContinue();
      return true;
    } catch (err) {
      sayProblem(err);
      await refresh();
      return false;
    } finally {
      setBusy(false);
    }
  };

  useContinue(hasSlot ? { run: async () => (changed ? save() : true), disabled: !!missing, why: missing } : null);

  if (!state.data) return <p className="empty">{t(state.isError ? "welcome.failed" : "loading")}</p>;

  const chooseJustMe = () => {
    setJobOn(false);
    setBusinessOn(false);
  };
  const toggleBusiness = (on: boolean) => {
    setBusinessOn(on);
    if (on && drafts.length === 0 && savedBusinesses.length === 0) setDrafts([blank()]);
  };
  const draftName = (key: number, name: string) => setDrafts((all) => all.map((d) => (d.key === key ? { ...d, name } : d)));
  const draftLines = (key: number, lines: string) => setDrafts((all) => all.map((d) => (d.key === key ? { ...d, lines } : d)));
  const rows = savedBusinesses.length + drafts.length;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (changed && !missing) void save();
      }}
    >
      <fieldset className="field">
        <legend>{t("walkthrough.work.question")}</legend>
        <label className="choice">
          <input
            type="radio"
            name="work-choice"
            checked={alone}
            disabled={saved.length > 0}
            onChange={chooseJustMe}
          />
          {t("walkthrough.work.choice.me")}
        </label>
        <fieldset className="field" data-also="">
          <legend>{t("walkthrough.work.also")}</legend>
          <label className="check-line">
            <input
              type="checkbox"
              checked={jobTicked}
              disabled={savedJobs.length > 0}
              onChange={(e) => setJobOn(e.target.checked)}
            />
            <span>{t("walkthrough.work.choice.job")}</span>
          </label>
          <label className="check-line">
            <input
              type="checkbox"
              checked={businessTicked}
              disabled={savedBusinesses.length > 0}
              onChange={(e) => toggleBusiness(e.target.checked)}
            />
            <span>{t("walkthrough.work.choice.business")}</span>
          </label>
        </fieldset>
        {saved.length > 0 && <p className="hint">{t("walkthrough.work.stays")}</p>}
      </fieldset>

      {saved.length > 0 && (
        <section aria-labelledby="work-added" data-added="">
          <h3 id="work-added">{t("walkthrough.work.added")}</h3>
          <ul className="queue">
            {saved.map((side, position) => (
              <SavedSide
                key={side.project}
                side={side}
                position={position}
                inside={(projects.data ?? []).filter((p) => p.parent === side.project).map((p) => p.name)}
                onChanged={refresh}
                onProblem={sayProblem}
                onClear={() => setProblem("")}
              />
            ))}
          </ul>
        </section>
      )}

      {needJobName && (
        <div className="field" data-job="">
          <label htmlFor="work-job-name">{t("walkthrough.work.job_name")}</label>
          <input
            id="work-job-name"
            type="text"
            value={jobName}
            autoComplete="organization"
            aria-describedby="work-job-name-hint"
            onChange={(e) => setJobName(e.target.value)}
          />
          <p className="hint" id="work-job-name-hint">
            {t("walkthrough.work.job_name_hint")}
          </p>
        </div>
      )}
      {jobTicked && (
        <p className="notice" role="note" data-notice="work-mail">
          {t("walkthrough.work.mail_notice")}
        </p>
      )}

      {businessTicked &&
        savedBusinesses.map((side) => (
          <div className="field" key={side.project} data-more-for={side.project}>
            <label htmlFor={`work-more-${side.project}`}>{t("walkthrough.work.more_works_on", { name: side.name })}</label>
            <textarea
              id={`work-more-${side.project}`}
              rows={3}
              value={more[side.project] ?? ""}
              aria-describedby={`work-more-${side.project}-hint`}
              onChange={(e) => setMore((all) => ({ ...all, [side.project]: e.target.value }))}
            />
            <p className="hint" id={`work-more-${side.project}-hint`}>
              {t("walkthrough.work.works_on_hint", { name: side.name })}
            </p>
          </div>
        ))}

      {businessTicked &&
        drafts.map((draft) => {
          const id = `work-business-${draft.key}`;
          const label = draft.name.trim();
          return (
            <section key={draft.key} className="field" data-business-draft="">
              <div className="field">
                <label htmlFor={`${id}-name`}>{t("walkthrough.work.business_name")}</label>
                <input
                  id={`${id}-name`}
                  type="text"
                  value={draft.name}
                  autoComplete="organization"
                  aria-describedby={`${id}-name-hint`}
                  onChange={(e) => draftName(draft.key, e.target.value)}
                />
                <p className="hint" id={`${id}-name-hint`}>
                  {t("walkthrough.work.business_name_hint")}
                </p>
              </div>
              <div className="field">
                <label htmlFor={`${id}-works-on`}>
                  {label ? t("walkthrough.work.works_on", { name: label }) : t("walkthrough.work.works_on_unnamed")}
                </label>
                <textarea
                  id={`${id}-works-on`}
                  rows={4}
                  value={draft.lines}
                  aria-describedby={`${id}-works-on-hint`}
                  onChange={(e) => draftLines(draft.key, e.target.value)}
                />
                <p className="hint" id={`${id}-works-on-hint`}>
                  {label
                    ? t("walkthrough.work.works_on_hint", { name: label })
                    : t("walkthrough.work.works_on_hint_unnamed")}
                </p>
              </div>
              {rows > 1 && (
                <div className="row-end">
                  <button
                    type="button"
                    className="btn quiet small"
                    aria-label={label ? t("walkthrough.work.discard_named", { name: label }) : t("walkthrough.work.discard_unnamed")}
                    onClick={() => setDrafts((all) => all.filter((d) => d.key !== draft.key))}
                  >
                    {t("walkthrough.work.discard")}
                  </button>
                </div>
              )}
            </section>
          );
        })}
      {businessTicked && (
        <div className="row-end">
          <button type="button" className="btn" onClick={() => setDrafts((all) => [...all, blank()])}>
            {t("walkthrough.work.add_business")}
          </button>
        </div>
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

/** A side already saved: its name and kind, what is inside it, Rename (an edit of its project) and, while setup is open and
 * nothing is filed under it, Remove. */
function SavedSide(props: {
  side: Side;
  position: number;
  inside: string[];
  onChanged: () => Promise<unknown>;
  onProblem: (err: unknown) => void;
  onClear: () => void;
}) {
  const { t } = useWords();
  const { side } = props;
  const { push } = useToasts();
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(side.name);
  const [busy, setBusy] = useState(false);
  const base = `work-side-${side.project}`;

  const rename = async () => {
    const next = name.trim();
    if (!next || next === side.name) {
      setRenaming(false);
      return;
    }
    setBusy(true);
    props.onClear();
    try {
      await api.editProject(side.project, { name: next });
      setRenaming(false);
      await props.onChanged();
    } catch (err) {
      props.onProblem(err);
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => {
    setBusy(true);
    props.onClear();
    try {
      await api.removeSide(side.project);
      await props.onChanged();
      // Taking a side back out acts at once; Undo brings it back with its projects, its kind and its place.
      push({
        message: t("walkthrough.work.removed", { name: side.name }),
        undo: async () => {
          await api.restoreSide(side.project, { kind: side.kind, position: props.position });
          await props.onChanged();
        },
      });
    } catch (err) {
      props.onProblem(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="line" data-side={side.project} data-kind={side.kind} aria-labelledby={`${base}-name`}>
      <div className="row pair">
        <div className="text">
          {renaming ? (
            <div className="field">
              <label htmlFor={`${base}-rename`}>{t("walkthrough.work.rename_label", { name: side.name })}</label>
              <input
                id={`${base}-rename`}
                type="text"
                value={name}
                autoFocus
                autoComplete="organization"
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void rename();
                  } else if (e.key === "Escape") {
                    setName(side.name);
                    setRenaming(false);
                  }
                }}
              />
            </div>
          ) : (
            <strong id={`${base}-name`}>{side.name}</strong>
          )}
          <span className="sub">{t(`walkthrough.work.kind.${side.kind}`)}</span>
          <span className="sub">
            {props.inside.length > 0
              ? t("walkthrough.work.projects", { names: props.inside.join(", ") })
              : t("walkthrough.work.no_projects")}
          </span>
        </div>
        <div className="acts">
          {renaming ? (
            <>
              <button type="button" className="btn primary small" disabled={busy || !name.trim()} onClick={() => void rename()}>
                {t("walkthrough.work.rename_save")}
              </button>
              <button
                type="button"
                className="btn small"
                onClick={() => {
                  setName(side.name);
                  setRenaming(false);
                }}
              >
                {t("walkthrough.work.rename_cancel")}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="btn small"
                aria-label={t("walkthrough.work.rename_named", { name: side.name })}
                onClick={() => {
                  setName(side.name);
                  setRenaming(true);
                }}
              >
                {t("walkthrough.work.rename")}
              </button>
              {side.removable && (
                <button
                  type="button"
                  className="btn quiet small"
                  disabled={busy}
                  aria-label={t("walkthrough.work.remove_named", { name: side.name })}
                  onClick={() => void remove()}
                >
                  {t("walkthrough.work.remove")}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </li>
  );
}
