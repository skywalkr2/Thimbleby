// Reacting to the window's width. The phone layout follows the workspace's setting (`narrow_below_px`, and the page's
// `data-narrow` attribute the styles key off); other widths use media queries directly.
import { useEffect, useLayoutEffect, useState, type RefObject } from "react";

function matches(query: string): boolean {
  return typeof window.matchMedia === "function" && window.matchMedia(query).matches;
}

/** Whether a media query matches now, kept up to date. */
export function useMediaQuery(query: string): boolean {
  const [on, setOn] = useState(() => matches(query));
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const list = window.matchMedia(query);
    const apply = () => setOn(list.matches);
    apply();
    list.addEventListener("change", apply);
    return () => list.removeEventListener("change", apply);
  }, [query]);
  return on;
}

/** Whether the page is in the phone layout now (`data-narrow`, set by `useNarrow`), kept up to date, for a screen deep in the
 * tree that has no need of the width itself. */
export function useIsNarrow(): boolean {
  const read = () => document.documentElement.hasAttribute("data-narrow");
  const [narrow, setNarrow] = useState(read);
  useEffect(() => {
    setNarrow(read());
    const watch = new MutationObserver(() => setNarrow(read()));
    watch.observe(document.documentElement, { attributes: true, attributeFilter: ["data-narrow"] });
    return () => watch.disconnect();
  }, []);
  return narrow;
}

/** True below the configured width: the sidebar gives way to the bottom bar. Sets `data-narrow` on the page. */
export function useNarrow(px: number): boolean {
  const narrow = useMediaQuery(`(max-width: ${px - 1}px)`);
  useEffect(() => {
    document.documentElement.toggleAttribute("data-narrow", narrow);
  }, [narrow]);
  return narrow;
}

/** The width of an element, kept up to date, for a screen whose layout depends on the room it has rather than the window's
 * (the calendar, with its sidebar and pane). Null while the width isn't known: nothing measured yet, or no layout at all. */
export function useWidth(ref: RefObject<HTMLElement | null>): number | null {
  const [width, setWidth] = useState<number | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const read = () => setWidth(el.clientWidth > 0 ? el.clientWidth : null);
    read();
    if (typeof ResizeObserver !== "function") return;
    const watch = new ResizeObserver(read);
    watch.observe(el);
    return () => watch.disconnect();
  }, [ref]);
  return width;
}
