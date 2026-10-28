// The question of setup that asks what it is for (design 7.8): "Your own life is always included. Also keep track of:", then
// two tick boxes, A job and My own business, either or both, or neither for the person's own life alone, in one plain
// control with no frame. A job asks the employer's name and shows the notice about reading work mail; a business asks its
// name, what it is (one or two sentences, kept as the side's description, never a project) and which projects it has (one to
// a line, typed or pasted, each becoming a project inside it; either box may be left empty), then one
// optional, closed line, "Do some of these belong together?": a group name, and once it is named each job gets a tick box
// "in <group>". The group is a project inside the business and the ticked jobs are inside it; a group named with nothing
// ticked holds Continue back and says so, so a typed name is never lost without a word. "Add another business" repeats it.
// Each is a side of the person's work (design 6.32). Sides already saved are listed with their projects and groups, each
// with Rename (an edit of its project, never a second add) and Remove: in setup, while nothing is filed under it; on the
// business page of Settings always, asking each time whether its projects and to-dos move to Personal or end with it. It
// stays one counted step.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { api, ApiError, type S } from "../lib/api";
import { clearDrafts, useDraftState, useRestored } from "../lib/draft";
import { problemText } from "../lib/problem";
import { useToasts } from "../lib/toasts";
import { useContinue, useHasContinueSlot } from "../lib/walkthrough-continue";
import { useWords } from "../lib/wording";
import { insideLines, sideSummary, workLines } from "../lib/work-lines";
import { Skeleton } from "../ui/Skeleton";
import { Button } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";
type Side = S["SideView"];
/** A group of what a business works on: its name and which of the typed lines are in it. */
type Group = { name: string; picked: string[] };
type Draft = { key: number; name: string; about: string; lines: string; group: Group };
const noGroup = (): Group => ({ name: "", picked: [] });

/** The work question. In the walkthrough its Continue saves the answer and moves on (`useContinue`); in the setup list it
 * has a button of its own. */
