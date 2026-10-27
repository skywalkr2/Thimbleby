// Value lists: the values a field may take. The lists are read once and shared; a change to one acts at once and offers
// Undo, like every other reversible action.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { api, type S } from "./api";
import { problemText } from "./problem";
import { useSides } from "./sides";
import { useToasts } from "./toasts";
import { useWords } from "./wording";

export type ValueList = S["ValueListView"];

export function useValueLists() {
  return useQuery({ queryKey: ["lists"], queryFn: api.valueLists });
}

/** Whether only the project fields take their values from a list (project group, phase, priority and status). */
export const isProjectList = (list: Pick<ValueList, "used_by">): boolean =>
  list.used_by.length > 0 && list.used_by.every((use) => use.startsWith("project."));

/** Where a list is shown: on the Lists page, or on the business page, which holds the project lists. */
export type ListsPlace = "lists" | "business";

/** The lists a place shows, so each list shows in one place only. With a side, the business page holds the project lists
 * and the Lists page the rest. With no side, the Lists page holds every list, less the project lists while the person has
 * nothing beside Personal (no project field has anything to choose between). */
export function listsOn(lists: ValueList[], place: ListsPlace, where: { sides: boolean; justMe: boolean }): ValueList[] {
  if (place === "business") return where.sides ? lists.filter(isProjectList) : [];
  return where.sides || where.justMe ? lists.filter((list) => !isProjectList(list)) : lists;
}

/** The lists the Lists page shows. Until they have loaded it is empty. */
export function useListsPage(): ValueList[] {
  const lists = useValueLists();
  const { sides, justMe } = useSides();
  return listsOn(lists.data ?? [], "lists", { sides: sides.length > 0, justMe });
}

/** Whether a list offers a value, ignoring capitals. */
export function offers(values: string[], value: string): string | undefined {
  const wanted = value.trim().toLocaleLowerCase();
  return values.find((v) => v.toLocaleLowerCase() === wanted);
}

/** Run a change to a list: refresh what is shown and offer Undo. Returns the problem in plain words when the server
 * refused it, and an empty string when it went through, so the caller can show the problem beside what was typed. */
export function useListChange() {
  const client = useQueryClient();
  const { push } = useToasts();
  const { t } = useWords();
  return useCallback(
    async (run: () => Promise<S["Applied"]>, message: string): Promise<string> => {
      try {
        const done = await run();
        await client.invalidateQueries();
        push({
          message,
          undo: async () => {
            const report = await api.undo(done.changeset);
            await client.invalidateQueries();
            if (!report.restored.length) throw new Error("not undone");
          },
        });
        return "";
      } catch (err) {
        return problemText(err, t);
      }
    },
    [client, push, t],
  );
}
