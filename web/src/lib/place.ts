// Where an item is, in words (design 6.32): its project (with the project it is part of). An item with no project has no words
// here, so a row shows a project chip only when it has a project; the side it is filed on is the row's side mark, never a chip
// that says "not in a project". A side is never worded as a project.
import { useWords } from "./wording";

export interface Place {
  name?: string | null;
  parent?: string | null;
  /** The side the item is filed on directly. */
  side?: string | null;
}

export function usePlaceText(): (place: Place) => string {
  const { t } = useWords();
  return (place) => (place.name ? (place.parent ? t("open.project_in", { parent: place.parent, project: place.name }) : place.name) : "");
}
