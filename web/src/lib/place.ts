// Where an item is, in words (design 6.32): its project (with the project it is part of), or the side it is filed on directly
// as "<side>: not in a project". A side is never worded as a project. With nothing beside Personal, what is on Personal alone
// has no words, since the person has no other place for it.
import { useSides } from "./sides";
import { useWords } from "./wording";

export interface Place {
  name?: string | null;
  parent?: string | null;
  /** The side the item is filed on directly. */
  side?: string | null;
}

export function usePlaceText(): (place: Place) => string {
  const { t } = useWords();
  const { justMe } = useSides();
  return (place) => {
    const project = place.name ? (place.parent ? t("open.project_in", { parent: place.parent, project: place.name }) : place.name) : "";
    const side = place.side && !justMe ? t("side.not_in_project", { side: place.side }) : "";
    return [project, side].filter(Boolean).join(", ");
  };
}
