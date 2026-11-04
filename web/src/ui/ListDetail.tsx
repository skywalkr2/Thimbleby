// A list and the detail of the row chosen (design 7.13): from 1024px the detail is a pane beside the list, which keeps its
// place; below that it opens as a drawer. `detail` is null while no row is chosen. When the list would be left narrower than
// `fit` pixels beside the pane (the width its priority columns need), the pane overlays the list instead of squeezing it. With
// `anchorTo` (a selector for the thing the detail describes) the pane starts level with that thing and carries a pointer to it.
import { useCallback, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useMediaQuery } from "../lib/media";
import { useWords } from "../lib/wording";
import { Drawer } from "./Drawer";
import { IconButton } from "./IconButton";
import { PaneContext } from "./paneContext";
import styles from "./ListDetail.module.css";

/** The gap between the list and the pane, as the layout sets it (--gutter, 24px from 1024px). */
const GAP = 24;

/** `titleHref` makes the detail's title a link to the thing the detail is about (a message's saved page); without one the
 * title is plain text and nothing about it looks clickable. */
export function ListDetail(props: { children: ReactNode; detail: ReactNode | null; title: string; titleHref?: string; onClose: () => void; fit?: number; anchorTo?: string }) {
  const { t } = useWords();
  const beside = useMediaQuery("(min-width: 1024px)");
  const open = props.detail !== null;
  const fit = props.fit ?? 640;
  const split = useRef<HTMLDivElement>(null);
  const [pane, setPane] = useState<HTMLElement | null>(null);
  const [overlay, setOverlay] = useState(false);
  const [anchorTop, setAnchorTop] = useState<number | null>(null);

  // Whether the list, beside the pane, would keep the width it needs. A size not yet known (nothing measured) counts as fitting.
  const measure = useCallback(() => {
    const whole = split.current?.clientWidth ?? 0;
    const paneWidth = pane?.offsetWidth ?? 0;
    setOverlay(whole > 0 && paneWidth > 0 && whole - paneWidth - GAP < fit);
  }, [pane, fit]);
  useLayoutEffect(() => {
    measure();
    const el = split.current;
    const watch = typeof ResizeObserver === "function" && el ? new ResizeObserver(measure) : null;
    if (el && watch) watch.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      watch?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [measure]);

  // The pane starts level with the thing it describes, as far down as the list reaches.
  useLayoutEffect(() => {
    const target = props.anchorTo && pane && split.current ? document.querySelector(props.anchorTo) : null;
    if (!target || !split.current || !pane) {
      setAnchorTop(null);
      return;
    }
    const whole = split.current.getBoundingClientRect();
    const top = target.getBoundingClientRect().top - whole.top;
    setAnchorTop(Math.round(Math.max(0, Math.min(top, whole.height - pane.offsetHeight))));
  }, [props.anchorTo, pane, props.detail]);

  const sideBySide = open && beside;
  const mode = !sideBySide ? undefined : overlay ? "overlay" : "beside";
  const state = useMemo(() => ({ squeezed: mode === "beside" }), [mode]);
  return (
    <PaneContext.Provider value={state}>
      <div ref={split} data-split="" data-pane={mode} className={[styles.split, mode === "beside" ? styles.open : "", mode === "overlay" ? styles.overlay : ""].filter(Boolean).join(" ")}>
        <div className={styles.main} data-region="">
          {props.children}
        </div>
        {open &&
          (beside ? (
            <aside
              ref={setPane}
              className={styles.pane}
              aria-label={props.title}
              data-detail-pane=""
              data-anchored={anchorTop !== null ? "" : undefined}
              style={anchorTop !== null ? ({ ["--anchor-top" as string]: `${anchorTop}px` } as CSSProperties) : undefined}
              data-region=""
              onKeyDown={(event) => {
                if (event.key === "Escape" && !event.defaultPrevented) {
                  event.stopPropagation();
                  props.onClose();
                }
              }}
            >
              <div className={styles.head}>
                <h2 className={styles.title}>{props.titleHref ? <a href={props.titleHref}>{props.title}</a> : props.title}</h2>
                <IconButton icon="close" label={t("action.close")} onPress={props.onClose} />
              </div>
              <div className={styles.body}>{props.detail}</div>
            </aside>
          ) : (
            <Drawer open title={props.title} titleHref={props.titleHref} onClose={props.onClose}>
              <div className={styles.body}>{props.detail}</div>
            </Drawer>
          ))}
      </div>
    </PaneContext.Provider>
  );
}
