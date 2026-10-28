// The places a person can pick from when saying what something is about (design 6.32): each side, then its projects, a
// project inside another shown after it as "Parent › Child". A side is a group and never a project choice of its own: the
// choice that files something on the side itself is a separate first choice in its group, "In <side>, not in a project". A
// project's status is the person's own words, so none is guessed to be over.
import type { S } from "./api";

export interface ProjectChoice {
  id: string;
  label: string;
}

/** One side with the choices under it: `projects` are real projects only. */
export interface PlaceGroup {
  /** The side's id, which is also the value of "in the side, not in a project". */
  id: string;
  name: string;
  projects: ProjectChoice[];
}

export interface Places {
  groups: PlaceGroup[];
  /** Projects that sit on no side (a plugin's, or one left over); listed after the sides, plainly. */
  loose: ProjectChoice[];
}

export function placeGroups(projects: S["ProjectView"][], path: (parent: string, name: string) => string): Places {
  const children = new Map<string | null, S["ProjectView"][]>();
  const byId = new Map(projects.map((p) => [p.id, p]));
  for (const p of projects) {
    const parent = p.parent && byId.has(p.parent) && p.parent !== p.id ? p.parent : null;
    children.set(parent, [...(children.get(parent) ?? []), p]);
  }
  const seen = new Set<string>();
  const walk = (parent: string, prefix: string, into: ProjectChoice[]) => {
    for (const p of children.get(parent) ?? []) {
      if (seen.has(p.id) || p.side) continue;
      seen.add(p.id);
      const label = prefix ? path(prefix, p.name) : p.name;
      into.push({ id: p.id, label });
      walk(p.id, label, into);
    }
  };
  const groups: PlaceGroup[] = [];
  for (const side of projects.filter((p) => p.side)) {
    seen.add(side.id);
    const inside: ProjectChoice[] = [];
    walk(side.id, "", inside);
    groups.push({ id: side.id, name: side.name, projects: inside });
  }
  const loose: ProjectChoice[] = [];
  for (const p of children.get(null) ?? []) {
    if (seen.has(p.id) || p.side) continue;
    seen.add(p.id);
    loose.push({ id: p.id, label: p.name });
    walk(p.id, p.name, loose);
  }
  // A project in a cycle, reached from nowhere, is still offered once.
  for (const p of projects) {
    if (!seen.has(p.id) && !p.side) {
      seen.add(p.id);
      loose.push({ id: p.id, label: p.name });
    }
  }
  return { groups, loose };
}

/** Every real project as one flat list (never a side), those on a side first, in the order the workspace lists them. */
export function projectChoices(projects: S["ProjectView"][], path: (parent: string, name: string) => string): ProjectChoice[] {
  const { groups, loose } = placeGroups(projects, path);
  return [...groups.flatMap((g) => g.projects), ...loose];
}
