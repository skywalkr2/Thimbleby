// What a top project holds (design 6.32, 7.8): on Personal's page its areas, on a side's page its projects, each a link to
// its own page with how much is open in it. Nothing is shown for any other project. A person with no side beside Personal
// reads "Areas" and never a word about projects.
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useSides } from "../lib/sides";
import { recordView, viewHref } from "../lib/views";
import { useWords } from "../lib/wording";
import { Row } from "../ui/Row";
import { ButtonLink } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";
export function SideInside(props: { id: string }) {
  const { t, tn } = useWords();
  const { personal, sides } = useSides();
  const projects = useQuery({ queryKey: ["projects"], queryFn: api.projects });
  const isPersonal = personal === props.id;
  if (!isPersonal && !sides.some((s) => s.project === props.id)) return null;
  const inside = (projects.data ?? []).filter((p) => p.parent === props.id && !p.completed).sort((a, b) => a.name.localeCompare(b.name));
  const part = isPersonal ? "areas" : "projects";
  return (
    <section aria-labelledby="side-inside" className="record-section" data-side-inside="">
      <div className="heading">
        <h2 id="side-inside">{t(`side.${part}.title`)}</h2>
        {inside.length > 0 && <span className="hint">{inside.length}</span>}
      </div>
      {inside.length === 0 ? (
        <EmptyState text={t(`side.${part}.empty`)} />
      ) : (
        <ul className="queue">
          {inside.map((p) => (
            <Row
              key={p.id}
              title={<a href={viewHref(recordView("project", p.id))}>{p.name}</a>}
              meta={
                [p.open_actions > 0 ? tn("projects.open_actions", p.open_actions) : "", p.open_questions > 0 ? tn("projects.open_questions", p.open_questions) : ""]
                  .filter(Boolean)
                  .join(" · ") || undefined
              }
            />
          ))}
        </ul>
      )}
      {!isPersonal && (
        <p>
          <ButtonLink href={viewHref("records/projects")}>
            {t("side.projects.all")}
          </ButtonLink>
        </p>
      )}
    </section>
  );
}
