// What colors the side and calendar marks of a row (design 7.7): a side's slot is its place in the person's list (Personal
// first, then each side in their order), and a calendar's color is the one its source shows on the schedule. Both are read from
// what the screens already load, so a row never asks for a color of its own.
import { useQuery } from "@tanstack/react-query";
import { api } from "./api";
import { sideSlot, type CalendarColor } from "../ui/MarkDot";
import { useSideFilter } from "./sides";

/** The slot (1 to 5) of a side by its id, or null for a row that is on no side, or when the person has only Personal. */
export function useSideSlot(): (side: string | null | undefined) => number | null {
  const filter = useSideFilter();
  const order = filter.options.map((o) => o.id);
  return (side) => {
    if (!side || !filter.offered) return null;
    const at = order.indexOf(side);
    return at < 0 ? null : sideSlot(at);
  };
}

/** The color of a calendar by its id or its name (the source's label), or null when no calendar of that name is read. */
export function useCalendarColor(): (name: string | null | undefined) => CalendarColor | null {
  const watch = useQuery({ queryKey: ["watch"], queryFn: api.watchSources });
  const sources = watch.data ?? [];
  return (name) => {
    if (!name) return null;
    const found = sources.find((s) => s.id === name || s.label === name);
    return found ? (found.shown_color ?? found.color ?? null) : null;
  };
}
