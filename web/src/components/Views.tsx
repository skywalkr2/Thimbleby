// Views (design 6.32, "Views: one project under several roles"): the person's own named lists of projects inside one side,
// on the Projects screen. A project can be in more than one view, and what is inside a project comes with it. A view only
// changes what the screens show; it files nothing and changes no project's side. Adding opens a drawer (name, tag, side and
// a list of the side's projects to tick); renaming and picking projects open the same drawer for that part. Every change
// acts at once with Undo, and removing a view leaves its projects as they are.
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api, type S } from "../lib/api";
import { useAct } from "../lib/act";
import { useFirstField } from "../lib/focus";
import { placeGroups } from "../lib/project-choices";
import { useWords } from "../lib/wording";
import { Button } from "../ui/Button";
import { CheckboxGroup } from "../ui/CheckboxGroup";
import { Drawer } from "../ui/Drawer";
import { FormField } from "../ui/FormField";
import { Row } from "../ui/Row";
import { RowList } from "../ui/RowList";
import { Select } from "../ui/Select";
import { Field } from "./PersonForm";
import { RowMenu, type MenuAction } from "./RowMenu";
import styles from "./Views.module.css";

type View = S["WorkViewView"];
type Part = "all" | "name" | "projects";

export function Views() {
  const { t, tn } = useWords();
  const act = useAct();
  const state = useQuery({ queryKey: ["business"], queryFn: api.business });
  const views = useQuery({ queryKey: ["views"], queryFn: api.views });
  const [editing, setEditing] = useState<{ view?: View; part: Part } | null>(null);
  // A view is a list inside one side of the person's work, so there is nothing to make until they have one.
  if ((state.data?.sides ?? []).length === 0) return null;
  const rows = views.data ?? [];
  const undoOf = (applied: S["ViewApplied"]) => async () => {
    const report = await api.undo(applied.changeset);
    if (!report.restored.length) throw new Error("not undone");
  };
  const menu = (v: View): MenuAction[] => [
    { id: "rename", label: t("views.rename"), run: () => setEditing({ view: v, part: "name" }) },
    { id: "projects", label: t("views.change_projects"), run: () => setEditing({ view: v, part: "projects" }) },
    {
      id: "remove",
      danger: true,
      label: t("views.remove"),
      run: () => void act(() => api.removeView(v.id), (applied) => ({ message: t("views.toast.removed", { name: v.name }), undo: undoOf(applied) })),
    },
  ];
  return (
    <section className="panel-section" aria-labelledby="views-title" data-views="">
      {rows.length === 0 ? (
        // Until a first view exists the section is one quiet line: what a view is for, and the way to make one.
        !views.isPending && (
          <div className={styles.quiet}>
            <h2 id="views-title" className="sr">
              {t("views.title")}
            </h2>
            <p className="hint">{t("views.empty")}</p>
            <Button size="sm" onClick={() => setEditing({ part: "all" })}>
              {t("views.add")}
            </Button>
          </div>
        )
      ) : (
        <>
          <div className="heading">
            <h2 id="views-title">{t("views.title")}</h2>
            <Button onClick={() => setEditing({ part: "all" })}>{t("views.add")}</Button>
          </div>
          <RowList aria-label={t("views.list")}>
            {rows.map((v) => (
              <Row
                key={v.id}
                title={v.name}
                meta={[v.side_name, v.label, v.projects.length > 0 ? tn("views.count", v.projects.length) : t("views.no_projects")].filter(Boolean).join(" · ")}
                menu={<RowMenu label={v.name} actions={menu(v)} />}
              />
            ))}
          </RowList>
        </>
      )}
      {editing && <ViewDrawer view={editing.view} part={editing.part} undoOf={undoOf} onClose={() => setEditing(null)} />}
    </section>
  );
}

