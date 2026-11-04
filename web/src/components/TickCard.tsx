// A choice that can be ticked alongside others, drawn as a card (design 7.12, VC11): the same card as a RadioCard, with a check in
// its corner when ticked because several can be on at once. It is a real checkbox inside, hidden but focusable; the card is its label.
import type { ComponentPropsWithRef, ReactNode } from "react";
import { Icon } from "../ui/Icon";
import styles from "./TickCard.module.css";

export function TickCard(props: Omit<ComponentPropsWithRef<"input">, "type" | "onChange" | "children"> & { children: ReactNode; onChange: (on: boolean) => void }) {
  const { children, onChange, className, ...rest } = props;
  return (
    <label className={[styles.card, className ?? ""].filter(Boolean).join(" ")} data-tick-card="" data-chosen={rest.checked ? "" : undefined} data-disabled={rest.disabled ? "" : undefined}>
      <input {...rest} type="checkbox" className={styles.input} onChange={(e) => onChange(e.target.checked)} />
      <span className={styles.box} aria-hidden="true">
        {rest.checked && <Icon name="check" size={14} />}
      </span>
      <span className={styles.title}>{children}</span>
    </label>
  );
}
