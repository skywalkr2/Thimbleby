// A filter chip (design 7.12): "Who: Everyone ▾". The name of the filter, then the choice, in one outlined control that opens
// the list of choices. It is a native list, so the keyboard, the screen reader and a phone's picker all work as they should.
import { useId } from "react";
import styles from "./FilterChip.module.css";

export function FilterChip(props: { label: string; value: string; onChange: (value: string) => void; options: ReadonlyArray<readonly [value: string, label: string]>; className?: string }) {
  const id = useId();
  return (
    <label className={[styles.chip, props.className ?? ""].filter(Boolean).join(" ")} htmlFor={id}>
      <span className={styles.name}>{props.label}</span>
      <select id={id} className={styles.select} value={props.value} onChange={(e) => props.onChange(e.target.value)}>
        {props.options.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}
