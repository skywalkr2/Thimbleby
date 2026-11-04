// The side filter on Today and Follow-ups (design 6.32): Personal and each side of the person's work, shown only to a
// person who has set one, and remembered on this browser as the theme is. A side is the id of its top project. Lines and
// rows carry the side their project is on; one on neither side (the app's own lines, a row filed under no project) shows
// under every choice.
import { useQuery } from "@tanstack/react-query";
import { useEffect, useSyncExternalStore } from "react";
import { api, type S } from "./api";
import { useWords } from "./wording";

/** The id of a side's top project. */
export type Side = string;
/** What the filter holds: "all", a side's id, or `view:<id>` for one of the person's views (design 6.32). */
export type SideChoice = "all" | Side;

const VIEW_PREFIX = "view:";
/** The choice that names a view. */
export const viewChoice = (id: string): SideChoice => `${VIEW_PREFIX}${id}`;
/** The id of the view a choice names, or null when it names All or a side. */
export const viewOf = (choice: SideChoice): string | null => (choice.startsWith(VIEW_PREFIX) ? choice.slice(VIEW_PREFIX.length) : null);

// The side each of the person's views is inside, as the filter last read them, so a plain function can tell what a view's
// choice covers. A view not listed here (not read yet, or removed) is read as All.
let viewSides = new Map<string, Side>();

const KEY = "cockpit:side-filter";
const isChoice = (v: unknown): v is SideChoice => typeof v === "string" && v !== "";

// What was picked when this browser won't keep it: it then lasts until the page is closed.
let session: SideChoice = "all";
const listeners = new Set<() => void>();

function stored(): SideChoice {
  try {
    const saved = window.localStorage.getItem(KEY);
    if (isChoice(saved)) return saved;
  } catch {
    // Storage can be blocked.
  }
  return session;
}

/** Remembers the pick on this browser and tells every screen that shows it. */
export function setSideChoice(choice: SideChoice): void {
  session = choice;
  try {
    window.localStorage.setItem(KEY, choice);
  } catch {
    // Storage can be blocked; the pick then lasts until the page is closed.
  }
  for (const listener of listeners) listener();
}

function useStoredChoice(): SideChoice {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    stored,
  );
}

/** Whether a line or row shows under a choice: everything under "all", and what is on that side or on none. Under a view,
 * what is on its side and in one of the view's projects (`views` names the views its project is in) or on no project at
 * all (`inProject` false and in no view), plus what is on no side. A screen that does not know the views (`views` left
 * out) shows the view's whole side. */
export function onSide(side: Side | null | undefined, choice: SideChoice, views?: readonly string[] | null, inProject = false): boolean {
  const view = viewOf(choice);
  if (view === null) return choice === "all" || !side || side === choice;
  const home = viewSides.get(view);
  if (home === undefined || !side) return true;
  if (side !== home) return false;
  if (!views) return true;
  return views.includes(view) || (!inProject && views.length === 0);
}

/** Whether a line or row on several sides shows under a choice: under every choice when it names none, else under each of
 * the sides it is on (and, for a view, under the view when one of those sides is the view's). */
export const onAnySide = (held: readonly Side[] | null | undefined, choice: SideChoice, views?: readonly string[] | null): boolean =>
  choice === "all" || !held || held.length === 0 || held.some((side) => onSide(side, choice, views));

/** The same for a record that names the sides it is on (a person): under every choice when it names none. */
export const onSides = (held: readonly Side[] | null | undefined, choice: SideChoice): boolean =>
  choice === "all" || !held || held.length === 0 || held.includes(choice);

export interface SideOption {
  /** The side's id: what the choice holds and what a line's `side` is. */
  id: Side;
  name: string;
  /** Personal, the person's own life, whose name comes from the wording sheet. */
  personal: boolean;
}

export interface ViewOption {
  /** The choice the control holds for this view: `view:<id>`. */
  id: SideChoice;
  /** The view's own id. */
  view: string;
  name: string;
  label: string;
  /** The side it is inside. */
  side: Side;
  /** The side's name, so the choice reads "<side>: <view>". */
  sideName: string;
}

export interface SideFilter {
  /** Whether the person has a side beside their own life, so the filter is offered at all. */
  offered: boolean;
  /** Personal, then each side of their work, in order, for the choices. */
  options: SideOption[];
  /** The person's views, each under its side's place in `options`, for the choices. */
  views: ViewOption[];
  /** The pick in force: always "all" while there is no other side, whatever was remembered. Under a view, the view's side;
   * `view` then names the view. */
  choice: SideChoice;
  /** The view picked, or null under All and under a side. */
  view: string | null;
  /** What the control holds: `choice`, or the view's own choice. */
  picked: SideChoice;
  /** The pick in the person's words ("Personal", the side's name or the view's); empty for "all". */
  named: string;
  /** Whether a line or row shows under the pick: its side, the views its project is in and whether it names a project. */
  shows: (side: Side | null | undefined, views?: readonly string[] | null, inProject?: boolean) => boolean;
  set: (choice: SideChoice) => void;
}

/** The filter's state: whether it is offered, what is picked and what the pick is called. A pick remembered as the older
 * words "personal" and "business" means the personal project and the first other side. */