export function WorkStep(props: { onContinue?: () => void; done?: boolean } = {}) {
  const { t } = useWords();
  const client = useQueryClient();
  const hasSlot = useHasContinueSlot();
  const state = useQuery({ queryKey: ["business"], queryFn: api.business });
  const projects = useQuery({ queryKey: ["projects"], queryFn: api.projects });
  // What is typed here is kept as a draft in this tab until it is saved, so a reload brings it back.
  const [jobOn, setJobOn] = useDraftState<boolean | null>("work", "job-on", null);
  const [businessOn, setBusinessOn] = useDraftState<boolean | null>("work", "business-on", null);
  const [jobName, setJobName] = useDraftState("work", "job-name", "");
  const [drafts, setDrafts] = useDraftState<Draft[]>("work", "businesses", []);
  const [more, setMore] = useDraftState<Record<string, string>>("work", "more", {});
  // What a saved business is, once the person has changed it; untouched, the box shows what is saved.
  const [moreAbout, setMoreAbout] = useDraftState<Record<string, string>>("work", "more-about", {});
  const [moreGroup, setMoreGroup] = useDraftState<Record<string, Group>>("work", "more-group", {});
  const restoredDraft = useRestored("work");
  const [problem, setProblem] = useState("");
  const [busy, setBusy] = useState(false);
  const counter = useRef(drafts.reduce((most, d) => Math.max(most, d.key), 0));
  const blank = (): Draft => ({ key: ++counter.current, name: "", about: "", lines: "", group: noGroup() });

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
  const unnamedWithLines = drafts.some((d) => d.name.trim() === "" && (workLines(d.lines).length > 0 || sideSummary(d.about) !== ""));
  const aboutChanged = (s: Side) => s.project in moreAbout && sideSummary(moreAbout[s.project]) !== (s.summary ?? "");
  const needBusinessName = businessTicked && savedBusinesses.length === 0 && named.length === 0;

  const hasNew =
    (needJobName && jobName.trim() !== "") ||
    (businessTicked && (named.length > 0 || savedBusinesses.some((s) => workLines(more[s.project] ?? "").length > 0 || aboutChanged(s))));
  // Nothing to save when the answer stands: Just me again, or nothing new under the sides there already are.
  const changed = alone ? saved.length === 0 && answered !== "me" : hasNew;
  // A group named with none of its jobs ticked would make nothing: Continue waits until one is ticked or the name is cleared.
  const emptyGroup = businessTicked
    ? [
        ...drafts.map((d) => ({ group: d.group, lines: workLines(d.lines) })),
        ...savedBusinesses.map((s) => ({ group: moreGroup[s.project] ?? noGroup(), lines: workLines(more[s.project] ?? "") })),
      ].find((x) => groupNeedsTick(x.group, x.lines))
    : undefined;
  const missing =
    needJobName && jobName.trim() === ""
      ? t("walkthrough.work.why_job")
      : needBusinessName || (businessTicked && unnamedWithLines)
        ? t("walkthrough.work.why")
        : emptyGroup
          ? t("walkthrough.work.group.why", { group: emptyGroup.group.name.replace(/\s+/g, " ").trim() })
          : "";

  const refresh = () =>
    Promise.all(["business", "setup", "projects", "people", "organizations"].map((key) => client.invalidateQueries({ queryKey: [key] })));
  // A change made at once that couldn't be saved names what went wrong and offers to run it again.
  const [retry, setRetry] = useState<(() => void) | null>(null);
  const sayProblem = (err: unknown, again?: () => void) => {
    setProblem(err instanceof ApiError && err.detail ? err.detail : problemText(err, t));
    setRetry(again ? () => again : null);
  };

  /** The lines become projects inside the side, each by the project route; one the side already holds is left alone. A
   * group with a name and something ticked is a project inside the side too, and what is ticked goes inside it. */
  const addLines = async (side: string, text: string, group?: Group) => {
    const held = new Set((projects.data ?? []).filter((p) => p.parent === side).map((p) => p.name.toLowerCase()));
    const lines = workLines(text);
    const inside = new Set((group?.picked ?? []).filter((name) => lines.includes(name)).map((name) => name.toLowerCase()));
    const groupName = group?.name.replace(/\s+/g, " ").trim() ?? "";
    const parent = groupName && inside.size > 0 ? (await api.addProject({ name: groupName, parent: side })).id : side;
    for (const name of lines) {
      if (held.has(name.toLowerCase())) continue;
      await api.addProject({ name, parent: parent !== side && inside.has(name.toLowerCase()) ? parent : side });
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
            const summary = sideSummary(draft.about);
            const made = await api.addSide({ name: draft.name.trim(), kind: "business", ...(summary ? { summary } : {}) });
            await addLines(made.project, draft.lines, draft.group);
            setDrafts((all) => all.filter((d) => d.key !== draft.key));
          }
          for (const side of savedBusinesses) {
            if (aboutChanged(side)) {
              await api.editProject(side.project, { summary: sideSummary(moreAbout[side.project]) || null });
              setMoreAbout((all) => Object.fromEntries(Object.entries(all).filter(([id]) => id !== side.project)));
            }
            const text = more[side.project] ?? "";
            if (workLines(text).length === 0) continue;
            await addLines(side.project, text, moreGroup[side.project]);
            setMore((all) => ({ ...all, [side.project]: "" }));
            setMoreGroup((all) => ({ ...all, [side.project]: noGroup() }));
          }
        }
      }
      await refresh();
      clearDrafts("work");
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

  if (!state.data) return state.isError ? <EmptyState text={t("welcome.failed")} /> : <Skeleton rows={2} />;

  const toggleBusiness = (on: boolean) => {
    setBusinessOn(on);
    if (on && drafts.length === 0 && savedBusinesses.length === 0) setDrafts([blank()]);
  };
  const draftName = (key: number, name: string) => setDrafts((all) => all.map((d) => (d.key === key ? { ...d, name } : d)));
  const draftAbout = (key: number, about: string) => setDrafts((all) => all.map((d) => (d.key === key ? { ...d, about } : d)));
  const draftLines = (key: number, lines: string) => setDrafts((all) => all.map((d) => (d.key === key ? { ...d, lines } : d)));
  const draftGroup = (key: number, group: Group) => setDrafts((all) => all.map((d) => (d.key === key ? { ...d, group } : d)));
  const rows = savedBusinesses.length + drafts.length;

  /** What a saved business can still be given: its description and more projects, with the optional group. */
  const savedFields = (side: Side) => (
    <div className="field" data-more-for={side.project}>
      <div className="field">
        <label htmlFor={`work-about-${side.project}`}>{t("walkthrough.work.about", { name: side.name })}</label>
        <textarea
          id={`work-about-${side.project}`}
          rows={2}
          value={side.project in moreAbout ? moreAbout[side.project] : (side.summary ?? "")}
          aria-describedby="work-about-hint"
          onChange={(e) => setMoreAbout((all) => ({ ...all, [side.project]: e.target.value }))}
        />
        <p className="hint" id="work-about-hint">
          {t("walkthrough.work.about_hint")}
        </p>
      </div>
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
      <GroupThem
        id={`work-more-${side.project}`}
        business={side.name}
        lines={workLines(more[side.project] ?? "")}
        group={moreGroup[side.project] ?? noGroup()}
        onChange={(group) => setMoreGroup((all) => ({ ...all, [side.project]: group }))}
      />
    </div>
  );


  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (changed && !missing) void save();
      }}
    >
      {restoredDraft && (
        <p className="hint" role="status" data-draft-restored="">
          {t("draft.restored")}
        </p>
      )}
      <div className="field work-question" role="group" aria-labelledby="work-question" aria-describedby="work-always">
        <p className="what" id="work-question">
          {t("walkthrough.work.question")}
        </p>
        <p className="aside" id="work-always">
          {t("walkthrough.work.always")}
        </p>
        <div role="group" aria-labelledby="work-also-title" aria-describedby="work-also-note" data-also="">
          <p className="what" id="work-also-title">
            {t("walkthrough.work.also")}
          </p>
          <label className="check-line">
            <input type="checkbox" checked={jobTicked} disabled={savedJobs.length > 0} onChange={(e) => setJobOn(e.target.checked)} />
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
          <p className="hint" id="work-also-note">
            {t("walkthrough.work.also_note")}
          </p>
        </div>
        {saved.length > 0 && <p className="hint">{t("walkthrough.work.stays")}</p>}
      </div>

      {saved.length > 0 && (
        <section aria-labelledby="work-added" data-added="">
          <h3 id="work-added">{t("walkthrough.work.added")}</h3>
          {saved.map((side, position) => (
            <div key={side.project} className="saved-side" data-saved-side={side.project}>
              <ul className="queue">
                <SavedSide
                  side={side}
                  position={position}
                  inside={insideLines(projects.data ?? [], side.project, (name, jobs) => t("walkthrough.work.group_line", { name, jobs }))}
                  onChanged={refresh}
                  onProblem={sayProblem}
                  onClear={() => {
                    setProblem("");
                    setRetry(null);
                  }}
                />
              </ul>
              {businessTicked && side.kind === "business" && savedFields(side)}
            </div>
          ))}
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
        drafts.map((draft) => {
          const id = `work-business-${draft.key}`;
          const label = draft.name.trim();
          return (
            <section key={draft.key} className="field" data-business-draft="" aria-labelledby={`${id}-title`}>
              <h3 id={`${id}-title`}>{label || t("walkthrough.work.new_business")}</h3>
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
                <label htmlFor={`${id}-about`}>{label ? t("walkthrough.work.about", { name: label }) : t("walkthrough.work.about_unnamed")}</label>
                <textarea
                  id={`${id}-about`}
                  rows={2}
                  value={draft.about}
                  aria-describedby={`${id}-about-hint`}
                  onChange={(e) => draftAbout(draft.key, e.target.value)}
                />
                <p className="hint" id={`${id}-about-hint`}>
                  {t("walkthrough.work.about_hint")}
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
                <GroupThem
                  id={id}
                  business={label}
                  lines={workLines(draft.lines)}
                  group={draft.group}
                  onChange={(group) => draftGroup(draft.key, group)}
                />
              </div>
              {rows > 1 && (
                <div className="row-end">
                  <Button variant="quiet" size="sm"
                    aria-label={label ? t("walkthrough.work.discard_named", { name: label }) : t("walkthrough.work.discard_unnamed")}
                    onClick={() => setDrafts((all) => all.filter((d) => d.key !== draft.key))}
                  >
                    {t("walkthrough.work.discard")}
                  </Button>
                </div>
              )}
            </section>
          );
        })}
      {businessTicked && (
        <div className="row-end">
          <Button onClick={() => setDrafts((all) => [...all, blank()])}>
            {t("walkthrough.work.add_business")}
          </Button>
        </div>
      )}

      {problem && (
        <div className="problem-note" role="alert">
          <p>{problem}</p>
          {retry && (
            <Button onClick={retry}>
              {t("action.try_again")}
            </Button>
          )}
        </div>
      )}
      {!hasSlot && (
        <div className="row-end">
          <Button type="submit" variant={props.done ? "secondary" : "primary"} disabled={busy || !changed || !!missing}>
            {t(props.onContinue && !props.done ? "welcome.workspace.save_continue" : "welcome.workspace.save")}
          </Button>
        </div>
      )}
    </form>
  );
}

