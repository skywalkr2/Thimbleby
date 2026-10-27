// "Who they are" (design 6.32, designer's answer F45): every relation a person has to the person, Personal first, comma
// separated ("sister, supplier at Hale Upholstery"). The personal relation is how they relate to the person; a part on a side of
// work is their role there, said with the side's name. Organization and role stay in the person's details.
import type { S } from "./api";

type T = (key: string, vars?: Record<string, string | number>) => string;

export function whoTheyAre(p: S["PersonView"], personal: string | null, sides: S["SideView"][], t: T): string {
  const held = p.sides ?? [];
  const onPersonal = (personal !== null && held.includes(personal)) || p.side === "personal" || p.side === "both";
  const named = sides.filter((s) => held.includes(s.project) || (held.length === 0 && (p.side === "business" || p.side === "both") && sides.length === 1));
  const parts: string[] = [];
  // How they relate to the person comes first; with no side known it is shown whenever it is set.
  if (p.relation && (onPersonal || held.length === 0 || named.length === 0)) parts.push(p.relation);
  for (const side of named) parts.push(p.role ? t("people.who.role_at", { role: p.role, side: side.name }) : side.name);
  // Nothing says which side: their part, when there is one, is all there is to say.
  if (parts.length === 0 && p.role) parts.push(p.role);
  return parts.join(", ");
}