function ViewDrawer(props: { view?: View; part: Part; undoOf: (applied: S["ViewApplied"]) => () => Promise<void>; onClose: () => void }) {
  const { t } = useWords();
  const act = useAct();
  const first = useFirstField<HTMLFormElement>();
  const state = useQuery({ queryKey: ["business"], queryFn: api.business });
  const projects = useQuery({ queryKey: ["projects"], queryFn: api.projects });
  const v = props.view;
  const [name, setName] = useState(v?.name ?? "");
  const [label, setLabel] = useState(v?.label ?? "");
  const sides = [
    ...(state.data?.personal ? [{ id: state.data.personal, name: t("sides.filter.personal") }] : []),
    ...(state.data?.sides ?? []).map((s) => ({ id: s.project, name: s.name })),
  ];
  const [side, setSide] = useState(v?.side ?? (state.data?.sides ?? [])[0]?.project ?? "");
  const [ticked, setTicked] = useState<string[]>((v?.projects ?? []).map((p) => p.id));
  const key = v?.id ?? "new";
  const formId = `view-form-${key}`;
  const inSide = placeGroups(projects.data ?? [], (a, b) => `${a} › ${b}`).groups.find((g) => g.id === side)?.projects ?? [];
  const showName = props.part !== "projects";
  const showProjects = props.part !== "name";
  const toggle = (id: string) => setTicked((now) => (now.includes(id) ? now.filter((x) => x !== id) : [...now, id]));
  const save = async () => {
    const wanted = name.trim();
    const mine = ticked.filter((id) => inSide.some((p) => p.id === id));
    if (!v) {
      const done = await act(
        () => api.addView({ name: wanted, label: label.trim() || null, side, projects: mine }),
        (applied) => ({ message: t("views.toast.added", { name: wanted }), undo: props.undoOf(applied) }),
      );
      if (done) props.onClose();
    } else if (props.part === "name") {
      const done = await act(
        () => api.renameView(v.id, { name: wanted, label: label.trim() || null }),
        (applied) => ({ message: t("views.toast.renamed", { name: wanted }), undo: props.undoOf(applied) }),
      );
      if (done) props.onClose();
    } else {
      const done = await act(
        () => api.setViewProjects(v.id, mine),
        (applied) => ({ message: t("views.toast.projects", { name: v.name }), undo: props.undoOf(applied) }),
      );
      if (done) props.onClose();
    }
  };
  const title = !v ? t("views.add_title") : props.part === "name" ? t("views.rename_title") : t("views.projects_title");
  const dirty = !v
    ? name !== "" || label !== "" || ticked.length > 0
    : props.part === "name"
      ? name !== v.name || label !== v.label
      : JSON.stringify([...ticked].sort()) !== JSON.stringify(v.projects.map((p) => p.id).sort());
  return (
    <Drawer
      open
      title={title}
      dirty={dirty}
      onClose={props.onClose}
      footer={
        <>
          <Button onClick={props.onClose}>{t("action.cancel")}</Button>
          <Button variant="primary" type="submit" form={formId} disabled={showName && !name.trim()} reason={t("views.name_missing")}>
            {t(v ? "views.save" : "views.add")}
          </Button>
        </>
      }
    >
      <form
        id={formId}
        ref={first}
        className="setup-form"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        {showName && (
          <>
            <Field id={`vn-${key}`} label={t("views.name")} value={name} onChange={setName} hint={t("views.name_hint")} required />
            <Field id={`vl-${key}`} label={t("views.label")} value={label} onChange={setLabel} hint={t("views.label_hint")} />
          </>
        )}
        {!v && sides.length > 1 && (
          <FormField id={`vs-${key}`} label={t("views.side")}>
            <Select
              id={`vs-${key}`}
              value={side}
              onChange={(e) => {
                setSide(e.target.value);
                setTicked([]);
              }}
            >
              {sides.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </FormField>
        )}
        {showProjects && (
          <CheckboxGroup legend={t("views.projects")} hint={inSide.length > 0 ? t("views.projects_hint") : t("views.projects_none")}>
            {inSide.map((p) => (
              <label key={p.id} className="check-line">
                <input type="checkbox" checked={ticked.includes(p.id)} onChange={() => toggle(p.id)} />
                <span>{p.label}</span>
              </label>
            ))}
          </CheckboxGroup>
        )}
      </form>
    </Drawer>
  );
}
