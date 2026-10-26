// What the line that asks which side some items belong to opens (design 6.32, 7.7): Personal and each side by its own name
// as a short list, and choosing one files every item the line stands for under that side's top project, with Undo. The
// person can still sort them one at a time from the list of unfiled items.
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useSides } from "../lib/sides";
import { viewHref } from "../lib/views";
import { useWords } from "../lib/wording";
import { Button } from "../ui/Button";
import { Skeleton } from "../ui/Skeleton";
import { useFile } from "./Unfiled";

export function SideChoose() {
  const { t, tn } = useWords();
  const unfiled = useQuery({ queryKey: ["unfiled"], queryFn: api.unfiled });
  const { personal, sides } = useSides();
  const file = useFile();
  if (unfiled.isPending) return <Skeleton />;
  const items = unfiled.data?.items ?? [];
  if (items.length === 0) return <p className="hint">{t("queue.detail.gone")}</p>;
  const choices = [...(personal ? [{ id: personal, name: t("nav.personal") }] : []), ...sides.map((s) => ({ id: s.project, name: s.name }))];
  return (
    <div data-side-choose="">
      <p className="hint">{tn("sides.choose.intro", items.length)}</p>
      <ul className="children" aria-label={t("sides.choose.label")}>
        {choices.map((c) => (
          <li key={c.id}>
            <Button onClick={() => void file(items, c.id)}>{c.name}</Button>
          </li>
        ))}
      </ul>
      <p className="hint">
        <a href={viewHref("records/projects")}>{t("sides.choose.one_by_one")}</a>
      </p>
    </div>
  );
}
