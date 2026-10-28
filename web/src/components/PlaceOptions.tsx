// The options of a "Where does it belong?" list: each side as a group, its own first choice "In <side>, not in a project",
// then its projects (design 6.32). A side is never offered as a project. A project on no side follows the groups.
import type { S } from "../lib/api";
import { placeGroups } from "../lib/project-choices";
import { useWords } from "../lib/wording";

export function PlaceOptions(props: {
  projects: S["ProjectView"][];
  /** For choosing what a new project is part of: the side's own choice is its name, not "not in a project". */
  asParent?: boolean;
}) {
  const { t } = useWords();
  const { groups, loose } = placeGroups(props.projects, (parent, name) => t("handin.project.path", { parent, name }));
  return (
    <>
      {groups.map((g) => (
        <optgroup key={g.id} label={g.name}>
          <option value={g.id}>{props.asParent ? g.name : t("place.in_side", { side: g.name })}</option>
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
