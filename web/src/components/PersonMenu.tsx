// What can be done to a person from a list or from their page: change their details, mark them as having left (only for
// someone from a side of work: a friend or a relative doesn't "leave"), and remove them. Each acts at once with Undo.
import { api, type S } from "../lib/api";
import { useAct } from "../lib/act";
import { useSides } from "../lib/sides";
import { useWords } from "../lib/wording";
import type { MenuAction } from "./RowMenu";

/** Whether someone is part of a side of the person's work, so "left" means something for them. */
export function onWorkSide(p: S["PersonView"], personal: string | null, sides: S["SideView"][]): boolean {
  if (p.org) return true;
  if ((p.sides ?? []).some((id) => id !== personal && sides.some((s) => s.project === id))) return true;
  return (p.sides ?? []).length === 0 && (p.side === "business" || p.side === "both");
}

export function usePersonMenu(onEdit: (p: S["PersonView"]) => void): (p: S["PersonView"]) => MenuAction[] {
  const { t } = useWords();
  const act = useAct();
  const { justMe, personal, sides } = useSides();
  return (p) => {
    const left = p.status === "left";
    const entries: MenuAction[] = [{ id: "edit", label: t("setup.edit"), run: () => onEdit(p) }];
    if (p.is_pm) return entries;
    if (left || (!justMe && onWorkSide(p, personal, sides))) {
      entries.push({
        id: "left",
        label: t(left ? "setup.mark_active" : "setup.mark_left"),
        run: () =>
          void act(
            () => api.editPerson(p.id, { status: left ? "active" : "left" }),
            () => ({
              message: t(left ? "toast.marked_active" : "toast.marked_left", { name: p.name }),
              undo: () => api.editPerson(p.id, { status: p.status }),
            }),
          ),
      });
    }
    entries.push({
      id: "remove",
      danger: true,
      label: t("setup.remove"),
      run: () =>
        void act(
          () => api.removePerson(p.id),
          () => ({ message: t("toast.removed", { name: p.name }), undo: () => api.restorePerson(p.id) }),
        ),
    });
    return entries;
  };
}
