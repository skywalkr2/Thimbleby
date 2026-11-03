// What the assistant wrote, read as words (design 7.0): a record id in its text is the record's name, or the kind of thing it
// is when the screen can't name it, and a piece of a data dump is left out. One place, used wherever the assistant's own text
// (a note it filed, a lesson it proposed, the words of a change) is shown on a screen.
import { useQuery } from "@tanstack/react-query";
import { useCallback } from "react";
import { api } from "./api";
import { plainText } from "./read";
import { useWords } from "./wording";

/** The reader of the assistant's text: `readable(text)` is the text as words. */
export function useReadable(): (text: string | null | undefined) => string {
  const { t, has } = useWords();
  const people = useQuery({ queryKey: ["people"], queryFn: api.people });
  const projects = useQuery({ queryKey: ["projects"], queryFn: api.projects });
  const names = new Map<string, string>([...(people.data ?? []).map((p) => [p.id, p.name] as const), ...(projects.data ?? []).map((p) => [p.id, p.name] as const)]);
  return useCallback(
    (text) => plainText(text, (id) => names.get(id), (prefix) => (has(`readable.kind.${prefix}`) ? t(`readable.kind.${prefix}`) : t("readable.kind.other"))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [people.data, projects.data, t, has],
  );
}
