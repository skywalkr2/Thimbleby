// A to-do's page edits it the way its row does (design 7.5): the same short editor (what, when, how long, who, side or project
// by name, how it repeats), never a form of the record's own fields. The editor takes the to-do as the open list shows it, so
// this reads it from there; a to-do that is finished or dropped is not edited here. A save sends only what the person touched.
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { api, type S } from "../lib/api";
import { useEditAction } from "./EditAction";
import type { MenuAction } from "./RowMenu";

type Open = S["OpenActionView"];

/** What the editor reads while the to-do hasn't loaded: nothing, and it is never opened then. */
const NONE: Pick<Open, "id" | "version" | "text" | "due" | "repeat" | "effort_minutes" | "owners" | "project"> = {
  id: "",
  version: 0,
  text: "",
  due: null,
  repeat: null,
  effort_minutes: null,
  owners: [],
  project: null,
};

/** The editor of one to-do for its page: `entry` opens it (none while the to-do is not an open one) and `form` is where it
 * shows. `onClosed` runs when it closes. */
export function useEditDetailsOfTodo(id: string, enabled: boolean, onClosed?: () => void): { entry: MenuAction | null; form: ReactNode } {
  const items = useQuery({ queryKey: ["open-items"], queryFn: api.openItems, enabled });
  const found = enabled ? items.data?.actions.find((a) => a.id === id) : undefined;
  const edit = useEditAction(found ?? NONE, onClosed);
  return { entry: found ? edit.entry : null, form: found ? edit.form : null };
}