/** Whether a group has a name but none of the typed jobs ticked in it: it would make nothing. */
function groupNeedsTick(group: Group, lines: string[]): boolean {
  if (group.name.trim() === "") return false;
  const picked = new Set(group.picked.map((n) => n.toLowerCase()));
  return !lines.some((name) => picked.has(name.toLowerCase()));
}

/** The optional line under what a business works on: "Do some of these belong together? Give the group a name". It is
 * closed until opened and skipped otherwise; once the group is named, each job gets a tick box "in <group>", and a name
 * with at least one tick makes the group. */
function GroupThem(props: { id: string; business: string; lines: string[]; group: Group; onChange: (group: Group) => void }) {
  const { t } = useWords();
  const { group } = props;
  const name = group.name.replace(/\s+/g, " ").trim();
  const picked = new Set(group.picked.map((n) => n.toLowerCase()));
  const toggle = (job: string, on: boolean) =>
    props.onChange({ ...group, picked: on ? [...group.picked, job] : group.picked.filter((n) => n.toLowerCase() !== job.toLowerCase()) });
  return (
    <details className="more-options group-them" data-group="">
      <summary>{t("walkthrough.work.group.open")}</summary>
      <div className="field">
        <label htmlFor={`${props.id}-group-name`}>{t("walkthrough.work.group.name")}</label>
        <input
          id={`${props.id}-group-name`}
          type="text"
          value={group.name}
          autoComplete="off"
          aria-describedby={`${props.id}-group-name-hint`}
          onChange={(e) => props.onChange({ ...group, name: e.target.value })}
        />
        <p className="hint" id={`${props.id}-group-name-hint`}>
          {props.business ? t("walkthrough.work.group.name_hint_named", { name: props.business }) : t("walkthrough.work.group.name_hint")}
        </p>
      </div>
      {name !== "" &&
        (props.lines.length === 0 ? (
          <p className="hint">{t("walkthrough.work.group.none_listed")}</p>
        ) : (
          <>
            <ul className="plain-list group-picks" aria-label={t("walkthrough.work.group.pick", { group: name })}>
              {props.lines.map((job) => (
                <li key={job} className="group-pick">
                  <span>{job}</span>
                  <label className="check-line">
                    <input
                      type="checkbox"
                      aria-label={t("walkthrough.work.group.in_named", { name: job, group: name })}
                      checked={picked.has(job.toLowerCase())}
                      onChange={(e) => toggle(job, e.target.checked)}
                    />
                    <span>{t("walkthrough.work.group.in", { group: name })}</span>
                  </label>
                </li>
              ))}
            </ul>
            <p className="hint">{t("walkthrough.work.group.pick_hint", { group: name })}</p>
          </>
        ))}
    </details>
  );
}

