// The options of a "Where does it belong?" list: each side as a group, its own first choice "In <side>, not in a project",
// then its projects (design 6.32). A side is never offered as a project. A project on no side follows the groups.
// It is a plain function, not a component: the list to pick from (ui/Select) reads the `<option>` elements it is handed, and a
// component in its place would be a box it can't see into.
import type { S } from "../lib/api";
import { placeGroups } from "../lib/project-choices";

type T = (key: string, vars?: Record<string, string | number>) => string;

/** `asParent` is for choosing what a new project is part of: the side's own choice is its name, not "not in a project". */
export function placeOptions(projects: S["ProjectView"][], t: T, asParent?: boolean) {
  const { groups, loose } = placeGroups(projects, (parent, name) => t("handin.project.path", { parent, name }));
  return (
    <>
      {groups.map((g) => (
        <optgroup key={g.id} label={g.name}>
          <option value={g.id}>{asParent ? g.name : t("place.in_side", { side: g.name })}</option>
          {g.projects.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </optgroup>
      ))}
      {loose.map((c) => (
        <option key={c.id} value={c.id}>
          {c.label}
        </option>
      ))}
    </>
  );
}
