// "For <side> <side> Change" under one account (design 6.32, 7.9): the sides the account is for as chips, and Change to pick them
// again. The picking itself is the editor the caller gives, shown while Change is open, and open to begin with when no side has
// been said yet. Connections draws the same line on its cards; this one is for the places that have no card (setup's mail step).
import { useId, useRef, useState, type ReactNode } from "react";
import type { S } from "../lib/api";
import { useSideSlot } from "../lib/marks";
import { useSideFilter } from "../lib/sides";
import { useWords } from "../lib/wording";
import { Button } from "../ui/Button";
import { MarkDot } from "../ui/MarkDot";
import { restoreFocus } from "./ModalPanel";
import styles from "./SetupAccountRow.module.css";

export function AccountSidesLine(props: { sources: S["WatchSourceView"][]; account: string; editor: ReactNode }) {
  const { t } = useWords();
  const filter = useSideFilter();
  const slotOf = useSideSlot();
  const said = [...new Set(props.sources.flatMap((s) => s.sides ?? []))];
  const chips = said.flatMap((id) => {
    const option = filter.options.find((o) => o.id === id);
    return option ? [{ id, name: option.name, slot: slotOf(id) }] : [];
  });
  const [editing, setEditing] = useState(said.length === 0);
  const editorId = useId();
  const changeRef = useRef<HTMLButtonElement>(null);
  return (
    <>
      <div className={styles.sides} data-account-sides="">
        <span>{t("connection.for")}</span>
        {chips.length === 0 && <span>{t("connection.for_none")}</span>}
        {chips.map((chip) => (
          <span key={chip.id} className={styles.chip} data-side-chip="" title={chip.name}>
            {chip.slot !== null && <MarkDot kind="side" slot={chip.slot} />}
            <span className={styles.chipName}>{chip.name}</span>
          </span>
        ))}
        <Button
          ref={changeRef}
          variant="quiet"
          size="sm"
          aria-expanded={editing}
          aria-controls={editing ? editorId : undefined}
          aria-label={t("connection.change_named", { account: props.account })}
          onClick={() => setEditing((on) => !on)}
        >
          {t("connection.change")}
        </Button>
      </div>
      {editing && (
        <div className={styles.editor} id={editorId} data-account-sides-editor="">
          {props.editor}
          {chips.length > 0 && (
            <Button
              variant="quiet"
              size="sm"
              onClick={() => {
                setEditing(false);
                restoreFocus(() => changeRef.current);
              }}
            >
              {t("connection.sides_done")}
            </Button>
          )}
        </div>
      )}
    </>
  );
}
