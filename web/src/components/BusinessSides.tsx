// The jobs and businesses on their page of Settings (design 7.9, "Your business"): each side of the person's work beside their
// own life by name, with Rename (an edit of its project) and Remove, which asks each time whether its projects and to-dos move to
// Personal or end with it, and whether its organization goes too (one change with Undo). Add a business and Add a job open a short
// form, so a side can be added here after setup as it is in setup, and a person with only their own life can add the first.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useId, useState } from "react";
import { api, ApiError } from "../lib/api";
import { problemText } from "../lib/problem";
import { useToasts } from "../lib/toasts";
import { insideLines } from "../lib/work-lines";
import { useWords } from "../lib/wording";
import { SavedSide } from "./WalkthroughWork";
import { Actions } from "../ui/Actions";
import { Button } from "../ui/Button";
import { Drawer } from "../ui/Drawer";
import { FormField } from "../ui/FormField";
import { RowList } from "../ui/RowList";
import styles from "./BusinessSides.module.css";

type Kind = "job" | "business";

export function BusinessSides() {
  const { t } = useWords();
  const client = useQueryClient();
  const state = useQuery({ queryKey: ["business"], queryFn: api.business });
  const projects = useQuery({ queryKey: ["projects"], queryFn: api.projects });
  const [problem, setProblem] = useState("");
  const [adding, setAdding] = useState<Kind | null>(null);
  const sides = state.data?.sides ?? [];
  // Removing or adding a side changes what is filed where, so every list is read again.
  const refresh = () => client.invalidateQueries();
  return (
    <section aria-labelledby="business-sides">
      <div className={styles.top}>
        <p className="hint">{t(sides.length > 0 ? "settings.business.intro" : "settings.business.intro_none")}</p>
        <Actions>
          <Button onClick={() => setAdding("business")}>{t("settings.business.add_business")}</Button>
          <Button onClick={() => setAdding("job")}>{t("settings.business.add_job")}</Button>
        </Actions>
      </div>
      {sides.length > 0 && (
        <>
          <h3 id="business-sides">{t("settings.business.sides")}</h3>
          <RowList>
            {sides.map((side, position) => (
              <SavedSide
                key={side.project}
                side={side}
                position={position}
                inside={insideLines(projects.data ?? [], side.project, (name, jobs) => t("walkthrough.work.group_line", { name, jobs }))}
                onChanged={refresh}
                onProblem={(err) => setProblem(err instanceof ApiError && err.detail ? err.detail : problemText(err, t))}
                onClear={() => setProblem("")}
                removal="ask"
              />
            ))}
          </RowList>
        </>
      )}
      {problem && (
        <p className="problem-note" role="alert">
          {problem}
        </p>
      )}
      {adding && <AddSide kind={adding} onClose={() => setAdding(null)} />}
    </section>
  );
}

/** The short form that adds one job or business: its name and, for a business, what it is. The toast's Undo takes it back out. */
function AddSide(props: { kind: Kind; onClose: () => void }) {
  const { t } = useWords();
  const client = useQueryClient();
  const { push } = useToasts();
  const id = useId();
  const [name, setName] = useState("");
  const [about, setAbout] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
  const business = props.kind === "business";
  const save = async () => {
    const wanted = name.trim();
    if (!wanted || busy) return;
    setBusy(true);
    setProblem("");
    try {
      const made = await api.addSide({ name: wanted, kind: props.kind, ...(business && about.trim() ? { summary: about.trim() } : {}) });
      await client.invalidateQueries();
      // A name that is already a side is that side: nothing was added, and the form says so.
      if (!made.created || !made.changeset) {
        setProblem(t("settings.business.exists", { name: made.name }));
        setBusy(false);
        return;
      }
      const changeset = made.changeset;
      push({
        message: t("settings.business.added", { name: wanted }),
        undo: async () => {
          await api.undo(changeset);
          await client.invalidateQueries();
        },
      });
      props.onClose();
    } catch (err) {
      setProblem(err instanceof ApiError && err.detail ? err.detail : problemText(err, t));
      setBusy(false);
    }
  };
  const form = `${id}-form`;
  return (
    <Drawer
      open
      title={t(business ? "settings.business.add_title_business" : "settings.business.add_title_job")}
      dirty={!!name.trim() || !!about.trim()}
      onClose={props.onClose}
      footer={
        <>
          <Button variant="quiet" onClick={props.onClose}>
            {t("action.cancel")}
          </Button>
          <Button variant="primary" type="submit" form={form} disabled={!name.trim() || busy} reason={t("settings.business.add_name_missing")}>
            {t(business ? "settings.business.add_save_business" : "settings.business.add_save_job")}
          </Button>
        </>
      }
    >
      <form
        id={form}
        className="setup-form"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <FormField
          id={`${id}-name`}
          label={t(business ? "settings.business.add_name_business" : "settings.business.add_name_job")}
          hint={t(business ? "walkthrough.work.business_name_hint" : "walkthrough.work.job_name_hint")}
        >
          <input id={`${id}-name`} type="text" autoComplete="organization" value={name} onChange={(e) => setName(e.target.value)} />
        </FormField>
        {business && (
          <FormField id={`${id}-about`} label={t("settings.business.add_about")} hint={t("walkthrough.work.about_hint")} optional>
            <textarea id={`${id}-about`} rows={2} value={about} onChange={(e) => setAbout(e.target.value)} />
          </FormField>
        )}
        {problem && (
          <div className="problem-note" role="alert">
            <p>{problem}</p>
          </div>
        )}
      </form>
    </Drawer>
  );
}
