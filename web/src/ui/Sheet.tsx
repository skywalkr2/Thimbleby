// A sheet from the bottom edge with a title and a Close button (design 7.1): the phone's menus. The bottom bar's More sheet and
// the side filter's sheet are this one frame, so every sheet opens, closes and takes the cursor the same way.
import type { ReactNode } from "react";
import { Dialog, Heading } from "react-aria-components";
import { useWords } from "../lib/wording";
import { IconButton } from "./IconButton";
import { BottomSheet } from "./Overlay";
import styles from "./Sheet.module.css";

export function Sheet(props: { title: string; onClose: () => void; children: ReactNode; className?: string }) {
  const { t } = useWords();
  return (
    <BottomSheet onClose={props.onClose}>
      <Dialog className={[styles.dialog, props.className ?? ""].filter(Boolean).join(" ")} aria-labelledby="sheet-title">
        <div className={styles.head}>
          <Heading slot="title" id="sheet-title" className={styles.title}>
            {props.title}
          </Heading>
          <IconButton icon="close" label={t("action.close")} onPress={props.onClose} />
        </div>
        {props.children}
      </Dialog>
    </BottomSheet>
  );
}