/** A side already saved: its name and kind, what is inside it, Rename (an edit of its project) and, while setup is open and
 * nothing is filed under it, Remove. */
export function SavedSide(props: {
  side: Side;
  position: number;
  inside: string[];
  onChanged: () => Promise<unknown>;
  onProblem: (err: unknown, again?: () => void) => void;
  onClear: () => void;
  /** "setup": Remove at once while nothing is filed under the side, and asking what happens to what is filed when something
   * is. "ask": always asking what happens to its projects and to-dos. */
  removal?: "setup" | "ask";
}) {
  const { t, tn } = useWords();
  const { side } = props;
  const { push } = useToasts();
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(side.name);
  const [busy, setBusy] = useState(false);
  const [asking, setAsking] = useState(false);
  const base = `work-side-${side.project}`;
  // Something filed under the side is never lost without the person saying where it goes.
  const ask = props.removal === "ask" || !side.removable;

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
      props.onProblem(err, () => void rename());
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
      props.onProblem(err, () => void remove());
    } finally {
      setBusy(false);
    }
  };

  /** Removing with a choice: the projects and to-dos move to Personal or end with the side, as one change with Undo. */
  const removeWith = async (where: "personal" | "end") => {
    setBusy(true);
    props.onClear();
    try {
      const done = await api.removeSideWithWork(side.project, where);
      setAsking(false);
      await props.onChanged();
      push({
        message:
          where === "end" && done.acts.length > 0
            ? t("settings.business.removed_end_note", { name: side.name, names: done.names.join(", ") })
            : t(where === "personal" ? "settings.business.removed_move" : "settings.business.removed_end", { name: side.name, personal: t("sides.filter.personal") }),
        undo: async () => {
          // The one Undo also takes back the notes the ending drafted, while none has gone out.
          await api.undo(done.changeset);
          await props.onChanged();
        },
      });
    } catch (err) {
      props.onProblem(err, () => void removeWith(where));
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
              : (side.filed ?? 0) === 0
                ? t("walkthrough.work.no_projects")
                : null}
          </span>
          {(side.filed ?? 0) > 0 && <span className="sub">{tn("walkthrough.work.filed", side.filed ?? 0)}</span>}
        </div>
        <div className="acts">
          {renaming ? (
            <>
              <Button variant="primary" size="sm" disabled={busy || !name.trim()} onClick={() => void rename()}>
                {t("walkthrough.work.rename_save")}
              </Button>
              <Button size="sm"
                onClick={() => {
                  setName(side.name);
                  setRenaming(false);
                }}
              >
                {t("walkthrough.work.rename_cancel")}
              </Button>
            </>
          ) : (
            <>
              <Button size="sm"
                aria-label={t("walkthrough.work.rename_named", { name: side.name })}
                onClick={() => {
                  setName(side.name);
                  setRenaming(true);
                }}
              >
                {t("walkthrough.work.rename")}
              </Button>
              <Button variant="quiet" size="sm"
                disabled={busy}
                aria-expanded={ask ? asking : undefined}
                aria-label={t("walkthrough.work.remove_named", { name: side.name })}
                onClick={() => (ask ? setAsking((on) => !on) : void remove())}
              >
                {t("walkthrough.work.remove")}
              </Button>
            </>
          )}
        </div>
      </div>
      {ask && asking && (
        <div className="field" role="group" aria-labelledby={`${base}-ask`} data-remove-ask="">
          <p id={`${base}-ask`}>{t("settings.business.remove_ask", { name: side.name })}</p>
          <div className="row-end">
            <Button variant="quiet" disabled={busy} onClick={() => setAsking(false)}>
              {t("settings.business.remove_cancel")}
            </Button>
            <Button disabled={busy} onClick={() => void removeWith("end")}>
              {t("settings.business.remove_end")}
            </Button>
            <Button variant="primary" disabled={busy} onClick={() => void removeWith("personal")}>
              {t("settings.business.remove_move", { personal: t("sides.filter.personal") })}
            </Button>
          </div>
        </div>
      )}
    </li>
  );
}