export function useSideFilter(): SideFilter {
  const { t } = useWords();
  const state = useQuery({ queryKey: ["business"], queryFn: api.business });
  const picked = useStoredChoice();
  const sides = state.data?.sides ?? [];
  const personal = state.data?.personal ?? null;
  const offered = state.data?.business === true && sides.length > 0;
  const options: SideOption[] = offered
    ? [...(personal ? [{ id: personal, name: t("sides.filter.personal"), personal: true }] : []), ...sides.map((s) => ({ id: s.project, name: s.name, personal: false }))]
    : [];
  const read = useQuery({ queryKey: ["views"], queryFn: api.views, enabled: offered });
  const sideNames = new Map(options.map((o) => [o.id, o.name]));
  const views: ViewOption[] = offered
    ? (read.data ?? [])
        .filter((v) => sideNames.has(v.side))
        .map((v) => ({ id: viewChoice(v.id), view: v.id, name: v.name, label: v.label, side: v.side, sideName: sideNames.get(v.side) ?? "" }))
    : [];
  viewSides = new Map(views.map((v) => [v.view, v.side]));
  const resolved = picked === "personal" ? personal : picked === "business" ? (sides[0]?.project ?? null) : picked;
  // A pick that names a view that is gone (or one not read yet) falls back to All.
  const pickedView = views.find((v) => v.id === resolved);
  const found = pickedView ? options.find((o) => o.id === pickedView.side) : options.find((o) => o.id === resolved);
  const choice = found ? found.id : "all";
  const view = pickedView && found ? pickedView.view : null;
  const named = pickedView && found ? pickedView.name : (found?.name ?? "");
  const pickedChoice = pickedView && found ? pickedView.id : choice;
  return { offered, options, views, choice, view, picked: pickedChoice, named, shows: (side, held, inProject) => onSide(side, pickedChoice, held, inProject), set: setSideChoice };
}

export interface SidesState {
  /** Whether the person has nothing beside Personal: no side, and no project outside Personal's own. It is what the
   * screens leave out of their words and lists (design 6.32, 7.8). Only once both answers have come: until then, and when
   * either could not be read, nothing the person set up is hidden. */
  justMe: boolean;
  /** The id of the Personal project, when there is one. */
  personal: string | null;
  /** The sides beside Personal, in the person's order. */
  sides: S["SideView"][];
}

/** The side a project is on, as a function: the top of its parent chain when that is Personal or one of the sides, else none
 * (a project on no side, or none named, shows under every choice of the side filter). */
export function useSideOf(): (project: string | null | undefined) => Side | null {
  const state = useQuery({ queryKey: ["business"], queryFn: api.business });
  const projects = useQuery({ queryKey: ["projects"], queryFn: api.projects });
  const known = new Set([state.data?.personal, ...(state.data?.sides ?? []).map((s) => s.project)].filter((id): id is string => !!id));
  const parents = new Map((projects.data ?? []).map((p) => [p.id, p.parent ?? null]));
  return (project) => {
    if (!project) return null;
    const seen = new Set<string>();
    let at = project;
    while (!seen.has(at) && parents.get(at)) {
      seen.add(at);
      at = parents.get(at) as string;
    }
    return known.has(at) ? at : null;
  };
}

/** The words that say what moving something into a side's work changes, or none: the name of the side an item now sits in when
 * that is a side beside Personal and not the one it started in (`from` is where it was, none for a new item, which is
 * filed where its form says and needs no warning). The same warning stands beside every way of moving something. */
export function useMovedToSide(from: string | null | undefined, to: string | null | undefined): string | null {
  const state = useQuery({ queryKey: ["business"], queryFn: api.business });
  const sideOf = useSideOf();
  if (!from || !to) return null;
  const now = sideOf(to);
  if (!now || now === sideOf(from) || now === state.data?.personal) return null;
  return (state.data?.sides ?? []).find((s) => s.project === now)?.name ?? null;
}

/** The sides as the screens read them: whether there is nothing beside Personal, Personal's own project, and the sides. */
export function useSides(): SidesState {
  const state = useQuery({ queryKey: ["business"], queryFn: api.business });
  const projects = useQuery({ queryKey: ["projects"], queryFn: api.projects });
  const sides = state.data?.sides ?? [];
  const personal = state.data?.personal ?? null;
  // Every project is Personal itself or inside it (a chain that loops or leads nowhere stops where it is).
  const parents = new Map((projects.data ?? []).map((p) => [p.id, p.parent ?? null]));
  const top = (id: string): string => {
    const seen = new Set<string>();
    let at = id;
    while (!seen.has(at) && parents.get(at)) {
      seen.add(at);
      at = parents.get(at) as string;
    }
    return at;
  };
  const alone = projects.isSuccess && personal !== null && (projects.data ?? []).every((p) => top(p.id) === personal);
  return { justMe: state.isSuccess && sides.length === 0 && alone, personal, sides };
}

const NAV_KEY = "cockpit:nav:just-me";

function rememberedJustMe(): boolean {
  try {
    return window.localStorage.getItem(NAV_KEY) === "1";
  } catch {
    return false;
  }
}

/** `justMe` for the shell's own parts (the side menu's groups and the search field's words), which are drawn before anything is
 * read and while a read fails: until the sides are known it is what this browser last knew (work beside Personal when it has never known), so the menu
 * and the field do not change when a screen's data arrives or fails to. */
export function useStableJustMe(): boolean {
  const { justMe } = useSides();
  const business = useQuery({ queryKey: ["business"], queryFn: api.business });
  const projects = useQuery({ queryKey: ["projects"], queryFn: api.projects });
  const settled = business.isSuccess && projects.isSuccess;
  useEffect(() => {
    if (!settled) return;
    try {
      window.localStorage.setItem(NAV_KEY, justMe ? "1" : "0");
    } catch {
      // Storage can be blocked; the menu is then drawn from what is read.
    }
  }, [settled, justMe]);
  return settled ? justMe : rememberedJustMe();
}
