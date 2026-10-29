// A drawer from the right, 480px wide and as tall as its content (design 7.12, 7.13): for forms and hand-in, so the list stays visible. It has a sticky footer for
// its actions, closes with Esc, and when it holds unsaved text (`dirty`) Esc or a click outside asks first instead of
// losing it. Focus returns to what opened it when it closes.
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Dialog, Heading } from "react-aria-components";
import { useCursorRef } from "../lib/cursor";
import { useWords } from "../lib/wording";
import { restoreFocus } from "../components/ModalPanel";
import { Button } from "./Button";
import { IconButton } from "./IconButton";
import { Overlay } from "./Overlay";
import styles from "./Drawer.module.css";

export function Drawer(props: {
  open: boolean;
  title: string;
  /** Makes the title a link, to the thing the drawer is about. */
  titleHref?: string;
  onClose: () => void;
  /** Unsaved text: closing then asks "keep editing or discard". */
  dirty?: boolean;
  /** The actions, pinned to the bottom. */
  footer?: ReactNode;
  /** About 640px instead of 480px. */
  wide?: boolean;
  children: ReactNode;
}) {
  const { t } = useWords();
  const [guarding, setGuarding] = useState(false);
  // Each drawer has its own heading id, so one opened over another is named by its own title.
  const titleId = useId();
  // The cursor starts in the drawer's first field, or on its heading when it has none (design 7.0).
  const cursor = useCursorRef(titleId);
  // Remember what opened the drawer and give it focus back once the drawer has gone. If the opener was re-rendered in the
  // meantime (a new element), the control with the same name takes focus instead.
  // It is read while rendering, before any field inside takes focus.
  const openerRef = useRef<HTMLElement | null>(null);
  if (props.open && !openerRef.current && typeof document !== "undefined" && document.activeElement instanceof HTMLElement) {
    openerRef.current = document.activeElement;
  }
  useEffect(() => {
    if (!props.open) return;
    const opener = openerRef.current;
    const name = opener?.getAttribute("aria-label") || opener?.textContent?.trim() || "";
    return () => {
      openerRef.current = null;
      if (!opener || opener === document.body) return;
      restoreFocus(() => {
        if (opener.isConnected) return opener;
        const same = Array.from(document.querySelectorAll<HTMLElement>("button, a, [role=button]")).filter(
          (el) => name && (el.getAttribute("aria-label") || el.textContent?.trim()) === name,
        );
        return same[0] ?? null;
      });
    };
  }, [props.open]);
  const close = () => {
    setGuarding(false);
    props.onClose();
  };
  const attempt = () => {
    if (props.dirty) setGuarding(true);
    else close();
  };
  return (
    <Overlay
      kind="drawer"
      open={props.open}
      onOpenChange={(open) => {
        if (!open) attempt();
      }}
      dismissable
      wide={props.wide}
    >
        <Dialog ref={cursor} className={styles.dialog} aria-labelledby={titleId}>
          <div className={styles.head}>
            <Heading slot="title" id={titleId} className={styles.title}>
              {props.titleHref ? <a href={props.titleHref}>{props.title}</a> : props.title}
            </Heading>
            <IconButton icon="close" label={t("action.close")} onPress={attempt} />
          </div>
          <div className={styles.body}>{props.children}</div>
          {(props.footer || guarding) && (
            <div className={styles.footer}>
              {guarding ? (
                <>
                  <p className={styles.guard} role="alert">
                    {t("drawer.discard_ask")}
                  </p>
                  <Button onClick={() => setGuarding(false)} autoFocus>
                    {t("drawer.keep_editing")}
                  </Button>
                  <Button variant="danger" onClick={close}>
                    {t("drawer.discard")}
                  </Button>
                </>
              ) : (
                props.footer
              )}
            </div>
          )}
        </Dialog>
    </Overlay>
  );
}
